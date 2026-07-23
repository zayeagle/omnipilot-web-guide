import { describe, expect, it } from 'vitest';
import {
  releaseScreenshot,
  scrubImageContentParts,
  type ScreenshotRef,
} from './screenshot';

describe('releaseScreenshot', () => {
  it('nulls held data URLs', () => {
    const ref: ScreenshotRef = { dataUrl: 'data:image/jpeg;base64,abc' };
    releaseScreenshot(ref, null, undefined);
    expect(ref.dataUrl).toBeNull();
  });
});

describe('scrubImageContentParts', () => {
  it('clears image_url and text payloads', () => {
    const parts = [
      { type: 'text', text: 'hi' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,xyz' } },
    ];
    scrubImageContentParts(parts);
    expect(parts[0]?.text).toBe('');
    expect(parts[1]?.image_url?.url).toBe('');
  });
});
