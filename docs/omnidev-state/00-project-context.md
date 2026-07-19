# Project Context — omnipilot-web-guide

## Identity
- **Repo**: `omnipilot-web-guide`
- **Series**: OmniPilot (sibling: `omnipilot-lingua-bridge`)
- **Goal**: All-in-one page action guidance assistant — detect page capabilities and guide users with visual step-by-step help
- **project_type**: greenfield
- **project_structure**: single-package

## Stack & Layers
- **Classify**: frontend-only (browser extension)
- **Frontend**: TypeScript + WXT (align with `omnipilot-lingua-bridge`)
- **UI**: Side Panel + in-page highlight/tour (Shadow DOM)
- **Test**: Vitest (unit) + Playwright (e2e) — match sibling
- **Backend**: none (LLM via user-configured multi-provider chat APIs)

## Dependency Topology
- **Storage**: `chrome.storage.local` (+ encrypted vault when hardening on)
- **Third-Party**: OpenAI-compatible Chat (OpenAI / DeepSeek / OpenRouter / Anthropic-via-OR / Custom)
- **Browser APIs**: content scripts, sidePanel, scripting, optional captureVisibleTab
- **Security SSOT**: Service Worker key-session; options via `security.*` messages only
- **No DB / MQ / S3**

## Stability Level
- **standard** with security emphasis — vault, fail-closed, sender.id, redact, content-bundle secret assert

## Domain Knowledge
- OmniPilot series naming: `omnipilot-<feature>` kebab-case
- Sibling stack: WXT + TypeScript + Vitest + Playwright; Chrome & Firefox targets
- Product: rules scan → AI interpret → Side Panel + spotlight; AI fail / locked → rules fallback
- MVP browsers: Chromium first; Firefox via WXT; Safari later
- MVP features: F1 shell · F2 scanner · F3 multi-provider AI + security · F4 guidance UX
- Test profile: `frontend-only-M`
- Align security patterns from lingua-bridge (vault / SW unlock / sanitize) without STT/TTS/iFlytek

## AI Pitfall Guide
- Never put API keys in content script world; never persist passphrase for auto-unlock
- Phase4 gates: vitest + playwright smoke + assert:content; full `--load-extension` E2E deferred
- Phase5: deploy default `binary` (ci+pack); docker/k8s N/A stubs for extension packaging
