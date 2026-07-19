import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUnlockedApiKey } from './key-session';
import { DEFAULT_SECURITY, DEFAULT_SETTINGS, type ExtensionSettings } from './storage';

const getValue = vi.fn();
const setValue = vi.fn();

vi.mock('wxt/storage', () => ({
  storage: {
    defineItem: () => ({
      getValue: (...args: unknown[]) => getValue(...args),
      setValue: (...args: unknown[]) => setValue(...args),
    }),
  },
}));

describe('resolveAiConfigForRequest', () => {
  beforeEach(() => {
    clearUnlockedApiKey();
    getValue.mockReset();
    setValue.mockReset();
  });

  afterEach(() => {
    clearUnlockedApiKey();
    vi.resetModules();
  });

  it('TC-SEC-U02: hardened vault without unlock → locked', async () => {
    const stored: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      aiConfig: { ...DEFAULT_SETTINGS.aiConfig, apiKey: '' },
      security: {
        ...DEFAULT_SECURITY,
        hardeningEnabled: true,
        saltB64: 's',
        ivB64: 'i',
        cipherB64: 'c',
      },
    };
    getValue.mockResolvedValue(stored);
    const { resolveAiConfigForRequest } = await import('./settings-store');
    const resolved = await resolveAiConfigForRequest();
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe('locked');
  });

  it('TC-F3-I02: missing key → missing_key', async () => {
    getValue.mockResolvedValue({ ...DEFAULT_SETTINGS });
    const { resolveAiConfigForRequest } = await import('./settings-store');
    const resolved = await resolveAiConfigForRequest();
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe('missing_key');
  });
});

describe('isExtensionPageSender', () => {
  it('TC-SEC-U03: wrong sender.id denied', async () => {
    // browser global stub for messages module
    vi.stubGlobal('browser', {
      runtime: {
        id: 'ext-id',
        getURL: (p: string) => `chrome-extension://ext-id${p}`,
      },
    });
    const { isExtensionPageSender } = await import('./messages');
    expect(isExtensionPageSender({ id: 'other', tab: null })).toBe(false);
    expect(isExtensionPageSender({ id: 'ext-id', tab: null })).toBe(true);
    // Host-page content script style sender (has tab, not extension URL)
    expect(isExtensionPageSender({ id: 'ext-id', tab: { id: 1 } })).toBe(false);
    vi.unstubAllGlobals();
  });
});
