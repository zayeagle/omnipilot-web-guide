import {
  DEFAULT_SCAN_OPTIONS,
  type Candidate,
  type CandidateKind,
  type ScanOptions,
} from './types';

/** Semantic interactive controls (ARIA / native). */
const SEMANTIC_SELECTOR = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="option"]',
  'input[type="range"]',
  '[contenteditable="true"]',
].join(',');

/**
 * Extra hosts for library tabs/buttons that often omit ARIA roles.
 * Kept narrow to avoid collecting whole page containers.
 */
const HEURISTIC_SELECTOR = [
  '[tabindex]:not([tabindex="-1"])',
  '[onclick]',
  '.ant-tabs-tab',
  '.ant-btn',
  '.el-tabs__item',
  '.el-button',
  '.ivu-tabs-tab',
  '.n-button',
  '.MuiTab-root',
  '.MuiButton-root',
].join(',');

/** Host nodes we inject — never scan or treat as page controls. */
const OPG_HOST_IDS = new Set([
  'omnipilot-web-guide-float',
  'omnipilot-web-guide-spotlight',
]);

const CHROME_SEL =
  'nav, aside, header, [role="navigation"], [role="menubar"], [role="banner"], .ant-layout-sider, .ant-menu, .ant-pro-sider';
const MAIN_SEL =
  'main, [role="main"], .ant-layout-content, .ant-pro-page-container, .page-content, #content, .content-wrapper';

function isInsideOpgHost(el: Element): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (cur.id && OPG_HOST_IDS.has(cur.id)) return true;
    cur = cur.parentElement;
  }
  return false;
}

/**
 * Remove attributes left by older builds. Read-only scanning must not leave
 * marks on the host DOM.
 */
export function clearLegacyOpgMarks(doc: Document = document): void {
  for (const el of Array.from(doc.querySelectorAll('[data-opg-uid]'))) {
    el.removeAttribute('data-opg-uid');
  }
}

function isVisible(el: Element): boolean {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (!style) return true;
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const opacity = style.opacity === '' ? 1 : Number(style.opacity);
  if (!Number.isNaN(opacity) && opacity === 0) return false;
  return true;
}

function nearbyHeading(el: Element): string {
  let cur: Element | null = el;
  for (let i = 0; i < 8 && cur; i++) {
    const prev = cur.previousElementSibling;
    if (prev && /^H[1-6]$/.test(prev.tagName)) {
      return (prev.textContent || '').trim().slice(0, 80);
    }
    const legend = cur.closest('fieldset')?.querySelector('legend');
    if (legend) return (legend.textContent || '').trim().slice(0, 80);
    cur = cur.parentElement;
  }
  return '';
}

function kindOf(el: Element): CandidateKind {
  const tag = el.tagName.toLowerCase();
  const role = (el.getAttribute('role') || '').toLowerCase();
  const cls =
    typeof (el as HTMLElement).className === 'string'
      ? (el as HTMLElement).className
      : '';
  if (tag === 'a' || role === 'link') return 'link';
  if (tag === 'button' || role === 'button') return 'button';
  if (/\b(ant-btn|el-button|MuiButton|n-button)\b/.test(cls)) return 'button';
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'textarea';
  if (tag === 'input') return 'input';
  if (role === 'menuitem' || role === 'tab') return 'menu';
  if (/\b(ant-tabs-tab|el-tabs__item|ivu-tabs-tab|MuiTab)\b/.test(cls)) {
    return 'menu';
  }
  return 'other';
}

function labelText(el: Element): string {
  const aria = (el.getAttribute('aria-label') || '').trim();
  if (aria) return aria;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const ph = (el.placeholder || '').trim();
    if (ph) return ph;
    const id = el.id;
    if (id) {
      const lab = el.ownerDocument.querySelector(
        `label[for="${CSS.escape(id)}"]`,
      );
      if (lab) return (lab.textContent || '').trim();
    }
  }
  return (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

function inViewport(
  rect: { x: number; y: number; width: number; height: number },
  view: Window,
): boolean {
  const bottom = rect.y + rect.height;
  const right = rect.x + rect.width;
  return (
    bottom > 0 &&
    right > 0 &&
    rect.y < view.innerHeight &&
    rect.x < view.innerWidth
  );
}

function fingerprint(c: Omit<Candidate, 'uid'>): string {
  return [
    c.tag,
    c.kind,
    c.text,
    c.ariaLabel,
    Math.round(c.rect.x),
    Math.round(c.rect.y),
  ].join('|');
}

function inChromeNav(el: Element): boolean {
  return !!el.closest(CHROME_SEL);
}

function inMainContent(el: Element): boolean {
  return !!el.closest(MAIN_SEL);
}

/** Pointer-cursor leaf controls often used as tabs/buttons without ARIA. */
function isPointerLeafClickable(el: HTMLElement, view: Window): boolean {
  const style = view.getComputedStyle(el);
  if (style.cursor !== 'pointer') return false;
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  if (text.length < 1 || text.length > 48) return false;
  // Prefer shallow nodes — skip large layout wrappers.
  if (el.querySelectorAll('div,section,article,ul,table').length > 2) {
    return false;
  }
  const raw = el.getBoundingClientRect();
  if (raw.width <= 0 || raw.height <= 0) return false;
  if (raw.width > 480 || raw.height > 96) return false;
  // Skip if a semantic interactive descendant already covers the control.
  if (el.querySelector(SEMANTIC_SELECTOR)) return false;
  return true;
}

function collectSameOriginIframeDocs(
  doc: Document,
  depth: number,
): Document[] {
  if (depth <= 0) return [];
  const out: Document[] = [];
  for (const frame of Array.from(doc.querySelectorAll('iframe'))) {
    try {
      const idoc = frame.contentDocument;
      if (!idoc?.documentElement) continue;
      out.push(idoc);
      out.push(...collectSameOriginIframeDocs(idoc, depth - 1));
    } catch {
      /* cross-origin — skip */
    }
  }
  return out;
}

type RootLike = Document | ShadowRoot;

function collectFromRoot(
  root: RootLike,
  opts: Required<ScanOptions>,
  into: Set<Element>,
): void {
  for (const el of Array.from(root.querySelectorAll(SEMANTIC_SELECTOR))) {
    into.add(el);
  }
  try {
    for (const el of Array.from(root.querySelectorAll(HEURISTIC_SELECTOR))) {
      into.add(el);
    }
  } catch {
    /* invalid selector in exotic docs */
  }

  const view =
    root instanceof Document
      ? root.defaultView
      : root.host?.ownerDocument?.defaultView;
  if (view) {
    for (const el of Array.from(root.querySelectorAll('div,span,li,p,a'))) {
      if (!(el instanceof HTMLElement)) continue;
      if (into.has(el)) continue;
      if (isPointerLeafClickable(el, view)) into.add(el);
    }
  }

  if (!opts.scanShadow) return;
  for (const el of Array.from(root.querySelectorAll('*'))) {
    const sr = (el as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    if (sr) collectFromRoot(sr, opts, into);
  }
}

function collectAllElements(
  doc: Document,
  opts: Required<ScanOptions>,
): Element[] {
  const set = new Set<Element>();
  collectFromRoot(doc, opts, set);
  if (opts.scanIframes) {
    for (const idoc of collectSameOriginIframeDocs(doc, opts.maxIframeDepth)) {
      collectFromRoot(idoc, opts, set);
    }
  }
  return Array.from(set);
}

/**
 * Scan interactive controls in `doc`.
 * Returns candidates + the matched elements in the same order (for highlighting).
 */
export function scanDocument(
  doc: Document,
  options: ScanOptions = {},
): { candidates: Candidate[]; elements: Element[] } {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const view = doc.defaultView;
  if (!view) return { candidates: [], elements: [] };

  const nodes = collectAllElements(doc, opts);
  const seen = new Set<string>();
  const scored: Array<{
    candidate: Omit<Candidate, 'uid'>;
    el: Element;
    score: number;
  }> = [];

  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue;
    if (isInsideOpgHost(el)) continue;
    if (!isVisible(el)) continue;

    const elView = el.ownerDocument.defaultView || view;
    const raw = el.getBoundingClientRect();
    // happy-dom / no-layout: zero box — use synthetic size so filters still work
    const noLayout = raw.width === 0 && raw.height === 0;
    const w = noLayout ? Math.max(opts.minSize, 16) : raw.width;
    const h = noLayout ? Math.max(opts.minSize, 16) : raw.height;
    if (!noLayout && (w < opts.minSize || h < opts.minSize)) continue;
    const rect = { x: raw.x, y: raw.y, width: w, height: h };

    const inputType =
      el instanceof HTMLInputElement
        ? (el.type || 'text').toLowerCase()
        : undefined;
    const text = labelText(el);
    const ariaLabel = (el.getAttribute('aria-label') || '').trim();
    const placeholder =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? (el.placeholder || '').trim()
        : '';

    // Skip unlabeled heuristic noise (keep semantic inputs even if empty label).
    const kind = kindOf(el);
    const semantic =
      !!el.matches?.(SEMANTIC_SELECTOR) ||
      ['button', 'link', 'input', 'select', 'textarea'].includes(kind);
    if (!semantic && !text && !ariaLabel) continue;

    const base: Omit<Candidate, 'uid'> = {
      tag: el.tagName.toLowerCase(),
      role: (el.getAttribute('role') || '').trim(),
      text,
      ariaLabel,
      placeholder,
      nearbyHeading: nearbyHeading(el),
      kind,
      rect,
      inViewport: inViewport(rect, elView),
      inputType,
    };

    const fp = fingerprint(base);
    if (seen.has(fp)) continue;
    seen.add(fp);

    let score = Math.min(rect.width * rect.height, 80_000);
    if (base.inViewport) score *= 2;
    if (base.kind === 'button' || base.kind === 'link') score *= 1.25;
    if (base.kind === 'menu') score *= 1.35; // tabs / menuitems
    if (!base.text && !base.ariaLabel) score *= 0.5;

    // Prefer main content controls over chrome nav filling the quota.
    if (inMainContent(el)) score *= 1.85;
    else if (inChromeNav(el)) score *= 0.72;

    scored.push({ candidate: base, el, score });
  }

  scored.sort((a, b) => {
    if (opts.preferViewport && a.candidate.inViewport !== b.candidate.inViewport) {
      return a.candidate.inViewport ? -1 : 1;
    }
    return b.score - a.score;
  });

  const sliced = scored.slice(0, opts.maxCandidates);
  const candidates: Candidate[] = [];
  const elements: Element[] = [];
  sliced.forEach((item, i) => {
    const uid = `c${i}`;
    candidates.push({ ...item.candidate, uid });
    elements.push(item.el);
  });

  return { candidates, elements };
}

/** Build a redacted AI-safe summary (no input values). */
export function toAiSummary(
  candidates: Candidate[],
  meta: { title: string; url: string },
): {
  title: string;
  path: string;
  candidates: Array<{
    uid: string;
    kind: string;
    text: string;
    ariaLabel: string;
    nearbyHeading: string;
    inputType?: string;
  }>;
} {
  let path = meta.url;
  try {
    const u = new URL(meta.url);
    path = u.origin + u.pathname;
  } catch {
    /* keep raw */
  }
  return {
    title: meta.title.slice(0, 200),
    path,
    candidates: candidates.map((c) => ({
      uid: c.uid,
      kind: c.kind,
      text: c.text.slice(0, 120),
      ariaLabel: c.ariaLabel.slice(0, 120),
      nearbyHeading: c.nearbyHeading.slice(0, 80),
      ...(c.inputType && c.inputType !== 'password'
        ? { inputType: c.inputType }
        : c.inputType === 'password'
          ? { inputType: 'password' }
          : {}),
    })),
  };
}
