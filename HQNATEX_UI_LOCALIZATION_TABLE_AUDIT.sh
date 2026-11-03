#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/hqnatex"
FRONTEND="$ROOT/frontend"
CORE="$ROOT/core"
REPORT_DIR="$ROOT/docs"
STAMP="$(date +%Y%m%d_%H%M%S)"
REPORT="$REPORT_DIR/HQNATEX_UI_LOCALIZATION_TABLE_AUDIT_${STAMP}.log"

mkdir -p "$REPORT_DIR"
exec > >(tee -a "$REPORT") 2>&1

say(){ printf '\n[%s] %s\n' "$(date '+%F %T')" "$*"; }
die(){ say "FATAL: $*"; exit 1; }

[[ -d "$FRONTEND" ]] || die "Missing frontend"
[[ -d "$CORE" ]] || die "Missing core"

say "1/7 FRONTEND BUILD"
cd "$FRONTEND"
npm run build
echo "FRONTEND_BUILD=PASS"

say "2/7 TRANSLATION KEY PARITY (en/fa/ps)"
node <<'NODE'
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const base = path.join(process.env.HOME, 'hqnatex', 'frontend', 'src', 'i18n');
const files = ['en.ts','fa.ts','ps.ts'];

function literalKey(name) {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function findLargestObject(sourceFile) {
  let best = null;
  let bestCount = -1;
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      let count = 0;
      function walkObj(obj) {
        for (const p of obj.properties) {
          if (ts.isPropertyAssignment(p)) {
            count++;
            if (ts.isObjectLiteralExpression(p.initializer)) walkObj(p.initializer);
          }
        }
      }
      walkObj(node);
      if (count > bestCount) {
        best = node;
        bestCount = count;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return best;
}

function collect(obj, prefix='') {
  const out = new Set();
  for (const p of obj.properties) {
    if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p)) continue;
    const k = literalKey(p.name);
    if (!k) continue;
    const full = prefix ? `${prefix}.${k}` : k;
    out.add(full);
    if (ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) {
      for (const x of collect(p.initializer, full)) out.add(x);
    }
  }
  return out;
}

const sets = {};
for (const file of files) {
  const text = fs.readFileSync(path.join(base,file),'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const obj = findLargestObject(sf);
  if (!obj) {
    console.error(`${file}: no translation object found`);
    process.exit(2);
  }
  sets[file] = collect(obj);
  console.log(`${file}: ${sets[file].size} keys`);
}

const all = new Set([...sets['en.ts'], ...sets['fa.ts'], ...sets['ps.ts']]);
let bad = false;
for (const file of files) {
  const missing = [...all].filter(k => !sets[file].has(k));
  if (missing.length) {
    bad = true;
    console.log(`\n${file}: MISSING ${missing.length}`);
    for (const k of missing) console.log(`  ${k}`);
  } else {
    console.log(`${file}: KEY_PARITY=PASS`);
  }
}
if (bad) process.exit(3);
console.log('TRANSLATION_KEY_PARITY=PASS');
NODE

say "3/7 16 TABLE COMPONENTS + DATATABLE USAGE"
python3 <<'PY'
from pathlib import Path

root = Path.home() / "hqnatex" / "frontend" / "src"
targets = {
    "customers": "features/customers/CustomerList.tsx",
    "customer_services": "features/customers/CustomerServiceList.tsx",
    "services": "features/services/ServiceList.tsx",
    "packages": "features/services/PackageList.tsx",
    "sales": "features/sales/SaleList.tsx",
    "invoices": "features/billing/InvoiceList.tsx",
    "payments": "features/billing/PaymentList.tsx",
    "receivables": "features/billing/ReceivableList.tsx",
    "revenue_transactions": "features/revenue/RevenueList.tsx",
    "revenue_allocations": "features/revenue/RevenueAllocationList.tsx",
    "agencies": "features/finance/AgencyList.tsx",
    "partners": "features/partners/PartnerList.tsx",
    "finance_accounts": "features/finance/AccountList.tsx",
    "noc_resources": "features/noc/ResourceList.tsx",
    "users_access": "features/settings/UserList.tsx",
    "branches": "features/finance/BranchList.tsx",
}
missing=[]
not_datatable=[]
for name, rel in targets.items():
    p=root/rel
    if not p.exists():
        print(f"{name:24} MISSING {rel}")
        missing.append(name)
        continue
    text=p.read_text(errors="ignore")
    uses=("DataTable" in text)
    print(f"{name:24} FILE=PASS DATATABLE={'PASS' if uses else 'NO'}")
    if not uses:
        not_datatable.append(name)

print(f"TABLE_FILES={len(targets)-len(missing)}/{len(targets)}")
if missing:
    raise SystemExit("Missing table components: "+",".join(missing))
if not_datatable:
    raise SystemExit("Table components not using DataTable: "+",".join(not_datatable))
print("TABLE_COMPONENTS_DATATABLE=PASS")
PY

say "4/7 DATATABLE CAPABILITY CHECK"
python3 <<'PY'
from pathlib import Path
p=Path.home()/"hqnatex/frontend/src/components/DataTable.tsx"
text=p.read_text(errors="ignore").lower()
checks={
    "search": ["search"],
    "sorting": ["sort"],
    "pagination": ["page"],
    "page_size": ["pagesize","page_size"],
    "loading": ["loading"],
    "empty": ["empty"],
    "error": ["error"],
    "rtl": ["rtl","dir="],
}
bad=[]
for k,alts in checks.items():
    ok=any(a in text for a in alts)
    print(f"{k:12} {'PASS' if ok else 'MISSING'}")
    if not ok: bad.append(k)
if bad:
    raise SystemExit("DataTable missing indicators: "+",".join(bad))
print("DATATABLE_CAPABILITIES=PASS")
PY

say "5/7 HARDCODED VISIBLE STRING HEURISTIC (REPORT ONLY)"
python3 <<'PY'
from pathlib import Path
import re

root=Path.home()/"hqnatex/frontend/src"
skip_parts={"/i18n/","/lib/","/components/KPICard.tsx"}
patterns=[
    re.compile(r'>\s*([A-Za-z][A-Za-z0-9 ,/&()_-]{2,})\s*<'),
    re.compile(r'\b(?:placeholder|title|aria-label)\s*=\s*["\']([^"\']{2,})["\']'),
]
hits=[]
for p in root.rglob("*.tsx"):
    s=str(p)
    if any(x in s for x in skip_parts):
        continue
    text=p.read_text(errors="ignore")
    for lineno,line in enumerate(text.splitlines(),1):
        if "http://" in line or "https://" in line:
            continue
        for pat in patterns:
            for m in pat.finditer(line):
                value=m.group(1).strip()
                if not value or value.startswith(("className","data-")):
                    continue
                hits.append((p.relative_to(root),lineno,value))

print(f"POTENTIAL_HARDCODED_VISIBLE_STRINGS={len(hits)}")
for p,line,value in hits[:200]:
    print(f"{p}:{line}: {value}")
if len(hits)>200:
    print(f"... truncated {len(hits)-200} additional candidates")
print("NOTE=Heuristic only; review candidates, do not treat all as defects.")
PY

say "6/7 DJANGO CHECK / MIGRATION STATE"
cd "$CORE"
source .venv/bin/activate
set -a
source .env.core
set +a
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --check --noinput
echo "DJANGO_STATE=PASS"

say "7/7 RUNTIME SMOKE"
echo "PORTS:"
ss -ltnp | grep -E ':5173|:8002|:55432|:56379' || true

echo
echo "BACKEND_HEALTH:"
curl -sS --max-time 5 http://127.0.0.1:8002/api/v1/health/live || true
echo

echo
echo "FRONTEND_HEAD:"
curl -sSI --max-time 5 http://127.0.0.1:5173 | head -12 || true

say "RESULT"
echo "STATUS=PASS"
echo "FRONTEND_BUILD=PASS"
echo "TRANSLATION_KEY_PARITY=PASS"
echo "TABLE_COMPONENTS_DATATABLE=PASS"
echo "DJANGO_STATE=PASS"
echo "REPORT=$REPORT"
