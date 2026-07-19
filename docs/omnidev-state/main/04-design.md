---
version: 1
artifact: 04-design.md
complexity: M
last_updated: 2026-07-19T11:21:00+08:00
history_ref: 04-design-history.md
---

# Design — omnipilot-web-guide MVP

## Feature F1: Extension shell (WXT)
### Business Context
- **Related**: sibling `omnipilot-lingua-bridge` (WXT layout)
- **Impact**: installable Chrome/Edge (+ Firefox build path); Side Panel + content + background messaging

### Implementation Logic
1. Scaffold WXT+TS: `entrypoints/{background,content,sidepanel,options}`, `wxt.config.ts`, locales, icons.
2. Manifest: `storage`, `activeTab`, `sidePanel`, `scripting`; host as needed for analysis; gecko id for Firefox.
3. Message bus: `analyze.page` / `guide.highlight` / `guide.tour` / `settings.*` via background router.
4. Align scripts with sibling: `dev`, `build`, `build:firefox`, `test`, `ci`.

### Edge Cases
- Happy: load extension → open side panel | Err: no active tab | Boundary: restricted chrome:// pages skip inject

### Data Changes
| Entity | Change | Details |
| entrypoints/* | new | WXT shells |
| wxt.config.ts | new | manifest + permissions |

## Feature F2: Rule scanner
### Business Context
- **Related**: F3 AI, F4 guide
- **Impact**: offline candidate list for any page; input to AI + fallback labels

### Implementation Logic
1. Content script `lib/scanner`: walk interactive nodes (button/a/input/select/role/cursor).
2. Filter: hidden, tiny, decorative; dedupe; cap 40–80; prefer viewport.
3. Emit `Candidate[]`: uid, tag, role, text, aria, nearby heading, rect, kind.
4. Re-scan on SPA hint (popstate / major DOM mutate debounced) when panel open.

### Edge Cases
- Happy: form page → candidates | Err: empty body | Boundary: iframe (top-level only MVP)

### Data Changes
| Entity | Change | Details |
| lib/scanner/* | new | pure TS, unit-testable |

## Feature F3: AI interpret + settings + cache
### Business Context
- **Related**: F2 candidates, F4 display
- **Impact**: named features + howTo steps; degrade to rules if no key / API fail

### Implementation Logic
1. Options: API Base URL, model, API key → `chrome.storage.local` only.
2. Background: redact candidates → OpenAI-compatible chat → JSON schema validate (uid must exist).
3. Cache by `origin+path+structureFingerprint`; TTL/invalidate on re-analyze.
4. Fail-closed secrets: never put key in content script; sanitize errors.

### Edge Cases
- Happy: key set → features JSON | Err: 401/timeout → rules fallback | Boundary: empty howTo → template steps

### Data Changes
| Entity | Change | Details |
| lib/ai/*, settings-store | new | SW-only network |
| storage | settings + cache | local |

## Feature F4: Guidance UX
### Business Context
- **Related**: F2/F3 results
- **Impact**: 图文列表 + 高亮 + 分步 Tour

### Implementation Logic
1. Side Panel: pageSummary, feature list (name/desc/thumb optional), Analyze / Tour.
2. Content: spotlight overlay (Shadow DOM), scrollIntoView, step through howTo + relatedUids.
3. Optional: `captureVisibleTab` crop by rect for thumbs (off by default if privacy).
4. Click list item → highlight; Tour next/skip/end.

### Edge Cases
- Happy: click feature → highlight | Err: uid detached → re-scan tip | Boundary: scrollable overflow

### Data Changes
| Entity | Change | Details |
| sidepanel/*, lib/guide/* | new | overlay + messaging |

## Out of scope (MVP)
- Safari; deep iframe scan; user correction training; local LLM; auto-submit forms
