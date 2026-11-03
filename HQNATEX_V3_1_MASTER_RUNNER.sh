#!/usr/bin/env bash
set -euo pipefail
set -Eeuo pipefail
case "${1:-}" in
 --audit) python3 HQNATEX_ENTERPRISE_MULTITENANT_V3_1.py --audit ;;
 --plan) python3 HQNATEX_ENTERPRISE_MULTITENANT_V3_1.py --plan ;;
 --apply-foundation) python3 HQNATEX_ENTERPRISE_MULTITENANT_V3_1.py --apply-foundation && python3 HQNATEX_V3_1_VERIFY.py ;;
 *) echo "Usage: bash HQNATEX_V3_1_MASTER_RUNNER.sh --audit|--plan|--apply-foundation"; exit 2 ;;
esac
