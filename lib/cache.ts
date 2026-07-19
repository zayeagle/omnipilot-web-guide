import { storage } from 'wxt/storage';
import type { InterpretResult } from './ai/interpret';

export type CacheEntry = {
  key: string;
  at: number;
  result: InterpretResult;
};

const cacheItem = storage.defineItem<Record<string, CacheEntry>>('local:analyzeCache', {
  fallback: {},
});

const TTL_MS = 30 * 60 * 1000;

export function cacheKey(
  originPath: string,
  fingerprint: string,
  locale = 'en',
): string {
  return `${originPath}::${locale}::${fingerprint}`;
}

export function structureFingerprint(
  candidates: Array<{ uid: string; kind: string; text: string }>,
): string {
  return candidates
    .slice(0, 40)
    .map((c) => `${c.uid}:${c.kind}:${c.text.slice(0, 24)}`)
    .join('|');
}

export async function getCached(key: string): Promise<InterpretResult | null> {
  const all = await cacheItem.getValue();
  const hit = all[key];
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) return null;
  return hit.result;
}

export async function setCached(key: string, result: InterpretResult): Promise<void> {
  const all = await cacheItem.getValue();
  all[key] = { key, at: Date.now(), result };
  // keep last 40
  const entries = Object.values(all).sort((a, b) => b.at - a.at).slice(0, 40);
  const next: Record<string, CacheEntry> = {};
  for (const e of entries) next[e.key] = e;
  await cacheItem.setValue(next);
}
