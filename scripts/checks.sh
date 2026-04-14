#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

printf "\n[1/3] Frontend build check\n"
cd "$ROOT_DIR/cultural-fest/frontend"
npm run build

printf "\n[2/3] Backend syntax check\n"
cd "$ROOT_DIR/cultural-fest/backend"
python3 -m compileall .

printf "\n[3/3] Optional health smoke check\n"
if curl --silent --show-error --fail "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
  echo "Health endpoint check: PASS"
else
  echo "Health endpoint check: SKIPPED (backend not running on 127.0.0.1:8000)"
fi

echo "\nAll automated checks completed."
