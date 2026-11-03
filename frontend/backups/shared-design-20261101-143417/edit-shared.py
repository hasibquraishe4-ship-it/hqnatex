from pathlib import Path
import re
base=Path(r'H:\hqnatex\frontend')
p=base/'src/styles/index.css'
s=p.read_text(encoding='utf-8-sig')
tokens='''/* Shared reference tokens. Semantic status colors and text direction stay unchanged. */
:root {
  --hq-ui-bg: #dceef8;
  --hq-ui-surface: #ffffff;
  --hq-ui-soft: #edf8fe;
  --hq-ui-panel: rgba(247, 252, 255, .9);
  --hq-ui-primary: #168bd7;
  --hq-ui-primary-hover: #0877c9;
  --hq-ui-on-primary: #ffffff;
  --hq-ui-text: #173b59;
  --hq-ui-muted: #607b91;
  --hq-ui-border: #c6ddea;
  --hq-ui-header: #d7ebf8;
  --hq-ui-hover: #e3f3fc;
  --hq-ui-shadow: 0 8px 24px rgba(31, 74, 103, .12), inset 0 1px 0 rgba(255, 255, 255, .85);
  --hq-ui-control-shadow: 0 3px 8px rgba(31, 74, 103, .1);
  --hq-ui-modal-shadow: 0 18px 50px rgba(34, 76, 105, .24);
  --hq-ui-radius-sm: 8px;
  --hq-ui-radius: 14px;
  --hq-ui-radius-lg: 20px;
  --hq-ui-space-1: 4px;
  --hq-ui-space-2: 8px;
  --hq-ui-space-3: 12px;
  --hq-ui-space-4: 16px;
  --hq-ui-space-5: 24px;
  --hq-ui-control-height: 40px;
  --hq-ui-row-height: 44px;
}
.hq-shell[data-theme="dark"] {
  --hq-ui-bg: #050914;
  --hq-ui-surface: #0a1a32;
  --hq-ui-soft: #102444;
  --hq-ui-panel: rgba(10, 26, 50, .94);
  --hq-ui-text: #f1f5f9;
  --hq-ui-muted: #94a3b8;
  --hq-ui-border: rgba(110, 160, 210, .24);
  --hq-ui-header: #102444;
  --hq-ui-hover: #153353;
  --hq-ui-shadow: 0 8px 24px rgba(0, 0, 0, .24);
  --hq-ui-control-shadow: 0 3px 8px rgba(0, 0, 0, .2);
  --hq-ui-modal-shadow: 0 18px 50px rgba(0, 0, 0, .45);
}
'''
s=s.replace('@tailwind utilities;','@tailwind utilities;\n\n'+tokens,1)
# Replace the original base token values with aliases; keep semantic status values intact.
start=s.index(':root {',s.index(tokens)+len(tokens))
end=s.index('\n}',start)+2
old=s[start:end]
replacements={'color-scheme: dark':'color-scheme: light','background: #050914':'background: var(--hq-ui-bg)','--bg-primary: #050914':'--bg-primary: var(--hq-ui-bg)','--bg-secondary: #07101f':'--bg-secondary: var(--hq-ui-soft)','--bg-tertiary: #091426':'--bg-tertiary: var(--hq-ui-header)','--surface-glass: rgba(7, 22, 42, 0.78)':'--surface-glass: var(--hq-ui-panel)','--surface-glass-strong: rgba(10, 26, 50, 0.88)':'--surface-glass-strong: var(--hq-ui-surface)','--surface-hover: rgba(16, 36, 68, 0.65)':'--surface-hover: var(--hq-ui-hover)','--border-subtle: rgba(110, 160, 210, 0.18)':'--border-subtle: var(--hq-ui-border)','--text-primary: #f1f5f9':'--text-primary: var(--hq-ui-text)','--text-secondary: #94a3b8':'--text-secondary: var(--hq-ui-muted)','--text-muted: #64748b':'--text-muted: var(--hq-ui-muted)','--radius-sm: 8px':'--radius-sm: var(--hq-ui-radius-sm)','--radius-md: 14px':'--radius-md: var(--hq-ui-radius)','--radius-lg: 18px':'--radius-lg: var(--hq-ui-radius-lg)','--shadow-card: 0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)':'--shadow-card: var(--hq-ui-shadow)','--shadow-modal: 0 25px 70px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1)':'--shadow-modal: var(--hq-ui-modal-shadow)'}
for a,b in replacements.items():
    assert a in old,a
    old=old.replace(a,b)
s=s[:start]+old+s[end:]
start=s.index('/* HQNATEX_REFERENCE_UI_FINAL')
end=s.index('/* HQ PAGE LIGHT COMMAND CENTER */',start)
old=s[start:end]
# Preserve the existing module-specific tile rules exactly; only shared rules are replaced.
kept=[]
for line in old.splitlines():
    if line.startswith('.hq-shell') and ':is(.ws-dashboard-tile,.ws-extra-card)' in line:
        kept.append(line)
# Keep the phone override with its original condition.
mobile_tile=next((x for x in old.splitlines() if 'min-height: 104px' in x),'')
shared='''/* Shared visual primitives: one authority for shell, controls, tables and dialogs.
   Extra specificity is limited to these primitives to supersede legacy important rules. */
:root {
  --hq-bg: var(--hq-ui-bg);
  --hq-surface: var(--hq-ui-panel);
  --hq-surface-strong: var(--hq-ui-surface);
  --hq-border: var(--hq-ui-border);
  --hq-text: var(--hq-ui-text);
  --hq-ink: var(--hq-ui-text);
  --hq-muted: var(--hq-ui-muted);
  --hq-primary: var(--hq-ui-primary);
}
html, body, #root { min-height: 100%; }
html, body { background: var(--hq-ui-bg) !important; color: var(--hq-ui-text); }
.hq-shell.hq-shared-shell {
  background: var(--hq-ui-bg) !important;
  color: var(--hq-ui-text) !important;
  --hq-text: var(--hq-ui-text);
  --hq-ink: var(--hq-ui-text);
  --hq-muted: var(--hq-ui-muted);
  --hq-surface: var(--hq-ui-panel);
  --hq-border: var(--hq-ui-border);
  --text-primary: var(--hq-ui-text);
  --text-secondary: var(--hq-ui-muted);
  --surface-glass: var(--hq-ui-panel);
  --surface-glass-strong: var(--hq-ui-surface);
}
.hq-shell.hq-shared-shell main {
  min-width: 0;
  background: transparent !important;
  color: var(--hq-ui-text) !important;
}
.hq-shell.hq-shared-shell :is(.glass-panel, .glass-card, .topbar-glass, .sidebar-glass, .context-glass, .hq-module-panel) {
  background: var(--hq-ui-panel) !important;
  color: var(--hq-ui-text) !important;
  border: 1px solid var(--hq-ui-border) !important;
  border-radius: var(--hq-ui-radius-lg) !important;
  box-shadow: var(--hq-ui-shadow) !important;
}
.hq-shell.hq-shared-shell aside {
  background: transparent !important;
  color: var(--hq-ui-text);
}
.hq-shell.hq-shared-shell .nav-3d {
  color: var(--hq-ui-muted) !important;
}
.hq-shell.hq-shared-shell .nav-3d:hover {
  background: var(--hq-ui-hover) !important;
}
.hq-shell.hq-shared-shell :is(.topbar-glass, .sidebar-glass, .context-glass, .hq-page-header, .hq-module-hub, .hq-data-table) :is(.text-white, .text-slate-100, .text-slate-200, .text-slate-300) {
  color: var(--hq-ui-text) !important;
}
.hq-shell.hq-shared-shell :is(.text-slate-400, .text-slate-500, .text-slate-600) {
  color: var(--hq-ui-muted) !important;
}
.hq-shell.hq-shared-shell :is(.language-glass-trigger, .language-glass-menu, .language-glass-option, .hq-sidebar-show-control, .hq-sidebar-hide-control) {
  background: var(--hq-ui-panel) !important;
  border-color: var(--hq-ui-border) !important;
  color: var(--hq-ui-text) !important;
  box-shadow: var(--hq-ui-control-shadow) !important;
}
.hq-shell.hq-shared-shell :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), select, textarea, .glass-input) {
  background: var(--hq-ui-soft) !important;
  color: var(--hq-ui-text) !important;
  border: 1px solid var(--hq-ui-border) !important;
  border-radius: var(--hq-ui-radius) !important;
  box-shadow: var(--hq-ui-control-shadow) !important;
  min-width: 0;
}
.hq-shell.hq-shared-shell :is(input, textarea)::placeholder { color: var(--hq-ui-muted) !important; }
.hq-shell.hq-shared-shell select option { background: var(--hq-ui-surface); color: var(--hq-ui-text); }
.hq-shell.hq-shared-shell :is(button, input, select, textarea):focus-visible {
  outline: 2px solid var(--hq-ui-primary);
  outline-offset: 3px;
}
.hq-shell.hq-shared-shell :is(.hq-primary, button.bg-cyan-500, button.bg-blue-600, button[type="submit"]:not(.nav-3d)) {
  background: var(--hq-ui-primary) !important;
  color: var(--hq-ui-on-primary) !important;
  border-color: var(--hq-ui-primary) !important;
  border-radius: var(--hq-ui-radius) !important;
  box-shadow: var(--hq-ui-control-shadow) !important;
}
.hq-shell.hq-shared-shell :is(.hq-primary, button.bg-cyan-500, button.bg-blue-600):hover:not(:disabled) { background: var(--hq-ui-primary-hover) !important; }
.hq-shell.hq-shared-shell button:disabled { cursor: not-allowed; }
.hq-shell.hq-shared-shell :is(.hq-page-header, .module-hub-header) {
  padding: var(--hq-ui-space-4) !important;
  margin-block-end: var(--hq-ui-space-3);
}
.hq-shell.hq-shared-shell .module-hub-card {
  padding: var(--hq-ui-space-4) !important;
  box-shadow: var(--hq-ui-shadow) !important;
}
.hq-shell.hq-shared-shell .module-hub-card:hover:not(:disabled) { background: var(--hq-ui-hover) !important; }
.hq-shell.hq-shared-shell :is(.hq-header-icon, .hq-hub-icon) {
  background: var(--hq-ui-soft) !important;
  color: var(--hq-ui-primary) !important;
  border-color: var(--hq-ui-border) !important;
  box-shadow: none !important;
}
.hq-shell.hq-shared-shell .hq-data-table { min-width: 0; }
.hq-shell.hq-shared-shell .hq-table-toolbar { flex-wrap: wrap; gap: var(--hq-ui-space-3); }
.hq-shell.hq-shared-shell .hq-table-controls { min-width: 0; flex-wrap: wrap; }
.hq-shell.hq-shared-shell .hq-table-controls input { min-height: var(--hq-ui-control-height); }
.hq-shell.hq-shared-shell .hq-data-table table {
  width: 100%;
  background: transparent !important;
  border-collapse: separate;
  border-spacing: 0 var(--hq-ui-space-1);
  color: var(--hq-ui-text) !important;
}
.hq-shell.hq-shared-shell .hq-data-table thead :is(tr, th) {
  background: var(--hq-ui-header) !important;
  color: var(--hq-ui-text) !important;
}
.hq-shell.hq-shared-shell .hq-data-table tbody tr:nth-child(odd) { background: var(--hq-ui-surface) !important; }
.hq-shell.hq-shared-shell .hq-data-table tbody tr:nth-child(even) { background: var(--hq-ui-soft) !important; }
.hq-shell.hq-shared-shell .hq-data-table tbody tr:hover { background: var(--hq-ui-hover) !important; }
.hq-shell.hq-shared-shell .hq-data-table td {
  color: var(--hq-ui-text) !important;
  border-color: var(--hq-ui-border) !important;
  height: var(--hq-ui-row-height);
}
.hq-shell.hq-shared-shell .hq-data-table :is(th, td) { padding: var(--hq-ui-space-3) var(--hq-ui-space-4); }
.hq-shell.hq-shared-shell .hq-data-table td.text-rose-400 { color: var(--danger) !important; }
.hq-shell.hq-shared-shell .hq-data-table td.text-slate-500 { color: var(--hq-ui-muted) !important; }
.hq-shell.hq-shared-shell .hq-data-table .animate-pulse td > div { background: var(--hq-ui-header) !important; }
.hq-shell.hq-shared-shell .hq-table-pagination { border-color: var(--hq-ui-border); background: var(--hq-ui-soft); flex-wrap: wrap; }
.hq-shell.hq-shared-shell .hq-table-pagination > div { flex-wrap: wrap; }
.hq-shell.hq-shared-shell .hq-table-pagination button.bg-cyan-500 { color: var(--hq-ui-on-primary) !important; }
.hq-shell.hq-shared-shell .hq-data-table .custom-scrollbar { scrollbar-color: var(--hq-ui-border) transparent; scrollbar-width: thin; }
.hq-data-table .custom-scrollbar::-webkit-scrollbar { height: 6px; }
.hq-data-table .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.hq-data-table .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--hq-ui-border); border-radius: var(--hq-ui-radius-sm); }
.hq-data-table .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--hq-ui-muted); }
.hq-shell.hq-shared-shell :is(dialog, [role="dialog"], [aria-modal="true"], .modal) {
  background: var(--hq-ui-soft) !important;
  color: var(--hq-ui-text) !important;
  border: 1px solid var(--hq-ui-border) !important;
  border-radius: var(--hq-ui-radius-lg) !important;
  box-shadow: var(--hq-ui-modal-shadow) !important;
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
}
.hq-shell.hq-shared-shell :is(dialog, [role="dialog"], [aria-modal="true"], .modal) :is(h1, h2, h3, label) { color: var(--hq-ui-text) !important; }
.hq-shell.hq-shared-shell .hq-mobile-sidebar { width: min(88vw, 340px); max-width: 100vw; }
@media (max-width: 1023px) {
  .hq-shell.hq-shared-shell .topbar-glass { height: auto !important; min-height: 60px; flex-wrap: wrap; gap: var(--hq-ui-space-2); padding: var(--hq-ui-space-3) !important; }
  .hq-shell.hq-shared-shell .hq-main-scroll { padding-inline: var(--hq-ui-space-3) !important; min-width: 0; }
}
@media (max-width: 639px) {
  .hq-shell.hq-shared-shell .hq-table-controls { width: 100%; }
  .hq-shell.hq-shared-shell .hq-table-controls form { flex: 1; min-width: 0; }
  .hq-shell.hq-shared-shell .hq-table-controls input { width: 100%; }
  .hq-shell.hq-shared-shell .hq-data-table table { min-width: 640px; }
}
'''
shared+='\n'.join(kept)+'\n'
if mobile_tile: shared+='@media (max-width: 639px) {\n'+mobile_tile+'\n}\n'
s=s[:start]+shared+'\n'+s[end:]
p.write_text(s,encoding='utf-8')
# Presentation hooks only; all event handlers, translations, direction and permissions stay intact.
for name,changes in {
'AppShell.tsx': [('className="hq-shell relative','className="hq-shell hq-shared-shell relative'),('w-80 p-3.5 transition-transform','hq-mobile-sidebar w-80 p-3.5 transition-transform')],
'ModuleHub.tsx': [('className="space-y-5 animate-in','className="hq-module-hub space-y-5 animate-in'),('flex h-11 w-11 items-center','hq-hub-icon flex h-11 w-11 items-center')],
'PageHeader.tsx': [('className="glass-panel rounded-','className="hq-page-header glass-panel rounded-'),('className="flex h-11 w-11','className="hq-header-icon flex h-11 w-11')],
'DataTable.tsx': [('  filters?: ReactNode;','  filters?: ReactNode;\n  className?: string;'),('className="glass-panel rounded-3xl p-12','className="hq-data-table glass-panel rounded-3xl p-12'),('`space-y-4 ${className','`hq-data-table space-y-4 ${className'),('className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"','className="hq-table-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-4"'),('className="flex items-center gap-2">\n          {onSearch','className="hq-table-controls flex items-center gap-2">\n          {onSearch'),('className="px-6 py-4 border-t','className="hq-table-pagination px-6 py-4 border-t')]
}.items():
    p=base/'src/components'/name
    s=p.read_text(encoding='utf-8-sig')
    for a,b in changes:
        assert a in s,(name,a)
        s=s.replace(a,b,1)
    if name=='DataTable.tsx':
        s,n=re.subn(r'\n      <style>\{`.*?`\}</style>', '',s,count=1,flags=re.S)
        assert n==1
    p.write_text(s,encoding='utf-8')
print('Updated five shared-layer files; dedicated module files untouched.')
