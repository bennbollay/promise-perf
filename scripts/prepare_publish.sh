#!/usr/bin/env bash
set -e
echo "Running prepare publish script"
export HUSKY="0"
echo "Husky hooks disabled"
echo "Registry to publish:$PUBLISH_REGISTRY"
npm run lint:check
npm run prettier:check
npm run build
npm publish --registry=$PUBLISH_REGISTRY
