---
version: 2
previous_version: 1
artifact: 02-plan.md
complexity: M
last_updated: 2026-07-19T11:26:00+08:00
history_ref: 02-plan-history.md
---

# Plan — omnipilot-web-guide MVP (v2)

CHANGE_LOG: v2 — multi-provider + security tasks; align lingua-bridge patterns

## Assumptions
- Stack/scripts align `omnipilot-lingua-bridge` (WXT/TS/Vitest/Playwright).
- Rules → AI (multi-provider chat) → Side Panel + tour; AI fail / locked → rules fallback.
- Security: vault + SW-only unlock + sender.id + redact + content assert no secrets.
- Providers MVP: openai, deepseek, anthropic(openrouter), openrouter, custom (chat only).
- Browsers: Chrome/Edge MVP; Firefox build path; no Safari.

## Traceability
| Group | Features | TC-IDs |
|-------|----------|--------|
| G1 | F1 | TC-F1-U*, TC-E2E-01, TC-SMK-01 |
| G2 | F2 | TC-F2-U*, TC-F2-I* |
| G3 | F3+F5 | TC-F3-U*, TC-F3-I*, TC-SEC-*, TC-SMK-02 |
| G4 | F4 | TC-F4-U*, TC-F4-I*, TC-E2E-02, TC-SMK-03 |
| G5 | — | ci/pack/docs |

## G1 — Shell (F1)
- [x] **T1** [frontend] WXT scaffold + locales + icons · feature: F1 · outputs: `package.json`, `wxt.config.ts`, `scripts/`, `public/` · depends: —
- [x] **T2** [frontend] Background router + sidepanel/options shells + `security.*` stubs · feature: F1 · outputs: `entrypoints/background.ts`, `sidepanel/`, `options/` · depends: T1
- [x] **T3** [frontend] Content host + restricted URL guard + messages types · feature: F1 · outputs: `entrypoints/content.ts`, `lib/messages.ts` · depends: T1

## G2 — Scanner (F2)
- [x] **T4** [frontend] Rule scanner + filters/cap · feature: F2 · outputs: `lib/scanner/*` · depends: T3
- [x] **T5** [frontend] UNIT/INT scanner · feature: F2 · outputs: `lib/scanner/*.test.ts` · depends: T4

## G3 — Providers + security + AI (F3)
- [x] **T6** [frontend] Providers presets + storage schema · feature: F3 · outputs: `lib/providers.ts`, `lib/storage.ts` · depends: T2
- [x] **T7** [frontend] Vault/key-session/security-client + options unlock UX · feature: F3 · outputs: `lib/settings-store.ts`, `lib/key-session.ts`, `lib/security-client.ts`, `lib/secrets.ts` · depends: T6
- [x] **T8** [frontend] AI client + resolveAiConfig + cache + rules fallback · feature: F3 · outputs: `lib/ai/*`, `lib/cache.ts` · depends: T4, T7
- [x] **T9** [frontend] UNIT/INT security+AI (locked/missing_key/redact/sender) · feature: F3 · outputs: `lib/**/*.test.ts` · depends: T8

## G4 — Guidance UX (F4)
- [x] **T10** [frontend] Side Panel list + Analyze · feature: F4 · outputs: `entrypoints/sidepanel/*` · depends: T2, T8
- [x] **T11** [frontend] Spotlight tour Shadow DOM · feature: F4 · outputs: `lib/guide/*` · depends: T3, T10
- [x] **T12** [frontend] UNIT/INT guide + E2E smoke · feature: F4 · outputs: `lib/guide/*.test.ts`, `e2e/*` · depends: T11

## G5 — Pack & docs
- [x] **T13** [frontend] README EN/ZH, Makefile, `assert:content`, `npm run ci` · feature: F1 · outputs: `README.md`, `README.zh-CN.md`, `Makefile`, `scripts/assert-content-no-secrets.mjs` · depends: T5, T9, T12
