from pathlib import Path
import sys
base=Path(r'H:\hqnatex\frontend'); stage=sys.argv[1];css=base/'src/styles/index.css';s=css.read_text(encoding='utf-8')
if stage=='organization':
 p=base/'src/features/finance/OrganizationModule.tsx';v=p.read_text(encoding='utf-8');v=v.replace('className="space-y-5"','className="organization-detail-layout space-y-5"',1);p.write_text(v,encoding='utf-8')
 start=s.index('/* ORGANIZATION PAGE PROJECT-STYLE */');end=s.index('/* Projects reference:',start)
 s=s[:start]+s[end:]
 s+='''
/* Organization home: scoped counterpart of the workspace menu, never targeting workspace. */
.hq-shell.hq-shared-shell .organization-page { min-width:0; }
.hq-shell.hq-shared-shell .organization-page .hq-module-hub { display:flex;flex-direction:column;gap:12px; }
.hq-shell.hq-shared-shell .organization-page .hq-module-hub > * { margin-block:0!important; }
.hq-shell.hq-shared-shell .organization-page .module-hub-header { min-height:54px!important;padding:12px 16px!important;border-radius:var(--hq-ui-radius-lg)!important; }
.hq-shell.hq-shared-shell .organization-page .module-hub-header h2 { font-size:20px!important;line-height:1.5; }
.hq-shell.hq-shared-shell .organization-page .module-hub-grid { display:grid;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important; }
.hq-shell.hq-shared-shell .organization-page .module-hub-card { display:flex!important;flex-direction:row;align-items:center;justify-content:flex-start;min-height:82px!important;min-width:0;padding:16px!important;gap:12px;border-radius:18px!important;text-align:start; }
.hq-shell.hq-shared-shell .organization-page .module-hub-card > div:first-child { flex:0 0 auto; }
.hq-shell.hq-shared-shell .organization-page .module-hub-card > div:last-child { flex:1;min-width:0; }
.hq-shell.hq-shared-shell .organization-page .hq-hub-icon { width:42px;height:42px;border-radius:13px; }
.hq-shell.hq-shared-shell .organization-page .hq-hub-card-title { font-size:15px;line-height:1.5; }
.hq-shell.hq-shared-shell .organization-detail-layout { display:flex;flex-direction:column;gap:12px;min-width:0; }
.hq-shell.hq-shared-shell .organization-detail-layout > * { margin-block:0!important; }
.hq-shell.hq-shared-shell .organization-detail-layout > button { align-self:flex-start;background:var(--hq-ui-soft)!important;color:var(--hq-ui-text)!important;border-color:var(--hq-ui-border)!important;box-shadow:var(--hq-ui-control-shadow); }
@media(max-width:639px){
 .hq-shell.hq-shared-shell .organization-page .module-hub-grid { grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important; }
 .hq-shell.hq-shared-shell .organization-page .module-hub-card { min-height:70px!important;padding:12px!important; }
 .hq-shell.hq-shared-shell .organization-page .hq-hub-icon { width:36px;height:36px; }
 .hq-shell.hq-shared-shell .organization-page .hq-hub-card-title { font-size:14px; }
}
@media(max-width:360px){.hq-shell.hq-shared-shell .organization-page .module-hub-grid { grid-template-columns:minmax(0,1fr)!important; }}
'''
else:
 names={'companies':('CompanyList.tsx','company'),'branches':('BranchList.tsx','branch'),'agencies':('AgencyList.tsx','agency')}
 filename,key=names[stage];p=base/'src/features/finance'/filename;v=p.read_text(encoding='utf-8')
 if key=='company':
  v=v.replace('className="company-page space-y-3','className="organization-record-page company-page space-y-3',1)
 else:
  assert 'className="space-y-6 animate-in' in v
  v=v.replace('className="space-y-6 animate-in',f'className="organization-record-page {key}-page space-y-6 animate-in',1)
  v=v.replace('className="flex flex-wrap items-center justify-between gap-4"',f'className="organization-record-header flex flex-wrap items-center justify-between gap-4"',1)
  v=v.replace('<DataTable\n',f'<DataTable\n          className="organization-record-table {key}-table"\n',1)
  v=v.replace('className="fixed inset-0 z-[100]',f'className="{key}-modal-layer fixed inset-0 z-[100]',1)
  v=v.replace('className="relative w-full max-w-2xl',f'className="{key}-dialog relative w-full max-w-2xl',1)
 p.write_text(v,encoding='utf-8')
 root=f'.hq-shell.hq-shared-shell .{key}-page'
 s+=f'''
/* {stage}: organization-only compact records panel. */
{root} {{ display:flex;flex-direction:column;gap:12px!important;min-width:0;padding:16px;border:1px solid var(--hq-ui-border);border-radius:var(--hq-ui-radius-lg);background:var(--hq-ui-panel);color:var(--hq-ui-text);box-shadow:var(--hq-ui-shadow); }}
{root} > * {{ margin-block:0!important; }}
{root} > :is(.organization-record-header,.company-page-header) {{ height:auto!important;min-height:48px;gap:12px; }}
{root} h2 {{ font-size:20px!important;line-height:1.5; }}
{root} .hq-data-table {{ min-width:0;display:flex;flex-direction:column;gap:12px; }}
{root} .hq-data-table > * {{ margin-block:0!important; }}
{root} .hq-table-controls {{ flex-wrap:wrap;gap:8px; }}
{root} .overflow-x-auto {{ max-width:100%;overscroll-behavior-inline:contain; }}
{root} :is(th,td) {{ padding-block:8px!important; }}
{root} button.bg-cyan-500 {{ background:var(--hq-ui-primary)!important;color:var(--hq-ui-on-primary)!important;border-radius:var(--hq-ui-radius)!important;box-shadow:var(--hq-ui-control-shadow)!important; }}
@media(max-width:639px){{
 {root} {{ padding:12px; }}
 {root} .hq-table-toolbar {{ height:auto!important; }}
 {root} .hq-table-controls {{ width:100%; }}
 {root} table {{ min-width:640px; }}
}}
'''
 if key!='company':
  s+=f'''
.hq-shell.hq-shared-shell .{key}-dialog {{ background:var(--hq-ui-soft)!important;color:var(--hq-ui-text)!important;border:1px solid var(--hq-ui-border);border-radius:var(--hq-ui-radius-lg);box-shadow:var(--hq-ui-modal-shadow)!important;max-height:calc(100dvh - 24px);overflow-y:auto; }}
.hq-shell.hq-shared-shell .{key}-dialog :is(.text-white,.text-slate-100) {{ color:var(--hq-ui-text)!important; }}
'''
css.write_text(s,encoding='utf-8');print(stage+': presentation-only update complete')
