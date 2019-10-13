#!/bin/sh

set -e

npm install --no-package-lock

npm install typescript

# tsc --project jsconfig.json

pwd
NODE_PATH=node_modules node /action/compile.js
