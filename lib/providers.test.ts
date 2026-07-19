import { describe, expect, it } from 'vitest';
import { applyProviderPreset, getProvider } from './providers';

describe('providers', () => {
  it('TC-SEC-U01: deepseek preset sets baseURL', () => {
    const next = applyProviderPreset('deepseek', {
      baseUrl: 'https://api.openai.com/v1',
      chatModel: 'gpt-4o-mini',
    });
    expect(next.baseUrl).toBe('https://api.deepseek.com/v1');
    expect(getProvider('deepseek').chatModels.length).toBeGreaterThan(0);
  });
});
