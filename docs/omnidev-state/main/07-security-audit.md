---
requirement_id: omnipilot-web-guide-mvp
iteration: 1
status: PASS
blocking_open: 0
git_tip: 05fe310+uncommitted
audited_at: 2026-07-19T11:51:00+08:00
---

# Security Audit

## Summary
- Scope: G1–G5 extension sources (`entrypoints/`, `lib/`, `scripts/`, configs)
- Tools: checklist + `npm run assert:content` (PASS)
- Result: **PASS**
- Iteration: 1 / 3

## Findings
| ID | Sev | File | Issue | Remediation |
|----|-----|------|-------|-------------|
| S1 | — | — | No hardcoded API keys/tokens in source | OK |
| S2-01 | INFO | sidepanel/options/spotlight | Static `innerHTML` templates; dynamic text via `textContent` | Accept — no user HTML injection path |
| S3 | — | background `security.*` | `sender.id === runtime.id` && no tab | OK |
| S4 | — | — | No eval / unsafe exec | OK |
| S5 | — | storage/crypto-key | https-only Base URL; PBKDF2 100k + AES-GCM vault | OK |
| S6 | — | ai/sanitize, assert:content | Error redact; content bundle secret scan | OK |
| S7-01 | MEDIUM | npm transitive | Known npm audit advisories in toolchain (WXT/deps) | Track; not introduced secrets; `npm audit` on CI later |
| S8 | — | — | No project SAST configured | checklist-only |

## Tools
- `npm run assert:content` → exit 0
- Manual checklist S1–S8 on touched paths
- `npm audit` (informational): transitive vulns in tooling — not FAIL per default MEDIUM policy

## Decision
- passed — no CRITICAL/HIGH open; MEDIUM npm advisories documented
