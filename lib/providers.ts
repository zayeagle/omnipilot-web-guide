/** OpenAI-compatible chat provider presets (no STT/TTS). */

export type ProviderId =
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'openrouter'
  | 'custom';

export type ProviderPreset = {
  id: ProviderId;
  label: string;
  blurb: string;
  baseUrl: string;
  chatModels: string[];
  capabilityNote: string;
};

export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    blurb: 'Official Chat Completions API.',
    baseUrl: 'https://api.openai.com/v1',
    chatModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    capabilityNote: 'Full OpenAI chat models.',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    blurb: 'Cost-effective chat models.',
    baseUrl: 'https://api.deepseek.com/v1',
    chatModels: ['deepseek-chat', 'deepseek-reasoner'],
    capabilityNote: 'OpenAI-compatible chat endpoint.',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    blurb: 'Claude via OpenRouter (OpenAI-compatible).',
    baseUrl: 'https://openrouter.ai/api/v1',
    chatModels: [
      'anthropic/claude-sonnet-4',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-haiku',
    ],
    capabilityNote: 'Use an OpenRouter API key (or custom OpenAI-compatible gateway).',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    blurb: 'Multi-vendor router in one key.',
    baseUrl: 'https://openrouter.ai/api/v1',
    chatModels: [
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-chat',
      'google/gemini-2.0-flash-001',
    ],
    capabilityNote: 'Use OpenRouter API Key.',
  },
  {
    id: 'custom',
    label: 'Custom',
    blurb: 'Any OpenAI-compatible HTTPS gateway.',
    baseUrl: '',
    chatModels: [],
    capabilityNote: 'Fill Base URL + model; only https is allowed.',
  },
];

export function getProvider(id: string | undefined): ProviderPreset {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1]!;
}

export function applyProviderPreset(
  id: ProviderId,
  current: { baseUrl: string; chatModel: string },
): { providerId: ProviderId; baseUrl: string; chatModel: string } {
  const p = getProvider(id);
  if (id === 'custom') {
    return { providerId: id, baseUrl: current.baseUrl, chatModel: current.chatModel };
  }
  return {
    providerId: id,
    baseUrl: p.baseUrl,
    chatModel: p.chatModels[0] || current.chatModel,
  };
}
