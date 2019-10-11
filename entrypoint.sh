#!/bin/sh

set -e

npm install --no-package-lock

npm install -g typescript

tsc --project jsconfig.json
