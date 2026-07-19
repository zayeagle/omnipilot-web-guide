import {
  DEFAULT_SCAN_OPTIONS,
  type Candidate,
  type CandidateKind,
  type ScanOptions,
} from './types';

const SELECTOR = [
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
  'input[type="range"]',
  '[contenteditable="true"]',
].join(',');

/** Host nodes we inject — never scan or treat as page controls. */
const OPG_HOST_IDS = new Set([
  'omnipilot-web-guide-float',
  'omnipilot-web-guide-spotlight',
]);

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
  if (tag === 'a' || role === 'link') return 'link';
  if (tag === 'button' || role === 'button') return 'button';
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'textarea';
  if (tag === 'input') return 'input';
  if (role === 'menuitem' || role === 'tab') return 'menu';
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
      const lab = el.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
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
  return [c.tag, c.kind, c.text, c.ariaLabel, Math.round(c.rect.x), Math.round(c.rect.y)].join(
    '|',
  );
}

/**
 * Scan interactive controls in `doc` (top-level document only for MVP).
 * Returns candidates + the matched elements in the same order (for highlighting).
 */
export function scanDocument(
  doc: Document,
  options: ScanOptions = {},
): { candidates: Candidate[]; elements: Element[] } {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const view = doc.defaultView;
  if (!view) return { candidates: [], elements: [] };

  const nodes = Array.from(doc.querySelectorAll(SELECTOR));
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
    const raw = el.getBoundingClientRect();
    // happy-dom / no-layout: zero box — use synthetic size so filters still work
    const noLayout = raw.width === 0 && raw.height === 0;
    const w = noLayout ? Math.max(opts.minSize, 16) : raw.width;
    const h = noLayout ? Math.max(opts.minSize, 16) : raw.height;
    if (!noLayout && (w < opts.minSize || h < opts.minSize)) continue;
    const rect = { x: raw.x, y: raw.y, width: w, height: h };

    const inputType =
      el instanceof HTMLInputElement ? (el.type || 'text').toLowerCase() : undefined;
    // Never read password values into candidate payload
    const text = labelText(el);
    const ariaLabel = (el.getAttribute('aria-label') || '').trim();
    const placeholder =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? (el.placeholder || '').trim()
        : '';

    const base: Omit<Candidate, 'uid'> = {
      tag: el.tagName.toLowerCase(),
      role: (el.getAttribute('role') || '').trim(),
      text,
      ariaLabel,
      placeholder,
      nearbyHeading: nearbyHeading(el),
      kind: kindOf(el),
      rect,
      inViewport: inViewport(rect, view),
      inputType,
    };

    const fp = fingerprint(base);
    if (seen.has(fp)) continue;
    seen.add(fp);

    let score = rect.width * rect.height;
    if (base.inViewport) score *= 2;
    if (base.kind === 'button' || base.kind === 'link') score *= 1.2;
    if (!base.text && !base.ariaLabel) score *= 0.5;

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
  // Keep element refs in memory only — never write attributes onto the host page.
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
