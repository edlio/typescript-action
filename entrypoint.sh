#!/bin/sh

set -e

npm install --no-package-lock

npm install typescript

# tsc --project jsconfig.json

pwd
node /action/compile.js
