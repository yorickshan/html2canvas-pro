#!/bin/bash

if [ $# -ne 1 ]; then
  echo "Usage: npm run tag <tag_name>"
  exit 1
fi

git tag "v$1"
git push origin "v$1"