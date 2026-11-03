#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$HOME/hqnatex"
FRONTEND="$ROOT/frontend"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/HQNATEX_BACKUPS/REPORT_CARDS_$STAMP"

cd "$FRONTEND"
mkdir -p "$BACKUP"
cp src/features/finance/LiveFinance.tsx "$BACKUP/"
cp src/features/workspace/workspace.css "$BACKUP/"
cp "$HOME/LiveFinance.tsx" src/features/finance/LiveFinance.tsx
cp "$HOME/workspace.css" src/features/workspace/workspace.css
npm run build
echo "BUILD=PASS"
echo "BACKUP_DIR=$BACKUP"
