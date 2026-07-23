import { describe, expect, it } from 'vitest';
import {
  appendAssistNote,
  shouldAttachScreenshot,
  visionAssistNote,
  visionCapabilityForModel,
  visionSkipReason,
} from './vision-capability';

describe('visionCapabilityForModel', () => {
  it('detects common multimodal models', () => {
    expect(visionCapabilityForModel('gpt-4o-mini')).toBe('yes');
    expect(visionCapabilityForModel('openai/gpt-4o')).toBe('yes');
    expect(visionCapabilityForModel('anthropic/claude-3.5-sonnet')).toBe('yes');
    expect(visionCapabilityForModel('google/gemini-2.0-flash-001')).toBe('yes');
  });

  it('detects text-only models', () => {
    expect(visionCapabilityForModel('deepseek-chat')).toBe('no');
    expect(visionCapabilityForModel('gpt-3.5-turbo')).toBe('no');
  });

  it('unknown custom ids stay unknown', () => {
    expect(visionCapabilityForModel('my-corp/custom-7b')).toBe('unknown');
  });
});

describe('shouldAttachScreenshot', () => {
  it('skips when disabled or text-only', () => {
    expect(
      shouldAttachScreenshot({ model: 'gpt-4o', enabled: false }),
    ).toBe(false);
    expect(
      shouldAttachScreenshot({ model: 'deepseek-chat', enabled: true }),
    ).toBe(false);
  });

  it('attaches for known vision models', () => {
    expect(shouldAttachScreenshot({ model: 'gpt-4o', enabled: true })).toBe(
      true,
    );
  });

  it('unknown only when tryUnknown', () => {
    expect(
      shouldAttachScreenshot({ model: 'custom-x', enabled: true }),
    ).toBe(false);
    expect(
      shouldAttachScreenshot({
        model: 'custom-x',
        enabled: true,
        tryUnknown: true,
      }),
    ).toBe(true);
  });
});

describe('visionSkipReason', () => {
  it('explains skip causes', () => {
    expect(visionSkipReason('gpt-4o', false)).toBe('disabled');
    expect(visionSkipReason('deepseek-chat', true)).toBe('not_multimodal');
    expect(visionSkipReason('weird-model', true)).toBe('unknown_model');
    expect(visionSkipReason('gpt-4o', true)).toBeNull();
  });
});

describe('visionAssistNote', () => {
  it('explains text-only fallback in zh', () => {
    expect(visionAssistNote('zh', 'not_multimodal')).toContain('不支持看图');
    expect(visionAssistNote('zh', 'disabled')).toBeNull();
  });

  it('appends within summary budget', () => {
    expect(appendAssistNote('页面分析', '当前模型不支持看图，已使用页面结构分析')).toContain(
      '不支持看图',
    );
  });
});

describe('looksLikeImageApiError via capture helper', () => {
  it('detects common vision rejection phrases', async () => {
    const { looksLikeImageApiError } = await import('../capture/screenshot');
    expect(looksLikeImageApiError('model does not support images')).toBe(true);
    expect(looksLikeImageApiError('rate limit exceeded')).toBe(false);
  });
});
