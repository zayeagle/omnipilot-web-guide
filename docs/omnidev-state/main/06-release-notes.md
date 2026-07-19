---
artifact: 06-release-notes.md
version: 0.1.0
phase: 5
status: ready
deploy_modes: binary,docker(stub),k8s(stub)
deploy_autonomy: conservative
---

# Release Notes — omnipilot-web-guide v0.1.0

## Summary
MVP browser extension: rule scan + multi-provider AI interpret + Side Panel + Shadow DOM spotlight tour. Security: optional vault, SW unlock, content-bundle secret assert. Tests: vitest 22 · e2e 2 · `npm run ci` green. Security audit PASS.

## Infrastructure Added/Changed
| Asset | Change |
|-------|--------|
| `Makefile` | Extended with `deploy-help`, `deploy-binary/docker/k8s`, `deploy-dry-run` |
| `deploy/deploy.mjs` | One-click router (Windows-friendly Node) |
| `deploy/deploy.sh` + `deploy/{binary,docker,k8s}/deploy.sh` | Thin wrappers → Node router |
| `deploy/README.md` | Cheat sheet + rollback |
| `.github/workflows/ci.yml` | Existing CI (test + chrome + assert + firefox) — unchanged |

**deploy_modes**: binary ✅ (primary) · docker ⚠️ N/A stub · k8s ⚠️ N/A stub  
**one_click_ready**: `make deploy` ✅ · `node deploy/deploy.mjs` ✅

## Test gate
See `05-test-report.md` — **PASS** (2026-07-19).

## Deployment

### One-Click Commands
```bash
npm run deploy:dry-run         # Windows-friendly (no Make required)
npm run deploy                 # binary: ci + pack
node deploy/deploy.mjs binary --dry-run
make deploy-help               # if Make installed
make deploy-binary
```

### Supported Modes
| Mode | One-click | Target |
|------|-----------|--------|
| binary | `make deploy-binary` | `.output/` unpacked + store zips |
| docker | `make deploy-docker` | N/A (stub) |
| k8s | `make deploy-k8s` | N/A (stub) |

### Prerequisites
- Node.js 22+, npm
- Optional: Make — on Windows without Make use `npm run deploy` / `node deploy/deploy.mjs`

### Environment Variables
| Var | Default | Notes |
|-----|---------|-------|
| `ENV` | staging | Informational for pack scripts |

### Deploy Steps (binary)
1. `make deploy-binary` (runs `ci` + `pack`)
2. Load unpacked: `.output/chrome-mv3`
3. Or submit zips from `.output/` to stores (manual)

### Rollback
Reload previous build / uninstall extension. No server state.

### Known Issues / Deferred
- Full Chromium `--load-extension` E2E not yet
- Safari not in MVP
- Store publish is manual (no CI push to CWS/AMO)

## Checklist
- [x] Makefile + deploy router + three modes (binary real; docker/k8s stub)
- [x] `make deploy-help` / dry-run documented
- [x] `deploy/README.md` + this file
- [ ] Production store submit — requires explicit user confirm (B.0); not automated
