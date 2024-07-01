#!/bin/bash

npx standard-version --skip.changelog --skip.tag --release-as $1
npx conventional-changelog -p angular -i CHANGELOG.md -s
