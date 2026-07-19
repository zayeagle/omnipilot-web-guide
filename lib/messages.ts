/** Extension message protocol (content / sidepanel / options ↔ background). */

import type { ChatTurn } from './ai/chat';
import type { UiLocale } from './i18n/locale';

export type AnalyzePageRequest = {
  type: 'analyze.page';
  locale?: UiLocale | string;
};
export type AnalyzePageResponse =
  | {
      ok: true;
      pageSummary: string;
      features: Array<{
        uid: string;
        name: string;
        description: string;
        howTo: string[];
        source: 'ai' | 'rules';
      }>;
      degraded?: boolean;
    }
  | { ok: false; error: string };

export type ChatAskRequest = {
  type: 'chat.ask';
  question: string;
  locale?: UiLocale | string;
  history?: ChatTurn[];
  pageSummary?: string;
  features?: Array<{ name: string; description: string; howTo: string[] }>;
};

export type GuideHighlightRequest = {
  type: 'guide.highlight';
  uid: string;
};
export type GuideTourRequest = {
  type: 'guide.tour';
  action: 'start' | 'next' | 'skip' | 'end';
  featureUid?: string;
  features?: Array<{ uid: string; name: string; howTo: string[] }>;
};

export type PanelToggleRequest = { type: 'panel.toggle' };

export type SecurityRequest =
  | { type: 'security.unlock'; passphrase: string }
  | { type: 'security.lock' }
  | { type: 'security.status' };

export type SecurityResponse =
  | {
      ok: true;
      hardeningEnabled?: boolean;
      hasCredential?: boolean;
      unlocked?: boolean;
      autoUnlock?: boolean;
    }
  | { ok: false; error?: string };

export type PageClickRequest = {
  type: 'page.click';
  uid: string;
};

export type PagePlanRequest = {
  type: 'page.plan';
  goal: string;
  locale?: UiLocale | string;
  features?: Array<{
    uid: string;
    name: string;
    description: string;
    howTo: string[];
  }>;
};

/** Execute only via one-time plan token issued by page.plan (steps not client-supplied). */
export type PageExecuteRequest = {
  type: 'page.execute';
  token: string;
};

export type ExtensionRequest =
  | AnalyzePageRequest
  | ChatAskRequest
  | GuideHighlightRequest
  | GuideTourRequest
  | PanelToggleRequest
  | PageClickRequest
  | PagePlanRequest
  | PageExecuteRequest
  | SecurityRequest
  | { type: 'options.open' }
  | { type: 'settings.get' }
  | { type: 'content.scan' };

export function isSecurityRequest(msg: unknown): msg is SecurityRequest {
  if (!msg || typeof msg !== 'object') return false;
  const t = (msg as { type?: string }).type;
  return t === 'security.unlock' || t === 'security.lock' || t === 'security.status';
}

/**
 * True for options/sidepanel (including sidepanel framed into a host page).
 * Floated UI sets sender.tab to the host tab — do not require tab == null.
 */
export function isExtensionPageSender(sender: {
  id?: string;
  tab?: unknown;
  url?: string;
}): boolean {
  if (sender.id !== browser.runtime.id) return false;
  try {
    const root = browser.runtime.getURL('/');
    if (sender.url && sender.url.startsWith(root)) return true;
  } catch {
    /* ignore */
  }
  return sender.tab == null;
}

/**
 * Content scripts must only honor mutation/scan ops from the service worker.
 * UI pages (sidepanel/options) also share runtime.onMessage — reject those so
 * privileged ops cannot fan-out past the background gate.
 */
export function isBackgroundSender(sender: {
  id?: string;
  url?: string;
}): boolean {
  if (sender.id !== browser.runtime.id) return false;
  const url = sender.url || '';
  if (!url) return true;
  if (/\/(sidepanel|options)\.html/i.test(url)) return false;
  return /background/i.test(url);
}

export function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return /^(chrome|chrome-extension|edge|about|devtools|view-source|chrome-error):/i.test(
    url,
  );
}

/** Known-bad schemes only — unknown/undefined URL is NOT restricted (action click often omits url). */
export function isKnownRestrictedUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return isRestrictedUrl(url);
}
