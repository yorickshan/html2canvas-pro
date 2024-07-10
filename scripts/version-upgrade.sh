#!/bin/bash

if [ $# -ne 1 ]; then
  echo "Usage: npm run release <version_name>."
  exit 1
fi

if git rev-parse "v$1" >/dev/null 2>&1
then
  echo "Tag 'v$1' exists."
  exit 1
fi

npx standard-version --release-as $1
git push --follow-tags