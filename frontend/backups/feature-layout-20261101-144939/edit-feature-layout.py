from pathlib import Path
import re
base=Path(r'H:\hqnatex\frontend')
project=base/'src/features/workspace/ProjectsModule.tsx'
company=base/'src/features/finance/CompanyList.tsx'
css=base/'src/styles/index.css'
p=project.read_text(encoding='utf-8');c=company.read_text(encoding='utf-8');s=css.read_text(encoding='utf-8')
m=re.search(r'    <style>\{`(.*?)`\}</style>\n',p,re.S);assert m
project_css=m.group(1)
p=p[:m.start()]+p[m.end():]
# Retain reference geometry and all responsive/select fixes; only visual constants become tokens.
for a,b in {'#183a54':'var(--hq-ui-text)','#294e69':'var(--hq-ui-text)','#526c80':'var(--hq-ui-muted)','#e7f4ff':'var(--hq-ui-text)','#edf7ff':'var(--hq-ui-text)','#d4e8f7':'var(--hq-ui-text)','#abc7dc':'var(--hq-ui-muted)','#12334d':'var(--hq-ui-surface)','#eff8ff':'var(--hq-ui-soft)','#ffffff88':'var(--hq-ui-border)','#91bddb66':'var(--hq-ui-border)','#91bddb88':'var(--hq-ui-border)','#91bddb44':'var(--hq-ui-border)','#167deb':'var(--hq-ui-primary)','rgba(235,247,255,.72)':'var(--hq-ui-panel)','rgba(255,255,255,.5)':'var(--hq-ui-soft)','rgba(255,255,255,.48)':'var(--hq-ui-soft)','rgba(13,39,61,.82)':'var(--hq-ui-panel)','#163c5988':'var(--hq-ui-soft)','0 12px 40px #072c4b18':'var(--hq-ui-shadow)'}.items():project_css=project_css.replace(a,b)
project_css=project_css.replace('padding:20px','padding:var(--hq-ui-space-4)').replace('margin-bottom:16px','margin-bottom:var(--hq-ui-space-3)').replace('gap:18px','gap:var(--hq-ui-space-4)').replace('border-radius:20px','border-radius:var(--hq-ui-radius-lg)').replace('border-radius:10px','border-radius:var(--hq-ui-radius)')
m=re.search(r'          <style>\{`(.*?)`\}</style>\n',c,re.S);assert m
c=c[:m.start()]+c[m.end():]
for a,b in [('className="flex flex-wrap items-center justify-between gap-4"','className="company-page-header flex flex-wrap items-center justify-between gap-4"'),('className="fixed inset-0 z-[100]','className="company-modal-layer fixed inset-0 z-[100]'),('className="hq-major-form-dialog relative','className="company-dialog hq-major-form-dialog relative'),('className="space-y-5 p-6"','className="company-form-body space-y-5 p-6"')]:
 assert a in c,a
 c=c.replace(a,b)
start=s.index('/* COMPACT COMPANY PAGE */');end=s.index('/* ORGANIZATION PAGE PROJECT-STYLE */',start)
s=s[:start]+s[end:]
start=s.index('/* ORGANIZATION COMPACT TABLE */')
s=s[:start]
s+='\n/* Projects reference: extracted from ProjectsModule, using shared tokens. */\n'+project_css+'\n'
s+='''/* Projects and companies: compact page-specific layout. */
.hq-shell.hq-shared-shell .wp-projects { min-width: 0; background: transparent; }
.hq-shell.hq-shared-shell .wp-projects .wp-card { padding: var(--hq-ui-space-4); }
.hq-shell.hq-shared-shell .wp-projects .wp-bar { gap: var(--hq-ui-space-2); margin-block-end: var(--hq-ui-space-3); }
.hq-shell.hq-shared-shell .wp-projects .wp-bar:last-child { margin-block-end: 0; }
.hq-shell.hq-shared-shell .wp-projects .wp-primary { background: var(--hq-ui-primary) !important; color: var(--hq-ui-on-primary) !important; }
.hq-shell.hq-shared-shell .wp-projects table { background: transparent; border-collapse: separate; border-spacing: 0 var(--hq-ui-space-1); }
.hq-shell.hq-shared-shell .wp-projects th { background: var(--hq-ui-header); }
.hq-shell.hq-shared-shell .wp-projects tbody tr:nth-child(odd) { background: var(--hq-ui-surface); }
.hq-shell.hq-shared-shell .wp-projects tbody tr:nth-child(even) { background: var(--hq-ui-soft); }
.hq-shell.hq-shared-shell .wp-projects :is(th, td) { padding: var(--hq-ui-space-3); border-color: var(--hq-ui-border); }
.hq-shell.hq-shared-shell .wp-projects .overflow-x-auto { max-width: 100%; overscroll-behavior-inline: contain; }
.hq-shell.hq-shared-shell .company-page { display: flex; flex-direction: column; gap: var(--hq-ui-space-3); min-width: 0; }
.hq-shell.hq-shared-shell .company-page > * { margin-block: 0 !important; }
.hq-shell.hq-shared-shell .company-page-header { min-height: 48px; gap: var(--hq-ui-space-3); }
.hq-shell.hq-shared-shell .company-page-header h2 { font-size: 1.25rem; color: var(--hq-ui-text) !important; }
.hq-shell.hq-shared-shell .company-project-table { min-width: 0; display: flex; flex-direction: column; gap: var(--hq-ui-space-3); }
.hq-shell.hq-shared-shell .company-project-table > * { margin-block: 0 !important; }
.hq-shell.hq-shared-shell .company-project-table .hq-table-toolbar { min-height: 44px; }
.hq-shell.hq-shared-shell .company-project-table .hq-table-controls { margin-inline-start: auto; }
.hq-shell.hq-shared-shell .company-project-table :is(th, td) { padding-block: var(--hq-ui-space-2); }
.hq-shell.hq-shared-shell .company-project-table .overflow-x-auto { max-width: 100%; overscroll-behavior-inline: contain; }
.hq-shell.hq-shared-shell .company-modal-layer { padding: var(--hq-ui-space-3); overflow-y: auto; }
.hq-shell.hq-shared-shell .company-dialog {
  background: var(--hq-ui-soft) !important; color: var(--hq-ui-text) !important;
  border: 1px solid var(--hq-ui-border); border-radius: var(--hq-ui-radius-lg);
  box-shadow: var(--hq-ui-modal-shadow) !important;
  width: min(960px, 100%); max-width: 100%; height: auto !important;
  min-height: 0; max-height: calc(100dvh - 24px) !important; overflow: auto !important;
}
.hq-shell.hq-shared-shell .company-dialog .company-form-body { padding: var(--hq-ui-space-4); min-height: 0 !important; height: auto !important; overflow: visible !important; }
.hq-shell.hq-shared-shell .company-dialog :is(.text-white, .text-slate-100, label) { color: var(--hq-ui-text) !important; }
.hq-shell.hq-shared-shell .company-dialog .company-input { width: 100%; min-width: 0; min-height: var(--hq-ui-control-height); padding: var(--hq-ui-space-3); border-radius: var(--hq-ui-radius); font: inherit; }
.hq-shell.hq-shared-shell .company-dialog .company-input::placeholder { color: var(--hq-ui-muted); }
@media (max-width: 639px) {
  .hq-shell.hq-shared-shell .company-project-table .hq-table-controls { margin-inline-start: 0; }
  .hq-shell.hq-shared-shell .company-page-header { height: auto; }
  .hq-shell.hq-shared-shell .company-dialog { max-height: calc(100dvh - 24px) !important; }
}
'''
project.write_text(p,encoding='utf-8');company.write_text(c,encoding='utf-8');css.write_text(s,encoding='utf-8')
print('Updated exactly the three allowed source files; no handlers or text edited.')
