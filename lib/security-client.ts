/** Options → background security.* helpers. */

import type { SecurityRequest } from './messages';

type SecurityStatusOk = {
  ok: true;
  hardeningEnabled: boolean;
  hasCredential: boolean;
  unlocked: boolean;
  autoUnlock: boolean;
};

type SecurityResult = SecurityStatusOk | { ok: true } | { ok: false; error?: string };

async function sendSecurity(msg: SecurityRequest): Promise<SecurityResult> {
  const res = (await browser.runtime.sendMessage(msg)) as SecurityResult;
  if (!res || typeof res !== 'object') throw new Error('Security service unavailable');
  if (!res.ok) throw new Error(('error' in res && res.error) || 'Security operation failed');
  return res;
}

export async function unlockSession(passphrase: string): Promise<void> {
  await sendSecurity({ type: 'security.unlock', passphrase });
}

export async function lockSessionRemote(): Promise<void> {
  await sendSecurity({ type: 'security.lock' });
}

export async function fetchSecurityStatus(): Promise<{
  hardeningEnabled: boolean;
  hasCredential: boolean;
  unlocked: boolean;
  autoUnlock: boolean;
}> {
  const res = await sendSecurity({ type: 'security.status' });
  if (!res.ok || !('unlocked' in res)) throw new Error('Cannot read security status');
  return {
    hardeningEnabled: !!res.hardeningEnabled,
    hasCredential: !!res.hasCredential,
    unlocked: !!res.unlocked,
    autoUnlock: !!res.autoUnlock,
  };
}
