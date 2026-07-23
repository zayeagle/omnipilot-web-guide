import { describe, expect, it } from 'vitest';
import type { Candidate } from '../scanner';
import {
  buildInterpretUserContent,
  completionContentFromBody,
  looksLikeSseBody,
  parseInterpretPayload,
} from './interpret';

const candidates: Candidate[] = [
  {
    uid: 'c0',
    tag: 'button',
    role: '',
    text: 'Save',
    ariaLabel: '',
    placeholder: '',
    nearbyHeading: '',
    kind: 'button',
    rect: { x: 0, y: 0, width: 10, height: 10 },
    inViewport: true,
  },
];

describe('parseInterpretPayload', () => {
  it('TC-F3-U01: valid JSON maps features', () => {
    const r = parseInterpretPayload(
      {
        pageSummary: 'Edit form',
        features: [
          {
            uid: 'c0',
            name: 'Save',
            description: 'Persist changes',
            howTo: ['Click Save'],
          },
        ],
      },
      candidates,
    );
    expect(r.degraded).toBe(false);
    expect(r.features[0]?.name).toBe('Save');
  });

  it('TC-F3-U02: bad payload → rules fallback', () => {
    const r = parseInterpretPayload(null, candidates);
    expect(r.degraded).toBe(true);
    expect(r.features[0]?.source).toBe('rules');
  });

  it('TC-F3-U03: unknown uid dropped', () => {
    const r = parseInterpretPayload(
      {
        pageSummary: 'x',
        features: [{ uid: 'c99', name: 'Nope', description: '', howTo: [] }],
      },
      candidates,
    );
    expect(r.degraded).toBe(true);
    expect(r.features.every((f) => f.uid !== 'c99')).toBe(true);
  });
});

describe('buildInterpretUserContent', () => {
  it('returns plain text without screenshot', () => {
    expect(buildInterpretUserContent('{"a":1}', null, 'en')).toBe('{"a":1}');
  });

  it('returns multimodal parts with screenshot', () => {
    const parts = buildInterpretUserContent(
      '{"a":1}',
      'data:image/jpeg;base64,abc',
      'zh',
    );
    expect(Array.isArray(parts)).toBe(true);
    if (!Array.isArray(parts)) return;
    expect(parts[0]?.type).toBe('text');
    expect(parts[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,abc' },
    });
  });
});

describe('completionContentFromBody', () => {
  it('parses non-stream chat completions JSON', () => {
    const body = JSON.stringify({
      choices: [{ message: { content: '{"pageSummary":"ok"}' } }],
    });
    expect(looksLikeSseBody(body)).toBe(false);
    expect(completionContentFromBody(body)).toBe('{"pageSummary":"ok"}');
  });

  it('assembles SSE deltas (gateway stream despite stream:false)', () => {
    const body = [
      'data: {"choices":[{"delta":{"content":"{\\"page"}}]}',
      'data: {"choices":[{"delta":{"content":"Summary\\":\\"hi\\"}"}}]}',
      'data: [DONE]',
      '',
    ].join('\n');
    expect(looksLikeSseBody(body)).toBe(true);
    expect(completionContentFromBody(body)).toBe('{"pageSummary":"hi"}');
  });

  it('matches the reported Unexpected token d failure shape', () => {
    const body =
      'data: {"model":"x","choices":[{"delta":{"content":"{\\"a\\":1}"}}]}\n\ndata: [DONE]\n';
    expect(() => JSON.parse(body)).toThrow(/Unexpected token/);
    expect(completionContentFromBody(body)).toBe('{"a":1}');
  });
});
