#!/usr/bin/env bash
set -xe

npm ci
git ls-tree -r HEAD --name-only | grep -E ".[tj]?sx?$|.yaml$|.json$" | grep -v assets | grep -v lerna.json | xargs -P 1 npx prettier --check
npm run lint:check
