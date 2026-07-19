import { describe, expect, it, vi } from 'vitest';
import {
  isBackgroundSender,
  isExtensionPageSender,
  isKnownRestrictedUrl,
  isRestrictedUrl,
  isSecurityRequest,
} from './messages';

describe('messages', () => {
  it('TC-F1-U03: restricted chrome:// URLs', () => {
    expect(isRestrictedUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedUrl('https://example.com')).toBe(false);
  });

  it('TC-F1-U02: security request type guard', () => {
    expect(isSecurityRequest({ type: 'security.status' })).toBe(true);
    expect(isSecurityRequest({ type: 'analyze.page' })).toBe(false);
  });

  it('TC-F1-U04: empty url treated restricted for analyze gate', () => {
    expect(isRestrictedUrl(undefined)).toBe(true);
  });

  it('action click: unknown url is not treated as restricted', () => {
    expect(isKnownRestrictedUrl(undefined)).toBe(false);
    expect(isKnownRestrictedUrl('chrome://extensions')).toBe(true);
  });

  it('extension page sender allows floated sidepanel (has host tab)', () => {
    vi.stubGlobal('browser', {
      runtime: {
        id: 'ext-id',
        getURL: (p: string) => `chrome-extension://ext-id${p}`,
      },
    });
    expect(
      isExtensionPageSender({
        id: 'ext-id',
        tab: { id: 1 },
        url: 'chrome-extension://ext-id/sidepanel.html?float=1',
      }),
    ).toBe(true);
    expect(
      isExtensionPageSender({
        id: 'ext-id',
        tab: { id: 1 },
        url: 'https://example.com/',
      }),
    ).toBe(false);
    expect(isExtensionPageSender({ id: 'ext-id', tab: null })).toBe(true);
    vi.unstubAllGlobals();
  });

  it('background sender rejects sidepanel fan-out', () => {
    vi.stubGlobal('browser', { runtime: { id: 'ext-id' } });
    expect(isBackgroundSender({ id: 'ext-id' })).toBe(true);
    expect(
      isBackgroundSender({
        id: 'ext-id',
        url: 'chrome-extension://ext-id/background.js',
      }),
    ).toBe(true);
    expect(
      isBackgroundSender({
        id: 'ext-id',
        url: 'chrome-extension://ext-id/sidepanel.html?float=1',
      }),
    ).toBe(false);
    expect(
      isBackgroundSender({
        id: 'ext-id',
        url: 'chrome-extension://ext-id/options.html',
      }),
    ).toBe(false);
    vi.unstubAllGlobals();
  });
});

