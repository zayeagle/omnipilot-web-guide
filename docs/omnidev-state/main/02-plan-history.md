# History: 02-plan.md

Append-only archive. Do not edit or delete past snapshots.
Newest entries appended at **bottom**.

---

## [ARCHIVE] 02-plan.md · v1 · 2026-07-19 11:26

| Field | Value |
|-------|-------|
| version | 1 |
| archived_at | 2026-07-19T11:26:00+08:00 |
| reason | requirement |
| trigger | user /od n (structural: multi-provider + security) |
| requirement_id | omnipilot-web-guide-mvp |
| summary | Baseline MVP plan before multi-provider/security sync |

<!-- BEGIN SNAPSHOT -->---
version: 1
artifact: 02-plan.md
complexity: M
last_updated: 2026-07-19T11:21:00+08:00
history_ref: 02-plan-history.md
---

# Plan 鈥?omnipilot-web-guide MVP

## Assumptions
- Stack: WXT + TypeScript + Vitest + Playwright (align `omnipilot-lingua-bridge`).
- Product: rules scan 鈫?AI interpret (OpenAI-compatible) 鈫?Side Panel + spotlight tour; AI fail 鈫?rules fallback.
- Browsers MVP: Chrome/Edge; Firefox via `wxt -b firefox` build (no Safari).
- Privacy: API key SW/storage only; no password values in AI payload; screenshot thumbs optional/off by default.
- Phase 1 Blueprint skipped (M).

## Traceability
| Group | Features | TC-IDs |
|-------|----------|--------|
| G1 | F1 | TC-F1-U*, TC-E2E-01, TC-SMK-01 |
| G2 | F2 | TC-F2-U*, TC-F2-I* |
| G3 | F3 | TC-F3-U*, TC-F3-I*, TC-SMK-02 |
| G4 | F4 | TC-F4-U*, TC-F4-I*, TC-E2E-02, TC-SMK-03 |
| G5 | 鈥?| pack/docs/ci green |

## G1 鈥?Shell (F1)
- [ ] **T1** [frontend] WXT scaffold: package.json, wxt.config, tsconfig, locales, icons 路 feature: F1 路 outputs: `package.json`, `wxt.config.ts`, `entrypoints/*` 路 depends: 鈥?
- [ ] **T2** [frontend] Background message router + sidepanel/options shells 路 feature: F1 路 outputs: `entrypoints/background.ts`, `sidepanel/`, `options/` 路 depends: T1
- [ ] **T3** [frontend] Content script host + restricted-page guard 路 feature: F1 路 outputs: `entrypoints/content.ts`, `lib/messages.ts` 路 depends: T1

## G2 鈥?Scanner (F2)
- [ ] **T4** [frontend] Rule scanner + filters/cap 路 feature: F2 路 outputs: `lib/scanner/*` 路 depends: T3
- [ ] **T5** [frontend] UNIT/INT for scanner + payload 路 feature: F2 路 outputs: `lib/scanner/*.test.ts` 路 depends: T4

## G3 鈥?AI + settings (F3)
- [ ] **T6** [frontend] Settings store + options UI (baseURL/model/key) 路 feature: F3 路 outputs: `lib/settings-store.ts`, `entrypoints/options/*` 路 depends: T2
- [ ] **T7** [frontend] AI client + schema validate + cache + rules fallback 路 feature: F3 路 outputs: `lib/ai/*`, `lib/cache.ts` 路 depends: T4, T6
- [ ] **T8** [frontend] UNIT/INT AI redact/parse/fallback 路 feature: F3 路 outputs: `lib/ai/*.test.ts` 路 depends: T7

## G4 鈥?Guidance UX (F4)
- [ ] **T9** [frontend] Side Panel feature list + Analyze action 路 feature: F4 路 outputs: `entrypoints/sidepanel/*` 路 depends: T2, T7
- [ ] **T10** [frontend] Spotlight overlay + tour controls (Shadow DOM) 路 feature: F4 路 outputs: `lib/guide/*` 路 depends: T3, T9
- [ ] **T11** [frontend] UNIT/INT guide + E2E smoke fixtures 路 feature: F4 路 outputs: `lib/guide/*.test.ts`, `e2e/*` 路 depends: T10

## G5 鈥?Pack & docs
- [ ] **T12** [frontend] README (EN/ZH), Makefile/pack scripts, `npm run ci` green 路 feature: F1 路 outputs: `README.md`, `README.zh-CN.md`, `Makefile` 路 depends: T5, T8, T11

<!-- END SNAPSHOT -->

---

