/**
 * Dispose in-memory temporaries created during a single Analyze run.
 * Screenshots are never written to disk; this drops base64 / scan copies
 * so the service worker can GC them right after the response is sent.
 */

import {
  releaseScreenshot,
  scrubImageContentParts,
  type ScreenshotRef,
} from '../capture/screenshot';
import type { Candidate } from '../scanner';

export type AnalyzeScanTemp = {
  candidates?: Candidate[];
  meta?: { title?: string; url?: string };
  error?: string;
};

export type AnalyzeRunTemps = {
  screenshotRef?: ScreenshotRef | null;
  /** Background-held candidate list for this run. */
  candidates?: Candidate[] | null;
  /** Raw content.scan response object. */
  scan?: AnalyzeScanTemp | null;
  /** AI request user content (string or multimodal parts). */
  userContent?: unknown;
  /** Large JSON summary string sent to the model. */
  summaryJson?: { value: string | null } | null;
  /** Raw model completion text before JSON parse. */
  modelText?: { value: string | null } | null;
};

function clearArray(arr: unknown[] | null | undefined): void {
  if (Array.isArray(arr)) arr.length = 0;
}

/**
 * Wipe Analyze-run ephemerals. Safe to call multiple times.
 * Does not touch durable cache entries (pageSummary / features only).
 */
export function disposeAnalyzeRunTemps(temps: AnalyzeRunTemps): void {
  releaseScreenshot(temps.screenshotRef ?? undefined);
  temps.screenshotRef = null;

  scrubImageContentParts(temps.userContent);
  temps.userContent = null;

  if (temps.summaryJson) temps.summaryJson.value = null;
  temps.summaryJson = null;

  if (temps.modelText) temps.modelText.value = null;
  temps.modelText = null;

  clearArray(temps.candidates ?? undefined);
  temps.candidates = null;

  if (temps.scan) {
    clearArray(temps.scan.candidates);
    temps.scan.candidates = undefined;
    temps.scan.meta = undefined;
    temps.scan.error = undefined;
    temps.scan = null;
  }
}
