#!/usr/bin/env bash

VERSION=`jq -rc ".version" lerna.json`
git tag v${VERSION} || true

git push --tags || true