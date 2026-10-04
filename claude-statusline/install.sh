#!/usr/bin/env bash
set -euo pipefail
command -v node >/dev/null 2>&1 || { echo "Node.js >= 18 is required: https://nodejs.org" >&2; exit 1; }
cd "$(dirname "$0")"
node install.mjs "$@"
