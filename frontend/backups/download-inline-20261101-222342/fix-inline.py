from pathlib import Path
p=Path('src/components/DataTable.tsx');s=p.read_text(encoding='utf-8')
a='''<div className={`flex ${rtl ? 'justify-start' : 'justify-end'} gap-2`}>
                          {exportPlacement === "row" && <div className="hq-row-export">{exportMenu}</div>}
                          {actions(row)}'''
b='''<div className={`${exportPlacement === "row" ? "hq-row-actions" : ""} flex ${rtl ? 'justify-start' : 'justify-end'} gap-2`}>
                          {actions(row)}
                          {exportPlacement === "row" && <div className="hq-row-export">{exportMenu}</div>}'''
assert a in s;s=s.replace(a,b,1);p.write_text(s,encoding='utf-8')
p=Path('src/styles/index.css');s=p.read_text(encoding='utf-8');s+='''
/* Keep export directly beside edit/view in the marked action group. */
.hq-shell.hq-shared-shell :is(.company-page,.branch-page,.agency-page) .hq-row-actions {
  display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;
}
.hq-shell.hq-shared-shell :is(.company-page,.branch-page,.agency-page) .hq-row-actions > div {
  display:inline-flex!important;flex-direction:row!important;align-items:center!important;gap:8px!important;
  flex:0 0 auto!important;width:auto!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;
}
.hq-shell.hq-shared-shell :is(.company-page,.branch-page,.agency-page) .hq-row-actions .hq-row-export,
.hq-shell.hq-shared-shell :is(.company-page,.branch-page,.agency-page) .hq-row-actions .group\\/export {
  position:relative!important;inset:auto!important;transform:none!important;align-self:center!important;
}
''';p.write_text(s,encoding='utf-8')
