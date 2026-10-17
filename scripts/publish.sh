#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
gh api user --jq .login
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init -b main
fi
git add .
if ! git diff --cached --quiet; then
  git commit -m "Initialize BhumiSetu Next.js development scaffold"
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create AdribMahmud101/bhumisetu --public --source=. --remote=origin --push --description "BhumiSetu: digital land records and evidence-based verification for LandTech 2026"
else
  git push -u origin HEAD
fi
