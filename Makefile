.PHONY: install dev build build-firefox test e2e ci \
	deploy deploy-local deploy-docker deploy-k8s deploy-binary \
	deploy-dry-run deploy-help

MODE ?= binary

install:
	npm install

dev:
	npm run dev

build:
	npm run build

build-firefox:
	npm run build:firefox

test:
	npm test

e2e:
	npm run test:e2e

ci:
	npm run ci

deploy-help:
	@echo "One-click deploy (browser extension pack):"
	@echo "  make deploy MODE=binary|docker|k8s  (default: binary)"
	@echo "  make deploy-binary | deploy-docker | deploy-k8s"
	@echo "  make deploy-dry-run MODE=binary"
	@echo "  node deploy/deploy.mjs binary --dry-run"
	@echo "Note: docker/k8s are N/A stubs; use binary for Chrome/Firefox artifacts."

# Default: binary pack (ci + zip). Alias deploy-local kept for README compat.
deploy deploy-local:
	node deploy/deploy.mjs $(MODE)

deploy-binary:
	node deploy/deploy.mjs binary

deploy-docker:
	node deploy/deploy.mjs docker

deploy-k8s:
	node deploy/deploy.mjs k8s

deploy-dry-run:
	node deploy/deploy.mjs $(MODE) --dry-run
