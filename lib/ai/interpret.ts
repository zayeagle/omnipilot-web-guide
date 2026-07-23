import type { UiLocale } from '../i18n/locale';
import { localeLabel } from '../i18n/locale';
import { disposeAnalyzeRunTemps } from '../analyze/dispose-ephemeral';
import {
  looksLikeImageApiError,
  releaseScreenshot,
  scrubImageContentParts,
  type ScreenshotRef,
} from '../capture/screenshot';
import type { AiConfig } from '../storage';
import type { Candidate } from '../scanner';
import { toAiSummary } from '../scanner';
import { rulesFallbackFeatures, type GuideFeature } from './rules-fallback';
import { sanitizeErrorMessage } from './sanitize';

const TIMEOUT_MS = 45_000;

export type InterpretResult = {
  pageSummary: string;
  features: GuideFeature[];
  degraded: boolean;
};

export type InterpretOptions = {
  /** JPEG/PNG data URL; omitted for text-only models. Cleared after use. */
  screenshotDataUrl?: string | null;
  /** Preferred: mutable ref so Analyze can wipe the payload in finally. */
  screenshotRef?: ScreenshotRef;
};

type TextContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1]?.trim() || trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(body.slice(start, end + 1));
}

/** True when the HTTP body looks like OpenAI-style SSE (`data: {...}`). */
export function looksLikeSseBody(bodyText: string): boolean {
  const t = bodyText.trimStart();
  return t.startsWith('data:') || /^data:\s/m.test(bodyText);
}

/**
 * Extract assistant message text from a chat/completions response body.
 * Supports non-stream JSON and SSE (some gateways ignore stream:false).
 */
export function completionContentFromBody(bodyText: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) throw new Error('empty model response');

  if (looksLikeSseBody(trimmed)) {
    let answer = '';
    for (const line of trimmed.split(/\r?\n/)) {
      const row = line.trim();
      if (!row.startsWith('data:')) continue;
      const data = row.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{
            delta?: { content?: string };
            message?: { content?: string };
          }>;
        };
        const choice = json.choices?.[0];
        const piece =
          choice?.delta?.content || choice?.message?.content || '';
        if (piece) answer += piece;
      } catch {
        /* skip bad SSE chunk */
      }
    }
    answer = answer.trim();
    if (!answer) throw new Error('empty SSE model response');
    return answer;
  }

  const data = JSON.parse(trimmed) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

export function parseInterpretPayload(
  raw: unknown,
  candidates: Candidate[],
  locale: UiLocale = 'en',
): InterpretResult {
  const uidSet = new Set(candidates.map((c) => c.uid));
  if (!raw || typeof raw !== 'object') {
    return { ...rulesFallbackFeatures(candidates, locale), degraded: true };
  }
  const obj = raw as {
    pageSummary?: unknown;
    features?: unknown;
  };
  const pageSummary =
    typeof obj.pageSummary === 'string' && obj.pageSummary.trim()
      ? obj.pageSummary.trim().slice(0, 240)
      : locale === 'zh'
        ? '页面分析'
        : 'AI page analysis';
  const list = Array.isArray(obj.features) ? obj.features : [];
  const features: GuideFeature[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const f = item as Record<string, unknown>;
    const uid = typeof f.uid === 'string' ? f.uid : '';
    if (!uidSet.has(uid)) continue;
    const name = typeof f.name === 'string' ? f.name.trim().slice(0, 80) : '';
    if (!name) continue;
    const description =
      typeof f.description === 'string'
        ? f.description.trim().slice(0, 200)
        : locale === 'zh'
          ? '页面操作'
          : 'Page action';
    let howTo: string[] = [];
    if (Array.isArray(f.howTo)) {
      howTo = f.howTo
        .filter((s): s is string => typeof s === 'string' && !!s.trim())
        .map((s) => s.trim().slice(0, 160))
        .slice(0, 8);
    }
    if (!howTo.length) {
      howTo =
        locale === 'zh'
          ? ['找到该控件', '点击或激活', '按提示确认']
          : ['Locate the control', 'Activate it', 'Confirm if prompted'];
    }
    features.push({ uid, name, description, howTo, source: 'ai' });
  }
  if (!features.length) {
    return { ...rulesFallbackFeatures(candidates, locale), degraded: true };
  }
  return { pageSummary, features, degraded: false };
}

export function buildInterpretUserContent(
  summaryJson: string,
  screenshotDataUrl: string | null | undefined,
  locale: UiLocale,
): string | TextContentPart[] {
  if (!screenshotDataUrl) return summaryJson;
  const hint =
    locale === 'zh'
      ? '下方 JSON 为扫描到的控件摘要。请结合视口截图理解布局、标签页与主操作；features 只能使用 JSON 中已有的 uid。'
      : 'JSON below lists scanned controls. Use the viewport screenshot for layout, tabs, and primary actions; features must use only uids from the JSON.';
  return [
    { type: 'text', text: `${hint}\n\n${summaryJson}` },
    { type: 'image_url', image_url: { url: screenshotDataUrl } },
  ];
}

async function requestCompletion(
  config: AiConfig,
  system: string,
  userContent: string | TextContentPart[],
  signal: AbortSignal,
): Promise<string> {
  const base = config.baseUrl.replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.chatModel,
      temperature: 0.2,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  });
  let bodyText = await res.text();
  try {
    if (!res.ok) {
      throw new Error(
        sanitizeErrorMessage(
          `HTTP ${res.status}: ${bodyText.slice(0, 160)}`,
          config.apiKey,
        ),
      );
    }
    const content = completionContentFromBody(bodyText);
    if (!content) throw new Error('empty model response');
    return content;
  } finally {
    // Drop raw HTTP body (may be large SSE) as soon as content is extracted.
    bodyText = '';
  }
}

export async function interpretWithAi(
  config: AiConfig,
  candidates: Candidate[],
  meta: { title: string; url: string },
  locale: UiLocale = 'en',
  options?: InterpretOptions,
): Promise<InterpretResult> {
  let summary: ReturnType<typeof toAiSummary> | null = toAiSummary(
    candidates,
    meta,
  );
  const system = `You analyze webpage UI controls for end-user guidance.
Return ONLY JSON:
{"pageSummary":"string","features":[{"uid":"c0","name":"","description":"","howTo":["step1","step2"]}]}
Rules: use only provided uids; howTo 2-5 short steps; prefer primary actions; max 20 features.
CRITICAL: Write pageSummary, name, description, and every howTo step entirely in ${localeLabel(locale)}.`;

  const summaryJson = {
    value: JSON.stringify(summary) as string | null,
  };
  // Object form is no longer needed once serialized.
  if (summary) summary.candidates = [];
  summary = null;
  const modelText = { value: null as string | null };
  const shotRef: ScreenshotRef = options?.screenshotRef ?? {
    dataUrl: options?.screenshotDataUrl?.trim() || null,
  };
  // Drop any loose copy on options immediately; work only via shotRef.
  if (options) options.screenshotDataUrl = null;

  let userContent: string | TextContentPart[] = buildInterpretUserContent(
    summaryJson.value || '',
    shotRef.dataUrl,
    locale,
  );
  const hadShot = !!shotRef.dataUrl;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    try {
      modelText.value = await requestCompletion(
        config,
        system,
        userContent,
        ctrl.signal,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Non-multimodal / gateway rejection: retry text-only once.
      if (hadShot && looksLikeImageApiError(msg)) {
        scrubImageContentParts(userContent);
        releaseScreenshot(shotRef);
        userContent = summaryJson.value || '';
        modelText.value = await requestCompletion(
          config,
          system,
          userContent,
          ctrl.signal,
        );
      } else {
        throw e;
      }
    }
    const parsed = extractJson(modelText.value || '');
    return parseInterpretPayload(parsed, candidates, locale);
  } catch (e) {
    const msg = sanitizeErrorMessage(
      e instanceof Error ? e.message : String(e),
      config.apiKey,
    );
    const fallback = rulesFallbackFeatures(candidates, locale);
    return {
      ...fallback,
      pageSummary: msg,
      degraded: true,
    };
  } finally {
    clearTimeout(timer);
    disposeAnalyzeRunTemps({
      screenshotRef: shotRef,
      userContent,
      summaryJson,
      modelText,
    });
    // Caller may still hold screenshotRef — ensure dataUrl is gone.
    releaseScreenshot(options?.screenshotRef);
    if (options) options.screenshotDataUrl = null;
    userContent = '';
  }
}
