---
version: 2
previous_version: 1
artifact: 04-design.md
complexity: M
last_updated: 2026-07-19T11:26:00+08:00
history_ref: 04-design-history.md
---

# Design — omnipilot-web-guide MVP (v2)

CHANGE_LOG: v2 — multi-provider + security (align lingua-bridge); chat-only providers

## Feature F1: Extension shell (WXT)
### Business Context
- **Related**: `omnipilot-lingua-bridge` layout/messaging patterns
- **Impact**: Chrome/Edge + Firefox build; Side Panel; `security.*` + analyze/guide messages

### Implementation Logic
1. WXT+TS scaffold: background/content/sidepanel/options; locales; icons.
2. Permissions: `storage`, `activeTab`, `sidePanel`, `scripting`; host for page analysis.
3. Message bus: `analyze.*`, `guide.*`, `settings.*`, `security.*`; `sender.id === runtime.id` for privileged ops.
4. Scripts/ci align sibling (`assert:content` no secrets in content bundle).

### Edge Cases
- Happy: load → side panel | Err: chrome:// skip | Boundary: wrong sender → deny security

### Data Changes
| Entity | Change | Details |
| entrypoints/*, wxt.config | new | shell + gecko id |

## Feature F2: Rule scanner
### Business Context
- **Related**: F3/F4
- **Impact**: offline candidates; AI input + rules fallback labels

### Implementation Logic
1. Scan interactive nodes; filter hidden/tiny; dedupe; cap 40–80; viewport-first.
2. `Candidate[]` with uid/rect/text/aria/kind; top-level frame only MVP.
3. Debounced re-scan when panel open (SPA).

### Edge Cases
- Happy: form → candidates | Err: empty | Boundary: 200 nodes → cap

### Data Changes
| Entity | Change | Details |
| lib/scanner/* | new | pure TS |

## Feature F3: Multi-provider AI + security + cache
### Business Context
- **Related**: lingua-bridge `providers`, vault, `key-session`, `security-client`
- **Impact**: Chat interpret via many vendors; secrets never in content; fail-closed when locked

### Implementation Logic
1. **Providers** (chat-focused): OpenAI, DeepSeek, Anthropic(via OpenRouter), OpenRouter, Custom — presets for baseURL + model lists (no STT/TTS required).
2. **Settings**: provider + baseURL + model + key; optional hardening passphrase → encrypt vault (SW).
3. **SW session**: unlock fills in-memory key; options uses `security.*` only (no options-world vault SSOT).
4. **resolveAiConfigForRequest**: `locked` / `missing_key` → no network with secrets; rules fallback OK when missing_key.
5. Redact password values from candidates; `sanitizeErrorMessage`; cache by origin+path+fingerprint.

### Edge Cases
- Happy: unlock → AI features | Err: hardened+locked → explicit unlock | Boundary: custom baseURL

### Data Changes
| Entity | Change | Details |
| lib/providers, storage, settings-store, key-session, security-client, ai/* | new | SW-only secrets |

## Feature F4: Guidance UX
### Business Context
- **Related**: F2/F3 results
- **Impact**: 图文列表 + spotlight tour

### Implementation Logic
1. Side Panel: summary, list, Analyze/Tour; never displays raw API key.
2. Shadow DOM overlay; scroll + steps; thumbs optional/off default.

### Edge Cases
- Happy: highlight | Err: detached uid | Boundary: tour end

### Data Changes
| Entity | Change | Details |
| sidepanel/*, lib/guide/* | new | guide UX |

## Out of scope (MVP)
- Safari; deep iframe; STT/TTS; iFlytek stack; local LLM; auto-submit forms; passphrase auto-unlock from disk
