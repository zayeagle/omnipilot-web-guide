/** In-memory unlocked secrets for the service worker lifetime. */

let unlockedApiKey: string | null = null;

export function setUnlockedApiKey(key: string | null): void {
  unlockedApiKey = key && key.trim() ? key.trim() : null;
}

export function getUnlockedApiKey(): string | null {
  return unlockedApiKey;
}

export function isSessionUnlocked(): boolean {
  return !!unlockedApiKey;
}

export function clearUnlockedApiKey(): void {
  unlockedApiKey = null;
}
