# Deploy — OmniPilot Web Guide

Browser-extension packaging (not a server). **Default mode: `binary`.**

## One-click commands

```bash
make deploy-help
make deploy                    # binary (default)
make deploy-binary
make deploy-dry-run MODE=binary
node deploy/deploy.mjs binary --dry-run
./deploy/deploy.sh binary --dry-run
```

| Mode | Command | Effect |
|------|---------|--------|
| **binary** | `make deploy-binary` | `npm run ci` → `npm run pack` (Chrome + Firefox zips) |
| docker | `make deploy-docker` | N/A stub (use binary) |
| k8s | `make deploy-k8s` | N/A stub (use binary) |

## Load unpacked (dev / staging)

1. `make deploy-binary` (or `npm run build`)
2. Chrome/Edge: `chrome://extensions` → Load unpacked → `.output/chrome-mv3`
3. Firefox: load from WXT Firefox output under `.output/`

## Store / distribution

- Zips from `npm run pack` / `npm run zip` / `npm run zip:firefox` under `.output/`
- Submit via Chrome Web Store / Firefox Add-ons (manual; no prod auto-push)

## Rollback

- Uninstall extension or reload previous zip / previous git tag build
- No server state to roll back

## Env

| Var | Default | Notes |
|-----|---------|-------|
| `ENV` | `staging` | Informational only for pack scripts |
