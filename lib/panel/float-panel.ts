import { hideSpotlight } from '../guide';

/**
 * Floating panel shell lives in the page, but the UI runs inside an extension
 * iframe (sidepanel.html?float=1). Host page CSS/JS/DOM attributes are not
 * modified beyond a single fixed overlay node owned by the extension.
 */

const HOST_ID = 'omnipilot-web-guide-float';
const MSG_SOURCE = 'omnipilot-web-guide';

const MIN_W = 320;
const MIN_H = 360;
const DEFAULT_W = 420;
const DEFAULT_H = 640;
const MARGIN = 12;
/** Sit below typical site mastheads so header icons stay visible. */
const TOP = 80;

type Size = { width: number; height: number };

/** In-memory only — never touch page sessionStorage/localStorage. */
let rememberedSize: Size | null = null;
let onMessage: ((ev: MessageEvent) => void) | null = null;
/** Content-script callback — avoid runtime.sendMessage fan-out for tour end. */
let onFloatClosed: (() => void) | null = null;

export function setFloatCloseHandler(handler: (() => void) | null): void {
  onFloatClosed = handler;
}

function defaultSize(): Size {
  return {
    width: Math.min(DEFAULT_W, window.innerWidth - MARGIN * 2),
    height: Math.min(DEFAULT_H, window.innerHeight - MARGIN * 2),
  };
}

function clampSize(s: Size): Size {
  const maxW = Math.max(MIN_W, window.innerWidth - MARGIN * 2);
  const maxH = Math.max(MIN_H, window.innerHeight - MARGIN * 2);
  return {
    width: Math.min(Math.max(MIN_W, Math.round(s.width)), maxW),
    height: Math.min(Math.max(MIN_H, Math.round(s.height)), maxH),
  };
}

function loadSize(): Size {
  return rememberedSize ? clampSize(rememberedSize) : defaultSize();
}

function saveSize(s: Size) {
  rememberedSize = clampSize(s);
}

function topRightPos(size: Size): { left: number; top: number } {
  return {
    left: Math.max(MARGIN, window.innerWidth - size.width - MARGIN),
    top: TOP,
  };
}

function bindCornerResize(host: HTMLElement): void {
  const grip = document.createElement('div');
  grip.setAttribute('data-opg', 'resize');
  grip.title = '拖动以调整窗口大小';
  Object.assign(grip.style, {
    position: 'absolute',
    right: '0',
    bottom: '0',
    width: '28px',
    height: '28px',
    zIndex: '2',
    cursor: 'nwse-resize',
    touchAction: 'none',
    background: 'transparent',
  } as Partial<CSSStyleDeclaration>);
  const mark = document.createElement('div');
  Object.assign(mark.style, {
    position: 'absolute',
    right: '4px',
    bottom: '4px',
    width: '10px',
    height: '10px',
    borderRight: '2px solid rgba(27,67,50,0.55)',
    borderBottom: '2px solid rgba(27,67,50,0.55)',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>);
  grip.appendChild(mark);
  host.appendChild(grip);

  let resizing = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;
  let startLeft = 0;
  let startTop = 0;

  const onMove = (e: PointerEvent) => {
    if (!resizing) return;
    const next = clampSize({
      width: startW + (e.clientX - startX),
      height: startH + (e.clientY - startY),
    });
    host.style.width = `${next.width}px`;
    host.style.height = `${next.height}px`;
    host.style.left = `${startLeft}px`;
    host.style.top = `${startTop}px`;
  };

  const endResize = (e: PointerEvent) => {
    if (!resizing) return;
    resizing = false;
    try {
      grip.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    grip.removeEventListener('pointermove', onMove);
    grip.removeEventListener('pointerup', endResize);
    grip.removeEventListener('pointercancel', endResize);
    const r = host.getBoundingClientRect();
    saveSize({ width: r.width, height: r.height });
  };

  grip.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    resizing = true;
    startX = ev.clientX;
    startY = ev.clientY;
    const rect = host.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    startLeft = rect.left;
    startTop = rect.top;
    try {
      grip.setPointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', endResize);
    grip.addEventListener('pointercancel', endResize);
  });
}

function placeHost(host: HTMLElement, left: number, top: number): void {
  const w = host.offsetWidth;
  const h = host.offsetHeight;
  const nextLeft = Math.min(
    Math.max(MARGIN, left),
    Math.max(MARGIN, window.innerWidth - w - MARGIN),
  );
  const nextTop = Math.min(
    Math.max(MARGIN, top),
    Math.max(MARGIN, window.innerHeight - h - MARGIN),
  );
  host.style.left = `${nextLeft}px`;
  host.style.top = `${nextTop}px`;
}

function bindIframeBridge(host: HTMLElement, iframe: HTMLIFrameElement): void {
  let dragging = false;
  let startLeft = 0;
  let startTop = 0;
  let startScreenX = 0;
  let startScreenY = 0;
  let raf = 0;
  let pendingLeft = 0;
  let pendingTop = 0;

  const flushPlace = () => {
    raf = 0;
    if (!dragging) return;
    placeHost(host, pendingLeft, pendingTop);
  };

  onMessage = (ev: MessageEvent) => {
    const data = ev.data;
    if (!data || data.source !== MSG_SOURCE) return;
    if (ev.source !== iframe.contentWindow) return;

    if (data.type === 'close') {
      closeFloatPanel();
      return;
    }

    if (data.type === 'drag-start') {
      if (typeof data.screenX !== 'number' || typeof data.screenY !== 'number') {
        return;
      }
      const rect = host.getBoundingClientRect();
      dragging = true;
      // Anchor to screen coords so async postMessage cannot compound with
      // the host's moving getBoundingClientRect() (that caused jitter).
      startLeft = rect.left;
      startTop = rect.top;
      startScreenX = data.screenX;
      startScreenY = data.screenY;
      return;
    }

    if (data.type === 'drag-move') {
      if (!dragging) return;
      if (typeof data.screenX !== 'number' || typeof data.screenY !== 'number') {
        return;
      }
      pendingLeft = startLeft + (data.screenX - startScreenX);
      pendingTop = startTop + (data.screenY - startScreenY);
      if (!raf) raf = requestAnimationFrame(flushPlace);
      return;
    }

    if (data.type === 'drag-end') {
      dragging = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        placeHost(host, pendingLeft, pendingTop);
      }
    }
  };

  window.addEventListener('message', onMessage);
}

export function isFloatPanelOpen(): boolean {
  return !!document.getElementById(HOST_ID);
}

export function closeFloatPanel(): void {
  if (onMessage) {
    window.removeEventListener('message', onMessage);
    onMessage = null;
  }
  hideSpotlight();
  document.getElementById(HOST_ID)?.remove();
  try {
    onFloatClosed?.();
  } catch {
    /* ignore */
  }
}

function clearLegacyPageStorage(): void {
  // Older builds wrote layout keys into the page's sessionStorage — remove them.
  try {
    sessionStorage.removeItem('opg-float-size-v3');
    sessionStorage.removeItem('opg-float-size');
    sessionStorage.removeItem('opg-float-pos');
  } catch {
    /* ignore */
  }
}

export function openFloatPanel(): void {
  if (isFloatPanelOpen()) return;

  clearLegacyPageStorage();
  hideSpotlight();

  const size = loadSize();
  const pos = topRightPos(size);

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-opg-root', 'float');
  // Isolate from host CSS cascading into our chrome; do not inject <style>.
  host.style.cssText = [
    'all:initial',
    'position:fixed',
    'z-index:2147483646',
    `left:${pos.left}px`,
    `top:${pos.top}px`,
    `width:${size.width}px`,
    `height:${size.height}px`,
    'margin:0',
    'padding:0',
    'border:0',
    'border-radius:16px',
    'overflow:hidden',
    'box-shadow:0 18px 50px rgba(20,35,26,0.18)',
    'background:transparent',
    'display:block',
    'box-sizing:border-box',
    'pointer-events:auto',
    'contain:layout style size',
  ].join(';');

  const iframe = document.createElement('iframe');
  iframe.title = 'OmniPilot';
  iframe.allow = 'clipboard-read; clipboard-write';
  iframe.src = browser.runtime.getURL('/sidepanel.html?float=1');
  iframe.style.cssText = [
    'all:initial',
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'border:0',
    'margin:0',
    'padding:0',
    'border-radius:16px',
    'background:#f3f1ec',
    'display:block',
    'pointer-events:auto',
  ].join(';');

  host.appendChild(iframe);
  (document.body || document.documentElement).appendChild(host);

  bindCornerResize(host);
  bindIframeBridge(host, iframe);
}

export function toggleFloatPanel(): boolean {
  if (isFloatPanelOpen()) {
    closeFloatPanel();
    return false;
  }
  openFloatPanel();
  return true;
}
