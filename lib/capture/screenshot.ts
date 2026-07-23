/**
 * Capture the visible tab as a JPEG data URL (Playwright-like page photo).
 * Never writes to disk — in-memory only. Callers must releaseScreenshot()
 * after Analyze finishes so large base64 payloads can be GC'd promptly.
 */

/** Mutable holder so callers can null the payload without losing the binding. */
export type ScreenshotRef = { dataUrl: string | null };

export async function captureVisibleTabJpeg(opts?: {
  windowId?: number;
  quality?: number;
}): Promise<string | null> {
  try {
    const quality = Math.min(100, Math.max(30, opts?.quality ?? 55));
    const dataUrl = await browser.tabs.captureVisibleTab(
      opts?.windowId ?? browser.windows.WINDOW_ID_CURRENT,
      { format: 'jpeg', quality },
    );
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return null;
    }
    // Guard extreme payloads (~1.5MB data URL).
    if (dataUrl.length > 1_800_000) return null;
    return dataUrl;
  } catch {
    return null;
  }
}

/**
 * Drop in-memory screenshot payloads (data URLs / message parts).
 * Safe to call multiple times; does not touch disk (we never persist shots).
 */
export function releaseScreenshot(
  ...refs: Array<ScreenshotRef | null | undefined>
): void {
  for (const ref of refs) {
    if (!ref) continue;
    ref.dataUrl = null;
  }
}

/**
 * Scrub multimodal / text parts so request payload trees do not retain
 * base64 screenshots or large summary strings after Analyze finishes.
 */
export function scrubImageContentParts(parts: unknown): void {
  if (!Array.isArray(parts)) return;
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;
    const p = part as {
      type?: string;
      text?: string;
      image_url?: { url?: string };
    };
    if (p.type === 'image_url' && p.image_url) {
      p.image_url.url = '';
    }
    if (p.type === 'text' && typeof p.text === 'string') {
      p.text = '';
    }
  }
}

export function looksLikeImageApiError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('image') ||
    m.includes('vision') ||
    m.includes('multimodal') ||
    m.includes('does not support') ||
    (m.includes('invalid_request') && m.includes('content')) ||
    (m.includes('unsupported') &&
      (m.includes('image') || m.includes('modal')))
  );
}
