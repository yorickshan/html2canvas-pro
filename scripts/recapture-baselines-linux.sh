#!/bin/bash
# Recapture Chrome reftest baselines inside a Linux container so they match
# the CI environment. Baselines captured on macOS (or even on a Debian-based
# image) differ in font rasterisation and fail the CI diff — seen 2026-11-04
# with zindex-z-index21 and filter-svg-reference, first across OSes
# (macOS vs Ubuntu, 50/5032 px) then across distros (Debian ARM vs Ubuntu
# x86, 2/144 px). The container must therefore be the SAME distro and
# architecture family as the runner, and fonts must come from Playwright's
# own `install --with-deps`, exactly like CI.
#
# Requirements: Docker (OrbStack on macOS works) for an amd64 container.
# Apple Silicon runs the amd64 image under emulation — slow but correct,
# which matters more than speed here: the runner is x86_64.
#
# Usage: bash scripts/recapture-baselines-linux.sh
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE=html2canvas-pro-recapture
CONTAINER_WORK=/work

# Match the CI runner exactly: ubuntu 24.04 on x86_64. Node 24 comes from
# NodeSource; everything else (browser libs, font packages) is installed by
# `playwright install --with-deps` inside the container, the same command
# the workflow runs.
docker build -t "$IMAGE" -f- . <<'DOCKERFILE'
FROM --platform=linux/amd64 ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg bash \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && corepack enable \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /work
DOCKERFILE

# CI=true: the mounted repo may carry a node_modules built for another
# platform, and pnpm must relink it without a TTY prompt.
docker run --rm -e CI=true \
    -v "$PWD:$CONTAINER_WORK" \
    -w "$CONTAINER_WORK" \
    "$IMAGE" \
    bash -c '
        set -e
        corepack pnpm install --frozen-lockfile
        corepack pnpm build
        corepack pnpm prebrowser
        corepack pnpm exec playwright install --with-deps chromium
        corepack pnpm reftests:pw -- --browser=chromium
    '

echo
echo "Captures written to tmp/reftests/. Copy the ones you want as baselines:"
echo "  cp 'tmp/reftests/<test>!Chrome.png' tests/results/"
echo
echo "NOTE: the container relinked node_modules for linux/amd64. Restore the"
echo "host install afterwards with: CI=true corepack pnpm install --frozen-lockfile"
