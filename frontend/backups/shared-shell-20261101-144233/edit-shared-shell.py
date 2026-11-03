from pathlib import Path
base=Path(r'H:\hqnatex\frontend')
changes={
'AppShell.tsx':[
('className="fixed inset-y-0 start-0','className="hq-desktop-sidebar fixed inset-y-0 start-0'),
('className="lg:ps-[18.5rem]','className="hq-shell-main lg:ps-[18.5rem]'),
('className="flex items-center gap-3 flex-1"','className="hq-topbar-context flex items-center gap-3 flex-1"'),
('className="hidden md:flex items-center gap-3','className="hq-topbar-search hidden md:flex items-center gap-3'),
('className="flex items-center gap-2 lg:gap-3"','className="hq-topbar-controls flex items-center gap-2 lg:gap-3"'),
('className="flex items-center gap-3 ps-2','className="hq-topbar-profile flex items-center gap-3 ps-2'),
('className="context-glass mt-1.5','className="hq-organization-context context-glass mt-1.5')],
'DataTable.tsx':[
('hq-data-table glass-panel rounded-3xl','hq-data-table hq-table-denied glass-panel rounded-3xl'),
('className={`p-2.5 rounded-xl border','className={`hq-table-filter-toggle p-2.5 rounded-xl border'),
('className="p-2.5 rounded-xl bg-white/5','className="hq-table-export-toggle p-2.5 rounded-xl bg-white/5'),
('className={`absolute top-full','className={`hq-table-export-menu absolute top-full'),
('className="glass-panel rounded-2xl p-4','className="hq-table-filters glass-panel rounded-2xl p-4'),
('className="glass-panel rounded-[1.25rem] overflow-hidden','className="hq-table-panel glass-panel rounded-[1.25rem] overflow-hidden'),
('className="animate-pulse"','className="hq-table-loading animate-pulse"'),
('className="px-5 py-12 text-center text-rose-400','className="hq-table-error px-5 py-12 text-center text-rose-400'),
('className="px-5 py-12 text-center text-slate-500','className="hq-table-empty px-5 py-12 text-center text-slate-500')],
'ModuleHub.tsx':[
('className="text-2xl lg:text-3xl','className="hq-hub-title text-2xl lg:text-3xl'),
('className="text-base font-black','className="hq-hub-card-title text-base font-black')],
'PageHeader.tsx':[
('className="flex items-center gap-3.5 relative','className="hq-header-content flex items-center gap-3.5 relative'),
('className="text-xl lg:text-2xl','className="hq-page-title text-xl lg:text-2xl'),
('className="flex items-center gap-2 relative','className="hq-header-actions flex items-center gap-2 relative')]
}
for name,pairs in changes.items():
 p=base/'src/components'/name;s=p.read_text(encoding='utf-8')
 for a,b in pairs:
  assert a in s,(name,a)
  s=s.replace(a,b,1)
 p.write_text(s,encoding='utf-8')
p=base/'src/styles/index.css';s=p.read_text(encoding='utf-8')
s=s.replace('.hq-shell[data-theme="dark"] {\n  --hq-ui-bg:', '.hq-shell[data-theme="dark"] {\n  color-scheme: dark;\n  --hq-ui-bg:',1)
marker='@media (max-width: 1023px) {\n  .hq-shell.hq-shared-shell .topbar-glass'
assert marker in s
rules='''/* Shell and shared component geometry; logical properties preserve RTL/LTR. */
.hq-shell.hq-shared-shell .topbar-glass {
  min-width: 0;
  min-height: 60px !important;
  height: auto !important;
  padding: var(--hq-ui-space-2) var(--hq-ui-space-3) !important;
  gap: var(--hq-ui-space-3) !important;
}
.hq-shell.hq-shared-shell :is(.hq-topbar-context, .hq-topbar-profile, .hq-header-content) { min-width: 0; }
.hq-shell.hq-shared-shell .hq-topbar-context { flex: 1 1 auto; }
.hq-shell.hq-shared-shell .hq-topbar-context > div { min-width: 0; overflow-wrap: anywhere; }
.hq-shell.hq-shared-shell .hq-topbar-search {
  flex: 1 1 18rem;
  min-width: 0;
  background: var(--hq-ui-soft) !important;
  border-color: var(--hq-ui-border) !important;
  border-radius: var(--hq-ui-radius);
  box-shadow: none !important;
}
.hq-shell.hq-shared-shell .hq-topbar-search input {
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}
.hq-shell.hq-shared-shell .hq-topbar-controls { flex-shrink: 0; }
.hq-shell.hq-shared-shell .hq-organization-context { padding: var(--hq-ui-space-2) !important; }
.hq-shell.hq-shared-shell .hq-organization-context p { white-space: normal !important; overflow-wrap: anywhere; }
.hq-shell.hq-shared-shell [data-sidebar-module-scroll] { overflow-y: auto !important; overscroll-behavior: contain; }
.hq-shell.hq-shared-shell .nav-3d[class*="bg-cyan"] {
  color: var(--hq-ui-primary) !important;
  background: var(--hq-ui-hover) !important;
  border-color: var(--hq-ui-border) !important;
  box-shadow: none !important;
}
.hq-shell.hq-shared-shell .hq-mobile-sidebar {
  inset-inline-start: 0 !important;
  inset-inline-end: auto !important;
  min-width: 0 !important;
}
.hq-shell.hq-shared-shell :is(.hq-page-title, .hq-hub-title, .hq-hub-card-title) {
  color: var(--hq-ui-text) !important;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
.hq-shell.hq-shared-shell :is(.hq-page-title, .hq-hub-title) { font-size: 1.25rem !important; }
.hq-shell.hq-shared-shell .hq-header-content > div { min-width: 0; }
.hq-shell.hq-shared-shell .hq-header-actions { flex-wrap: wrap; gap: var(--hq-ui-space-2); }
.hq-shell.hq-shared-shell .hq-module-hub .module-hub-grid { gap: var(--hq-ui-space-3); }
.hq-shell.hq-shared-shell .hq-module-hub .module-hub-card { min-width: 0; gap: var(--hq-ui-space-3); }
.hq-shell.hq-shared-shell :is(.hq-table-filter-toggle, .hq-table-export-toggle, .hq-table-pagination button) {
  border: 1px solid var(--hq-ui-border) !important;
  border-radius: var(--hq-ui-radius-sm) !important;
  background: var(--hq-ui-soft) !important;
  color: var(--hq-ui-muted) !important;
  box-shadow: var(--hq-ui-control-shadow) !important;
  min-height: 36px;
}
.hq-shell.hq-shared-shell :is(.hq-table-filter-toggle, .hq-table-export-toggle, .hq-table-pagination button):hover:not(:disabled) {
  background: var(--hq-ui-hover) !important;
  color: var(--hq-ui-text) !important;
}
.hq-shell.hq-shared-shell .hq-table-filter-toggle[class*="bg-cyan"],
.hq-shell.hq-shared-shell .hq-table-pagination button.bg-cyan-500 {
  background: var(--hq-ui-primary) !important;
  color: var(--hq-ui-on-primary) !important;
  border-color: var(--hq-ui-primary) !important;
}
.hq-shell.hq-shared-shell .hq-table-export-menu { max-width: calc(100vw - 24px); }
.hq-shell.hq-shared-shell .hq-table-panel { padding: var(--hq-ui-space-2) !important; }
.hq-shell.hq-shared-shell .hq-table-filters { padding: var(--hq-ui-space-4) !important; }
.hq-shell.hq-shared-shell .hq-data-table :is(th, td):first-child { border-start-start-radius: var(--hq-ui-radius-sm); border-end-start-radius: var(--hq-ui-radius-sm); }
.hq-shell.hq-shared-shell .hq-data-table :is(th, td):last-child { border-start-end-radius: var(--hq-ui-radius-sm); border-end-end-radius: var(--hq-ui-radius-sm); }
.hq-shell.hq-shared-shell .hq-data-table .hq-table-error { color: var(--danger) !important; overflow-wrap: anywhere; }
.hq-shell.hq-shared-shell .hq-data-table .hq-table-empty { color: var(--hq-ui-muted) !important; }
.hq-shell.hq-shared-shell :is(.hq-table-denied, .hq-table-error, .hq-table-empty) { padding: var(--hq-ui-space-5) !important; }
@media (min-width: 1024px) and (max-width: 1279px) {
  .hq-shell.hq-shared-shell .hq-topbar-search { flex-basis: 10rem; max-width: 15rem; }
  .hq-shell.hq-shared-shell .hq-topbar-controls { gap: var(--hq-ui-space-2); }
}
@media (max-width: 639px) {
  .hq-shell.hq-shared-shell .hq-topbar-controls { gap: var(--hq-ui-space-1); }
  .hq-shell.hq-shared-shell .hq-topbar-profile { padding-inline-start: var(--hq-ui-space-1); }
  .hq-shell.hq-shared-shell .hq-header-actions { width: 100%; }
  .hq-shell.hq-shared-shell .hq-data-table .hq-table-pagination { padding: var(--hq-ui-space-3); gap: var(--hq-ui-space-3); }
}
'''
s=s.replace(marker,rules+'\n'+marker,1);p.write_text(s,encoding='utf-8')
print('Presentation hooks and shared shell/component styling updated in five allowed files.')
