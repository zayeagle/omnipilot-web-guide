import { bindHostEventIsolation } from '../panel/isolate-events';

const HOST_ID = 'omnipilot-web-guide-spotlight';

let disposeIsolation: (() => void) | null = null;

export type SpotlightTarget = {
  rect: { x: number; y: number; width: number; height: number };
  title: string;
  body: string;
  stepLabel: string;
  showNext?: boolean;
  labels?: {
    close: string;
    next: string;
    end: string;
  };
};

export type SpotlightHandlers = {
  onClose?: () => void;
  onNext?: () => void;
  onEnd?: () => void;
};

function ensureHost(): { host: HTMLElement; root: ShadowRoot } {
  let host = document.getElementById(HOST_ID) as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('data-opg-root', 'spotlight');
    host.style.cssText =
      'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483646;';
    document.documentElement.appendChild(host);
  }
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  if (!disposeIsolation) {
    disposeIsolation = bindHostEventIsolation(host);
  }
  return { host, root };
}

export function hideSpotlight(): void {
  disposeIsolation?.();
  disposeIsolation = null;
  document.getElementById(HOST_ID)?.remove();
}

export function showSpotlight(
  target: SpotlightTarget,
  handlers: SpotlightHandlers = {},
): void {
  const { root } = ensureHost();
  const pad = 8;
  const r = {
    x: Math.max(0, target.rect.x - pad),
    y: Math.max(0, target.rect.y - pad),
    width: target.rect.width + pad * 2,
    height: target.rect.height + pad * 2,
  };
  const labels = {
    close: target.labels?.close || 'Close',
    next: target.labels?.next || 'Next',
    end: target.labels?.end || 'End',
  };

  root.innerHTML = `
    <style>
      :host { all: initial; }
      .hole {
        position: fixed;
        z-index: 2147483646;
        border: 3px solid #2d6a4f;
        border-radius: 10px;
        box-shadow: 0 0 0 9999px rgba(20, 35, 26, 0.5);
        pointer-events: none;
        transition: top .15s, left .15s, width .15s, height .15s;
      }
      .card {
        position: fixed;
        z-index: 2147483647;
        width: min(360px, calc(100vw - 28px));
        background: #fff;
        color: #12141a;
        border-radius: 14px;
        padding: 14px 16px 12px;
        box-shadow: 0 16px 48px rgba(0,0,0,.28);
        font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 16px;
        line-height: 1.5;
        pointer-events: auto;
      }
      .card-head {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 6px;
      }
      .card-head .meta {
        flex: 1;
        margin: 0;
        font-size: 13px;
        color: #1b4332;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .card-close {
        border: 0;
        background: #f1f2f4;
        color: #12141a;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        flex: 0 0 auto;
      }
      .card-close:hover { background: #e5e7eb; }
      .card h2 {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 750;
        line-height: 1.3;
      }
      .card .body {
        margin: 0 0 12px;
        color: #2a2f3a;
        font-size: 16px;
      }
      .card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .card-actions button {
        border: 0;
        border-radius: 10px;
        padding: 9px 14px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }
      .card-actions .primary {
        background: #12141a;
        color: #fff;
      }
      .card-actions .ghost {
        background: #f1f2f4;
        color: #12141a;
      }
    </style>
    <div class="hole" style="left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px"></div>
    <div class="card" id="card">
      <div class="card-head">
        <p class="meta"></p>
        <button type="button" class="card-close" data-act="close" title="${labels.close}" aria-label="${labels.close}">✕</button>
      </div>
      <h2></h2>
      <p class="body"></p>
      <div class="card-actions">
        ${
          target.showNext
            ? `<button type="button" class="primary" data-act="next">${labels.next}</button>`
            : ''
        }
        <button type="button" class="ghost" data-act="end">${labels.end}</button>
      </div>
    </div>
  `;

  const card = root.getElementById('card')!;
  card.querySelector('.meta')!.textContent = target.stepLabel;
  card.querySelector('h2')!.textContent = target.title;
  card.querySelector('.body')!.textContent = target.body;

  const finish = () => {
    hideSpotlight();
    handlers.onEnd?.();
    handlers.onClose?.();
  };

  card.querySelector('[data-act="close"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    finish();
  });
  card.querySelector('[data-act="end"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    finish();
  });
  card.querySelector('[data-act="next"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onNext?.();
  });

  const cardH = 200;
  const cardTop = Math.min(
    r.y + r.height + 14,
    Math.max(12, (globalThis.innerHeight || 600) - cardH),
  );
  const cardLeft = Math.min(
    r.x,
    Math.max(12, (globalThis.innerWidth || 800) - 380),
  );
  (card as HTMLElement).style.top = `${cardTop}px`;
  (card as HTMLElement).style.left = `${cardLeft}px`;
}

export function resolveElementRect(el: Element): SpotlightTarget['rect'] {
  const rect = el.getBoundingClientRect();
  const w = rect.width || 40;
  const h = rect.height || 24;
  return { x: rect.x, y: rect.y, width: w, height: h };
}
