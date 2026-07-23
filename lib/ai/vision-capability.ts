/**
 * Heuristic: whether a chat model id is likely to accept image_url parts.
 * Unknown models default to "no" so text-only gateways are not broken.
 */

import type { UiLocale } from '../i18n/locale';

export type VisionCapability = 'yes' | 'no' | 'unknown';

export type VisionAssistSkip =
  | 'disabled'
  | 'not_multimodal'
  | 'unknown_model'
  | 'capture_failed';

const VISION_YES =
  /(gpt-4o|gpt-4\.1|gpt-4-turbo|gpt-4-vision|o1|o3|o4|claude-3|claude-sonnet|claude-opus|claude-haiku|gemini|qwen[-_.]?vl|qwen2[-_.]?vl|llava|pixtral|vision|gpt-5)/i;

const VISION_NO =
  /(deepseek-chat|deepseek-reasoner|deepseek-v3|gpt-3\.5|text-embedding|tts|whisper|instruct(?!.*vision))/i;

export function visionCapabilityForModel(model: string): VisionCapability {
  const m = (model || '').trim();
  if (!m) return 'unknown';
  if (VISION_NO.test(m) && !VISION_YES.test(m)) return 'no';
  if (VISION_YES.test(m)) return 'yes';
  return 'unknown';
}

/** Whether Analyze should capture & attach a screenshot for this model. */
export function shouldAttachScreenshot(opts: {
  model: string;
  /** User setting — when false, never attach. */
  enabled: boolean;
  /** When true, also try for unknown models (may fail and fall back). */
  tryUnknown?: boolean;
}): boolean {
  if (!opts.enabled) return false;
  const cap = visionCapabilityForModel(opts.model);
  if (cap === 'yes') return true;
  if (cap === 'no') return false;
  return opts.tryUnknown === true;
}

export function visionSkipReason(
  model: string,
  enabled: boolean,
): VisionAssistSkip | null {
  if (!enabled) return 'disabled';
  const cap = visionCapabilityForModel(model);
  if (cap === 'yes') return null;
  if (cap === 'no') return 'not_multimodal';
  return 'unknown_model';
}

/** Soft note for the Analyze summary when screenshot assist is skipped. */
export function visionAssistNote(
  locale: UiLocale,
  reason: VisionAssistSkip | null,
): string | null {
  if (!reason || reason === 'disabled') return null;
  if (locale === 'zh') {
    if (reason === 'not_multimodal') {
      return '当前模型不支持看图，已使用页面结构分析';
    }
    if (reason === 'unknown_model') {
      return '当前模型未确认支持看图，已使用页面结构分析';
    }
    return '截图失败，已改用页面结构分析';
  }
  if (reason === 'not_multimodal') {
    return 'Model has no vision; used page structure only';
  }
  if (reason === 'unknown_model') {
    return 'Model vision unknown; used page structure only';
  }
  return 'Screenshot failed; used page structure only';
}

export function appendAssistNote(
  summary: string,
  note: string | null,
): string {
  if (!note) return summary;
  const joined = summary ? `${summary} · ${note}` : note;
  return joined.slice(0, 240);
}
