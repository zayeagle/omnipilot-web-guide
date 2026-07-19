/** Storage schema + pure helpers (UNIT-testable without browser). */

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  providerId?: string;
}

export type SecurityState = {
  hardeningEnabled: boolean;
  saltB64: string;
  ivB64: string;
  cipherB64: string;
  /** @deprecated never persist */
  rememberedPassphrase?: string;
};

/** Opt-in host-page actions. All flags default OFF. */
export type PagePermissions = {
  /** When true, OmniPilot may click a resolved control on the user's behalf. */
  allowAssistedClick: boolean;
};

export interface ExtensionSettings {
  aiConfig: AiConfig;
  security: SecurityState;
  permissions: PagePermissions;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  chatModel: 'gpt-4o-mini',
  providerId: 'openai',
};

export const DEFAULT_SECURITY: SecurityState = {
  hardeningEnabled: false,
  saltB64: '',
  ivB64: '',
  cipherB64: '',
  rememberedPassphrase: '',
};

export const DEFAULT_PERMISSIONS: PagePermissions = {
  allowAssistedClick: false,
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  aiConfig: { ...DEFAULT_AI_CONFIG },
  security: { ...DEFAULT_SECURITY },
  permissions: { ...DEFAULT_PERMISSIONS },
};

export function hasValidApiKey(config: AiConfig): boolean {
  return config.apiKey.trim().length > 0;
}

export function hasEncryptedKey(security: SecurityState): boolean {
  return security.hardeningEnabled && security.cipherB64.trim().length > 0;
}

export function hasStoredCredential(settings: ExtensionSettings): boolean {
  if (hasEncryptedKey(settings.security)) return true;
  return hasValidApiKey(settings.aiConfig);
}

/** Only https — http Base URL would MITM the Bearer token. */
export function isValidBaseUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateAiConfig(config: AiConfig): string | null {
  if (!isValidBaseUrl(config.baseUrl)) {
    return 'Base URL must be https://';
  }
  if (!config.chatModel.trim()) {
    return 'Chat model is required';
  }
  return null;
}
