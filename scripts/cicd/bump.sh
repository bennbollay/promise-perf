#!/usr/bin/env bash

set -xe

git pull
git switch main
npx lerna version $1 --yes --no-git-tag-version
git config --global user.email "goat@fusebit.io"
git config --global user.name "The GOAT"
git add -A
git commit -m "Bump: $(cat lerna.json | jq -r .version)"

git push
