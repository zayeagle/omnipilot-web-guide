import { describe, expect, it } from 'vitest';
import { disposeAnalyzeRunTemps, type AnalyzeRunTemps } from './dispose-ephemeral';

describe('disposeAnalyzeRunTemps', () => {
  it('clears screenshot, scan, summary, model text, and candidates', () => {
    const temps: AnalyzeRunTemps = {
      screenshotRef: { dataUrl: 'data:image/jpeg;base64,abc' },
      candidates: [
        {
          uid: 'c0',
          tag: 'button',
          role: '',
          text: 'Save',
          ariaLabel: '',
          placeholder: '',
          nearbyHeading: '',
          kind: 'button',
          rect: { x: 0, y: 0, width: 1, height: 1 },
          inViewport: true,
        },
      ],
      scan: {
        candidates: [{ uid: 'c0' } as never],
        meta: { title: 't', url: 'https://x.test/' },
        error: 'x',
      },
      userContent: [
        { type: 'text', text: 'hi' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,xyz' } },
      ],
      summaryJson: { value: '{"huge":true}' },
      modelText: { value: '{"pageSummary":"ok"}' },
    };

    disposeAnalyzeRunTemps(temps);

    expect(temps.screenshotRef).toBeNull();
    expect(temps.candidates).toBeNull();
    expect(temps.scan).toBeNull();
    expect(temps.userContent).toBeNull();
    expect(temps.summaryJson).toBeNull();
    expect(temps.modelText).toBeNull();
  });

  it('is idempotent', () => {
    const temps: AnalyzeRunTemps = {
      screenshotRef: { dataUrl: null },
    };
    disposeAnalyzeRunTemps(temps);
    disposeAnalyzeRunTemps(temps);
    expect(temps.screenshotRef).toBeNull();
  });
});
