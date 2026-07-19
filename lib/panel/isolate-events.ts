/**
 * Keep keyboard events inside OmniPilot UI from reaching the host page.
 * Do NOT block pointerup/mouseup — that prevented drag/resize from ending
 * (window listeners never saw the release → “stuck to mouse”).
 */

const KEY_EVENTS = ['keydown', 'keyup', 'keypress'] as const;

function stopBubble(e: Event): void {
  e.stopPropagation();
}

/** Bind to float/spotlight host; dispose when host is removed. */
export function bindHostEventIsolation(host: HTMLElement): () => void {
  for (const type of KEY_EVENTS) {
    host.addEventListener(type, stopBubble, false);
  }
  const root = host.shadowRoot;
  if (root) {
    for (const type of KEY_EVENTS) {
      root.addEventListener(type, stopBubble, false);
    }
  }
  return () => {
    for (const type of KEY_EVENTS) {
      host.removeEventListener(type, stopBubble, false);
    }
    if (root) {
      for (const type of KEY_EVENTS) {
        root.removeEventListener(type, stopBubble, false);
      }
    }
  };
}
