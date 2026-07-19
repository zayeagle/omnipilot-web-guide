import { describe, expect, it } from 'vitest';
import { sanitizeErrorMessage } from './sanitize';

describe('sanitizeErrorMessage', () => {
  it('TC-SEC-U04: redacts api key', () => {
    const key = 'sk-secret-abcdef123456';
    expect(sanitizeErrorMessage(`fail ${key} end`, key)).toBe('fail [REDACTED] end');
  });
});
