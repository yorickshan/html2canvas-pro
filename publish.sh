#!/bin/bash
npm config set registry=https://registry.npmjs.org/
echo '-------login-------'
npm login
echo '------publish------'
npm publish --access public
echo 'finished'
exit 0
