#!/bin/bash

if [ $# -ne 1 ]; then
  echo "usage: npm run tag <tag_name>"
  exit 1
fi

echo "✔ tagging release v$1"
git tag "v$1"

echo "✔ pushing tag v$1 to remote"
git push origin "v$1"