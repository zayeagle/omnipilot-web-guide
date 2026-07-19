import { storage } from 'wxt/storage';
import { decryptSecret, encryptSecret } from './crypto-key';
import { clearUnlockedApiKey, getUnlockedApiKey, setUnlockedApiKey } from './key-session';
import { resolveApiKeyInput } from './secrets';
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_PERMISSIONS,
  DEFAULT_SECURITY,
  DEFAULT_SETTINGS,
  type AiConfig,
  type ExtensionSettings,
  type PagePermissions,
  type SecurityState,
  hasEncryptedKey,
  hasStoredCredential,
  hasValidApiKey,
  validateAiConfig,
} from './storage';

export const settingsItem = storage.defineItem<ExtensionSettings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

function stripPassphrase(security: SecurityState): SecurityState {
  return {
    hardeningEnabled: security.hardeningEnabled,
    saltB64: security.saltB64,
    ivB64: security.ivB64,
    cipherB64: security.cipherB64,
    rememberedPassphrase: '',
  };
}

async function persist(settings: ExtensionSettings): Promise<ExtensionSettings> {
  const next: ExtensionSettings = {
    ...settings,
    security: stripPassphrase(settings.security),
  };
  await settingsItem.setValue(next);
  return next;
}

export async function getSettings(): Promise<ExtensionSettings> {
  const value = await settingsItem.getValue();
  return {
    aiConfig: { ...DEFAULT_AI_CONFIG, ...value.aiConfig },
    security: stripPassphrase({ ...DEFAULT_SECURITY, ...value.security }),
    permissions: {
      ...DEFAULT_PERMISSIONS,
      // Opt-in only: anything other than explicit true stays off.
      allowAssistedClick: value.permissions?.allowAssistedClick === true,
    },
  };
}

export type SaveAiOpts = {
  aiConfig: AiConfig;
  /** When true, encrypt apiKey with passphrase and clear plaintext storage */
  hardening?: boolean;
  passphrase?: string;
  permissions?: PagePermissions;
};

export async function saveAiConfig(opts: SaveAiOpts): Promise<ExtensionSettings> {
  const current = await getSettings();
  const wantHardening = opts.hardening ?? current.security.hardeningEnabled;
  const nextPermissions: PagePermissions = {
    ...DEFAULT_PERMISSIONS,
    allowAssistedClick: opts.permissions
      ? opts.permissions.allowAssistedClick === true
      : current.permissions.allowAssistedClick === true,
  };
  const mergedKey = resolveApiKeyInput(opts.aiConfig.apiKey, current.aiConfig.apiKey);
  const nextConfig: AiConfig = {
    ...opts.aiConfig,
    apiKey: mergedKey,
  };
  const err = validateAiConfig(nextConfig);
  if (err) throw new Error(err);

  if (wantHardening) {
    const passphrase = (opts.passphrase ?? '').trim();
    if (!passphrase) throw new Error('Passphrase required to enable hardening');
    if (!mergedKey) throw new Error('API Key required');
    const blob = await encryptSecret(mergedKey, passphrase);
    // Session unlock must happen in SW via security.unlock (options calls it after save).
    return persist({
      aiConfig: { ...nextConfig, apiKey: '' },
      security: {
        hardeningEnabled: true,
        saltB64: blob.saltB64,
        ivB64: blob.ivB64,
        cipherB64: blob.cipherB64,
      },
      permissions: nextPermissions,
    });
  }

  // Disable hardening / plaintext mode
  if (current.security.hardeningEnabled && current.security.cipherB64) {
    const passphrase = (opts.passphrase ?? '').trim();
    if (!passphrase) throw new Error('Passphrase required to disable hardening');
    await decryptSecret(
      {
        saltB64: current.security.saltB64,
        ivB64: current.security.ivB64,
        cipherB64: current.security.cipherB64,
      },
      passphrase,
    );
  }
  clearUnlockedApiKey();
  return persist({
    aiConfig: nextConfig,
    security: { ...DEFAULT_SECURITY },
    permissions: nextPermissions,
  });
}

export async function unlockWithPassphrase(passphrase: string): Promise<void> {
  const settings = await getSettings();
  if (!hasEncryptedKey(settings.security)) {
    throw new Error('Hardening is not enabled');
  }
  const key = await decryptSecret(
    {
      saltB64: settings.security.saltB64,
      ivB64: settings.security.ivB64,
      cipherB64: settings.security.cipherB64,
    },
    passphrase,
  );
  setUnlockedApiKey(key);
}

export async function lockSession(): Promise<void> {
  clearUnlockedApiKey();
}

export async function getSecurityStatus(): Promise<{
  hardeningEnabled: boolean;
  hasCredential: boolean;
  unlocked: boolean;
  autoUnlock: boolean;
}> {
  const settings = await getSettings();
  return {
    hardeningEnabled: settings.security.hardeningEnabled,
    hasCredential: hasStoredCredential(settings),
    unlocked: !settings.security.hardeningEnabled || !!getUnlockedApiKey(),
    autoUnlock: false,
  };
}

export type ResolveAiFailureReason = 'locked' | 'missing_key';

export async function resolveAiConfigForRequest(): Promise<
  | { ok: true; settings: ExtensionSettings }
  | { ok: false; error: string; reason: ResolveAiFailureReason }
> {
  const settings = await getSettings();
  if (hasEncryptedKey(settings.security)) {
    const key = getUnlockedApiKey();
    if (!key) {
      return {
        ok: false,
        reason: 'locked',
        error: 'Vault locked — unlock in Settings first',
      };
    }
    return {
      ok: true,
      settings: {
        ...settings,
        permissions: settings.permissions,
        aiConfig: { ...settings.aiConfig, apiKey: key },
      },
    };
  }
  if (!hasValidApiKey(settings.aiConfig)) {
    return {
      ok: false,
      reason: 'missing_key',
      error: 'Configure an API Key in Settings',
    };
  }
  return { ok: true, settings };
}
