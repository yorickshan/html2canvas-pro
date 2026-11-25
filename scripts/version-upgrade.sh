#!/bin/bash
set -e

git pull -r

if [ $# -ne 1 ]; then
  echo "Usage: pnpm release <version>"
  echo "  version: major | minor | patch | premajor | preminor | prepatch | prerelease"
  exit 1
fi

VERSION=$1

if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "Tag v$VERSION already exists."
  exit 1
fi

# Bump version in package.json (no git commit/tag)
npm version "$VERSION" --no-git-tag-version

# Generate changelog. Uses the repo script instead of the bare
# conventional-changelog CLI: the CLI links prose hex colours in commit
# bodies as if they were issue numbers (see scripts/generate-changelog.mjs).
node scripts/generate-changelog.mjs CHANGELOG.md 1

# Commit and tag
git add package.json CHANGELOG.md
git commit -m "chore(release): v$VERSION"
git tag -a "v$VERSION" -m "v$VERSION"
git push --follow-tags origin main
