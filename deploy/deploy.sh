#!/usr/bin/env bash
# Usage: ./deploy/deploy.sh [binary|docker|k8s] [--dry-run] [--build-only]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/deploy/deploy.mjs" "$@"
