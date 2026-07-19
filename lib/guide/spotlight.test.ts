import { describe, expect, it, afterEach } from 'vitest';
import { hideSpotlight, showSpotlight } from './spotlight';

describe('spotlight', () => {
  afterEach(() => hideSpotlight());

  it('TC-F4-I01: show creates host with shadow card', () => {
    showSpotlight({
      rect: { x: 10, y: 20, width: 80, height: 30 },
      title: 'Save',
      body: 'Click Save',
      stepLabel: '1 / 2',
    });
    const host = document.getElementById('omnipilot-web-guide-spotlight');
    expect(host).toBeTruthy();
    expect(host?.shadowRoot?.querySelector('h2')?.textContent).toBe('Save');
    hideSpotlight();
    expect(document.getElementById('omnipilot-web-guide-spotlight')).toBeNull();
  });

  it('spotlight close button dismisses overlay', () => {
    showSpotlight({
      rect: { x: 10, y: 20, width: 80, height: 30 },
      title: 'Save',
      body: 'Click Save',
      stepLabel: '1 / 2',
      labels: { close: 'Close', next: 'Next', end: 'End' },
    });
    const host = document.getElementById('omnipilot-web-guide-spotlight');
    const btn = host?.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-act="close"]',
    );
    expect(btn).toBeTruthy();
    btn?.click();
    expect(document.getElementById('omnipilot-web-guide-spotlight')).toBeNull();
  });
});

