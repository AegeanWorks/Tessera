#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Tessera needs Node.js 20 or newer."
  echo "Install it from https://nodejs.org/ and run ./play.sh again."
  exit 1
fi
exec node scripts/serve.mjs --open
