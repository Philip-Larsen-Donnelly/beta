#!/usr/bin/env bash
set -euo pipefail

echo "Cleaning workspace: removing build and install artifacts..."

# Remove Next.js build output and node modules
rm -rf .next node_modules

# If the files are tracked, remove them from git index (safe to run)
git rm -r --cached .next >/dev/null 2>&1 || true
git rm -r --cached node_modules >/dev/null 2>&1 || true

echo "Done. You may also run 'npm ci' or 'pnpm install' to reinstall dependencies."
