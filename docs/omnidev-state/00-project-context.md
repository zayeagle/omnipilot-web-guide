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
- **Backend**: none (LLM via user-configured OpenAI-compatible API)

## Dependency Topology
- **Storage**: `chrome.storage.local` (API key, cache, settings)
- **Third-Party**: OpenAI-compatible Chat Completions (DeepSeek / OpenAI / etc.)
- **Browser APIs**: content scripts, sidePanel, tabs.captureVisibleTab, scripting
- **No DB / MQ / S3**

## Stability Level
- **standard** — consumer extension MVP; privacy-sensitive (API key local-only, redact form values)

## Domain Knowledge
- OmniPilot series naming: `omnipilot-<feature>` kebab-case
- Sibling stack: WXT + TypeScript + Vitest + Playwright; Chrome & Firefox targets
- Product approach (prior alignment): rules heuristic scan → AI structured interpretation → Side Panel list + spotlight tour; AI failure degrades to rules-only
- MVP browsers: Chromium first (Chrome/Edge), Firefox via WXT; Safari later
- MVP features: F1 shell · F2 scanner · F3 AI+settings+cache · F4 guidance UX; test profile `frontend-only-M`

## AI Pitfall Guide
- (empty — greenfield)
