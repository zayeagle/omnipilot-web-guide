import { describe, expect, it } from 'vitest';
import { normalizeLocale, guideStrings } from './locale';

describe('locale', () => {
  it('normalizes zh tags', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh');
    expect(normalizeLocale('zh')).toBe('zh');
    expect(normalizeLocale('en-US')).toBe('en');
  });

  it('guide strings switch language', () => {
    expect(guideStrings('zh').analyze).toBe('分析页面');
    expect(guideStrings('en').analyze).toBe('Analyze');
  });
});
