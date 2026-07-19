/** API Key helpers (no I/O). */

export function maskApiKey(apiKey: string): string {
  const key = apiKey.trim();
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${'•'.repeat(Math.min(12, key.length - 4))}${key.slice(-4)}`;
}

export function resolveApiKeyInput(
  input: string | undefined,
  existing: string,
): string {
  const trimmed = (input ?? '').trim();
  return trimmed || existing.trim();
}

export function containsApiKey(haystack: string, apiKey: string): boolean {
  const key = apiKey.trim();
  return key.length > 0 && haystack.includes(key);
}
