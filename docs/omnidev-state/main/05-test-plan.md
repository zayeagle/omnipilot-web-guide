---
version: 2
previous_version: 1
artifact: 05-test-plan.md
test_strategy_profile: frontend-only-M
layers_required: [unit, integration, e2e, smoke, regression]
e2e_tool: playwright
e2e_required: true
integration_required: true
unit_gate: blocking
regression_mode: targeted
project_type: greenfield
frontend_impact: yes
complexity: M
last_updated: 2026-07-19T11:26:00+08:00
history_ref: 05-test-plan-history.md
---

# Test Plan — omnipilot-web-guide MVP (v2)

CHANGE_LOG: v2 — add TC-SEC-* multi-provider + vault/fail-closed

## Execution (Phase 4 · 2026-07-19)
| Layer | Result |
|-------|--------|
| UNIT+INT | ✅ 22/22 vitest |
| E2E | ✅ 2/2 playwright |
| SMK/REG | ✅ via suites above |
| Full report | `05-test-report.md` · **PASS** |

## Test Strategy Summary
| Layer | Required | Tool | Command | TC Count |
|-------|:--------:|------|---------|----------|
| UNIT | ✅ | vitest | `npm test` | 24 |
| INT | ✅ | vitest | `npm run test:int` | 6 |
| E2E | ✅ | playwright | `npm run test:e2e` | 2 |
| SMK | ✅ | — | subset | 4 |
| REG | ✅ | vitest | module tags | 5 |

## Traceability
| Feature | Task IDs | UNIT | INT | E2E | SMK |
|---------|----------|------|-----|-----|-----|
| F1 | T1–T3 | TC-F1-U* | — | TC-E2E-01 | TC-SMK-01 |
| F2 | T4–T5 | TC-F2-U* | TC-F2-I* | — | — |
| F3 | T6–T9 | TC-F3-U*, TC-SEC-U* | TC-F3-I*, TC-SEC-I* | — | TC-SMK-02 |
| F4 | T10–T12 | TC-F4-U* | TC-F4-I* | TC-E2E-02 | TC-SMK-03/04 |

## F1 — UNIT
| TC-ID | Type | Target | Expected |
|-------|------|--------|----------|
| TC-F1-U01 | Happy | router analyze.page | routes |
| TC-F1-U02 | Err | unknown type | safe ignore |
| TC-F1-U03 | Err | chrome:// guard | skip |
| TC-F1-U04 | Boundary | null tab | no-op |

## F2 — UNIT / INT
| TC-ID | Type | Target | Expected |
|-------|------|--------|----------|
| TC-F2-U01 | Happy | scanner DOM | ≥1 candidates |
| TC-F2-U02 | Err | empty body | [] |
| TC-F2-U03 | Err | hidden-only | filtered |
| TC-F2-U04 | Boundary | 200 nodes | ≤80 |
| TC-F2-I01 | Happy | content→bg payload | serializable |
| TC-F2-I02 | Err | huge text | truncated |

## F3 / SEC — UNIT
| TC-ID | Type | Target | Expected |
|-------|------|--------|----------|
| TC-F3-U01 | Happy | AI parse valid JSON | features |
| TC-F3-U02 | Err | bad JSON | rules fallback |
| TC-F3-U03 | Err | unknown uid | dropped |
| TC-F3-U04 | Boundary | password value | redacted |
| TC-SEC-U01 | Happy | provider preset deepseek | baseURL set |
| TC-SEC-U02 | Err | hardened locked | reason locked |
| TC-SEC-U03 | Err | wrong sender.id | security deny |
| TC-SEC-U04 | Boundary | sanitizeErrorMessage | key redacted |

## F3 / SEC — INT
| TC-ID | Type | Target | Expected |
|-------|------|--------|----------|
| TC-F3-I01 | Happy | scan→AI mock | Feature[] |
| TC-F3-I02 | Err | missing_key | rules-only |
| TC-SEC-I01 | Happy | unlock→resolveAi | ok config |
| TC-SEC-I02 | Err | locked→no fetch | no network |

## F4 — UNIT / INT
| TC-ID | Type | Target | Expected |
|-------|------|--------|----------|
| TC-F4-U01 | Happy | howTo[3] | 3 steps |
| TC-F4-U02 | Err | missing uid | soft fail |
| TC-F4-U03 | Err | empty features | no tour |
| TC-F4-U04 | Boundary | last next | ends |
| TC-F4-I01 | Happy | panel→highlight | overlay flag |

## E2E / SMK / REG
| TC-ID | Flow / Path |
|-------|-------------|
| TC-E2E-01 | load ext → sidepanel visible |
| TC-E2E-02 | fixture Analyze → ≥1 row |
| TC-SMK-01 | from E2E-01 |
| TC-SMK-02 | rules fallback no key |
| TC-SMK-03 | from E2E-02 |
| TC-SMK-04 | locked blocks AI path |
| TC-REG-scanner/ai/guide/messages/security | UNIT module tags |
