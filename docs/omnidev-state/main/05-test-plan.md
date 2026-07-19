---
artifact: 05-test-plan.md
test_strategy_profile: frontend-only-M
layers_required: [unit, integration, e2e, smoke, regression]
layers_optional: []
e2e_tool: playwright
e2e_required: true
integration_required: true
unit_gate: blocking
regression_mode: targeted
project_type: greenfield
frontend_impact: yes
complexity: M
last_updated: 2026-07-19T11:21:00+08:00
---

# Test Plan — omnipilot-web-guide MVP

## Test Strategy Summary
| Layer | Required | Tool | Command / Path | TC Count |
|-------|:--------:|------|----------------|----------|
| UNIT | ✅ | vitest | `npm test` | 16 |
| INT | ✅ | vitest | `npm run test:int` | 4 |
| E2E | ✅ | playwright | `npm run test:e2e` | 2 |
| SMK | ✅ | — | subset | 3 |
| REG | ✅ | vitest | Module tags | 4 |

## Traceability
| Feature | Task IDs | UNIT | INT | E2E | SMK |
|---------|----------|------|-----|-----|-----|
| F1 | T1–T3 | TC-F1-U* | — | TC-E2E-01 | TC-SMK-01 |
| F2 | T4–T5 | TC-F2-U* | TC-F2-I01 | — | — |
| F3 | T6–T8 | TC-F3-U* | TC-F3-I01 | — | TC-SMK-02 |
| F4 | T9–T11 | TC-F4-U* | TC-F4-I01 | TC-E2E-02 | TC-SMK-03 |

## F1 — UNIT
| TC-ID | Layer | Type | Target | Input | Expected | Mock |
|-------|-------|------|--------|-------|----------|------|
| TC-F1-U01 | UNIT | Happy | message router | analyze.page | routes to handler | none |
| TC-F1-U02 | UNIT | Err | message router | unknown type | ignored/error | none |
| TC-F1-U03 | UNIT | Err | restricted URL guard | chrome:// | skip inject | none |
| TC-F1-U04 | UNIT | Boundary | empty tab id | null | safe no-op | none |

## F2 — UNIT
| TC-ID | Layer | Type | Target | Input | Expected | Mock |
|-------|-------|------|--------|-------|----------|------|
| TC-F2-U01 | UNIT | Happy | scanner | sample DOM w/ buttons | ≥1 candidates | happy-dom |
| TC-F2-U02 | UNIT | Err | scanner | empty body | [] | happy-dom |
| TC-F2-U03 | UNIT | Err | scanner | hidden-only controls | filtered out | happy-dom |
| TC-F2-U04 | UNIT | Boundary | scanner | 200 buttons | capped ≤80 | happy-dom |

## F2 — INT
| TC-ID | Layer | Type | Target | Input | Expected | Mock |
|-------|-------|------|--------|-------|----------|------|
| TC-F2-I01 | INT | Happy | content→bg payload | candidates | serializable summary | none |
| TC-F2-I02 | INT | Err | oversized payload | huge text | truncated/safe | none |

## F3 — UNIT
| TC-ID | Layer | Type | Target | Input | Expected | Mock |
|-------|-------|------|--------|-------|----------|------|
| TC-F3-U01 | UNIT | Happy | AI parse | valid JSON | features mapped | fetch mock |
| TC-F3-U02 | UNIT | Err | AI parse | bad JSON | fallback rules | fetch mock |
| TC-F3-U03 | UNIT | Err | AI parse | unknown uid | dropped | none |
| TC-F3-U04 | UNIT | Boundary | redact | password input value | not in prompt | none |

## F3 — INT
| TC-ID | Layer | Type | Target | Input | Expected | Mock |
|-------|-------|------|--------|-------|----------|------|
| TC-F3-I01 | INT | Happy | scan→AI→features | candidates+mock API | Feature[] | fetch |
| TC-F3-I02 | INT | Err | no API key | settings empty | rules-only path | none |

## F4 — UNIT
| TC-ID | Layer | Type | Target | Input | Expected | Mock |
|-------|-------|------|--------|-------|----------|------|
| TC-F4-U01 | UNIT | Happy | guide steps | howTo[3] | 3 steps | none |
| TC-F4-U02 | UNIT | Err | highlight | missing uid | soft fail msg | none |
| TC-F4-U03 | UNIT | Err | tour | empty features | no start | none |
| TC-F4-U04 | UNIT | Boundary | tour | last step next | ends cleanly | none |

## F4 — INT
| TC-ID | Layer | Type | Target | Input | Expected | Mock |
|-------|-------|------|--------|-------|----------|------|
| TC-F4-I01 | INT | Happy | panel→content highlight | feature uid | overlay shown flag | msg mock |

## E2E Flows
| TC-ID | Layer | Flow | Steps (short) | Expected |
|-------|-------|------|---------------|----------|
| TC-E2E-01 | E2E | Load shell | build → load ext → open sidepanel | UI visible |
| TC-E2E-02 | E2E | Analyze fixture | open fixture page → Analyze → list items | ≥1 feature row |

## Smoke Suite
| TC-ID | Source-TC | Layer | Critical Path |
|-------|-----------|-------|---------------|
| TC-SMK-01 | TC-E2E-01 | E2E | Extension loads |
| TC-SMK-02 | TC-F3-I02 | INT | Rules fallback without key |
| TC-SMK-03 | TC-E2E-02 | E2E | Analyze produces list |

## Regression Suite
| TC-ID | Layer | Module | Package | Type |
|-------|-------|--------|---------|------|
| TC-REG-scanner-01 | REG | scanner | lib/scanner | UNIT |
| TC-REG-ai-01 | REG | ai | lib/ai | UNIT |
| TC-REG-guide-01 | REG | guide | lib/guide | UNIT |
| TC-REG-messages-01 | REG | messages | lib/messages | UNIT |
