import type { UiLocale } from '../i18n/locale';
import { localeLabel } from '../i18n/locale';
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

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1]?.trim() || trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(body.slice(start, end + 1));
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

export async function interpretWithAi(
  config: AiConfig,
  candidates: Candidate[],
  meta: { title: string; url: string },
  locale: UiLocale = 'en',
): Promise<InterpretResult> {
  const summary = toAiSummary(candidates, meta);
  const system = `You analyze webpage UI controls for end-user guidance.
Return ONLY JSON:
{"pageSummary":"string","features":[{"uid":"c0","name":"","description":"","howTo":["step1","step2"]}]}
Rules: use only provided uids; howTo 2-5 short steps; prefer primary actions; max 20 features.
CRITICAL: Write pageSummary, name, description, and every howTo step entirely in ${localeLabel(locale)}.`;

  const user = JSON.stringify(summary);
  const base = config.baseUrl.replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.chatModel,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(
        sanitizeErrorMessage(
          `HTTP ${res.status}: ${bodyText.slice(0, 160)}`,
          config.apiKey,
        ),
      );
    }
    const data = JSON.parse(bodyText) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(content);
    return parseInterpretPayload(parsed, candidates, locale);
  } catch (e) {
    const msg = sanitizeErrorMessage(
      e instanceof Error ? e.message : String(e),
      config.apiKey,
    );
    const fallback = rulesFallbackFeatures(candidates, locale);
    return {
      ...fallback,
      pageSummary: `${fallback.pageSummary}: ${msg}`,
      degraded: true,
    };
  } finally {
    clearTimeout(timer);
  }
}
