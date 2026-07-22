# Progress — Phase 3

## Pre-Dev Scope (M)
| Area | Paths |
|------|-------|
| Scaffold | `package.json`, `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `scripts/*` |
| Entrypoints | `entrypoints/{background,content,sidepanel,options}/*` |
| Protocol | `lib/messages.ts` |
| Locales/icons | `public/_locales/*`, `public/icon-*.png` |
| Later G3 | `lib/providers`, vault, key-session, ai/* (not yet) |

## Log
- ✅ T1 · package.json,wxt.config.ts,scripts/,public/ · 2026-07-19
- ✅ T2 · entrypoints/background.ts,sidepanel/,options/ · 2026-07-19
- ✅ T3 · entrypoints/content.ts,lib/messages.ts · 2026-07-19
- unit_tests: [TC-F1-U02, TC-F1-U03, TC-F1-U04]
- build: chrome-mv3 ok; vitest 3 passed
- ✅ T4 · lib/scanner/*,entrypoints/content.ts · 2026-07-19
- ✅ T5 · lib/scanner/scan.test.ts · 2026-07-19
- unit_tests: [TC-F2-U01..U04, TC-F2-I01, TC-F2-I02]
- vitest 9 passed
- ✅ T6 · lib/providers.ts,lib/storage.ts · 2026-07-19
- ✅ T7 · settings-store,key-session,security-client,crypto-key,options · 2026-07-19
- ✅ T8 · lib/ai/*,lib/cache.ts,background analyze · 2026-07-19
- ✅ T9 · providers/sanitize/interpret/settings-store tests · 2026-07-19
- unit_tests: [TC-SEC-U01..U04, TC-F3-U01..U03, TC-F3-I02]
- vitest 17 passed; assert:content ok
- ✅ T10 · sidepanel Analyze/Tour/howTo · 2026-07-19
- ✅ T11 · lib/guide spotlight Shadow DOM · 2026-07-19
- ✅ T12 · guide tests + e2e smoke · 2026-07-19
- unit_tests: [TC-F4-U01..U04, TC-F4-I01]
- vitest 22 · e2e 2 · assert:content ok
- ✅ T13 · README.md,README.zh-CN.md,Makefile,.github/workflows/ci.yml · 2026-07-19
- 🔒 Security audit · iter 1 · PASS · blocking=0
- npm run ci green (test + chrome + assert + firefox)

## Phase 4
- ✅ Test report PASS · vitest 22 · e2e 2 · assert:content · 2026-07-19

## Fix 2026-07-22 (interpret SSE)
- ✅ completionContentFromBody + stream:false · lib/ai/interpret.ts,interpret.test.ts · 2026-07-22
- unit_tests: SSE + JSON body paths (49 total)
- 🔒 Security audit · PASS · npm run ci green

## UX patch 2026-07-21 (toolbar pin + empty state)
- ✅ empty-state + compact float · mount-guide-ui,guide-styles,float-panel,locale · 2026-07-21
- ✅ README pin note (Chrome cannot default-unpin) · README.md,README.zh-CN.md
- unit_tests: locale empty/pin strings
- 🔒 Security audit · iter 1 · PASS · blocking=0
- npm run ci green · pack chrome/firefox zip ok

## Phase 5
- ✅ Deploy assets · binary dry-run PASS · docker/k8s stubs · 06-release-notes · 2026-07-19
