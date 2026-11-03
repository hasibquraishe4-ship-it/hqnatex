from pathlib import Path
p=Path('src/components/DataTable.tsx');s=p.read_text(encoding='utf-8')
a='  className?: string;\n};\n\nexport function DataTable';b='  className?: string;\n  exportPlacement?: "toolbar" | "row";\n};\n\nexport function DataTable';assert a in s;s=s.replace(a,b,1)
s=s.replace('emptyMessage, error, noPermission, filters, className\n','emptyMessage, error, noPermission, filters, className, exportPlacement = "toolbar"\n',1)
start=s.index('          <div className="relative group/export">');end=s.index('\n          </div>',start)+len('\n          </div>')
menu=s[start:end];s=s[:start]+'          {exportPlacement === "toolbar" && exportMenu}'+s[end:]
marker='  if (noPermission) {';assert marker in s
s=s.replace(marker,'  const exportMenu = (\n'+menu+'\n  );\n\n'+marker,1)
s=s.replace('{actions(row)}','{exportPlacement === "row" && <div className="hq-row-export">{exportMenu}</div>}\n                          {actions(row)}',1)
p.write_text(s,encoding='utf-8')
for name in ['CompanyList','BranchList','AgencyList']:
 p=Path('src/features/finance')/(name+'.tsx');s=p.read_text(encoding='utf-8');assert '<DataTable\n' in s;s=s.replace('<DataTable\n','<DataTable\n          exportPlacement="row"\n',1);p.write_text(s,encoding='utf-8')
p=Path('src/styles/index.css');s=p.read_text(encoding='utf-8');marker='/* Organization records: export at the bottom inline end, away from the search row. */';assert marker in s;s=s[:s.index(marker)]+'''
/* Row download is a normal action next to edit/view, never a floating toolbar item. */
.hq-shell.hq-shared-shell :is(.company-page,.branch-page,.agency-page) .hq-row-export {
  display:inline-flex;align-items:center;flex:0 0 auto;position:relative;
}
.hq-shell.hq-shared-shell :is(.company-page,.branch-page,.agency-page) .hq-row-export .hq-table-export-toggle {
  display:inline-flex;align-items:center;justify-content:center;
  width:36px!important;height:36px!important;min-height:36px!important;padding:8px!important;
}
.hq-shell.hq-shared-shell :is(.company-page,.branch-page,.agency-page) .hq-row-export .hq-table-export-menu {
  top:auto!important;bottom:calc(100% + 4px)!important;margin:0!important;
}
''';p.write_text(s,encoding='utf-8');print('Download moved into each row action group beside edit/view in all three pages.')
