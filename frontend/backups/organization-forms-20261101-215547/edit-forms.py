from pathlib import Path
import re
for name,key in [('CompanyList','company'),('BranchList','branch'),('AgencyList','agency')]:
 p=Path('src/features/finance')/(name+'.tsx');s=p.read_text(encoding='utf-8')
 s='import { createPortal } from "react-dom";\n'+s
 assert '{modalMode && (' in s;s=s.replace('{modalMode && (','{modalMode && createPortal(',1)
 a='        </div>\n      )}\n    </>'
 assert a in s,name;s=s.replace(a,'        </div>,\n        document.querySelector(".hq-shell") ?? document.body,\n      )}\n    </>',1)
 s=s.replace(f'className="{key}-modal-layer ',f'className="org-dialog-layer {key}-modal-layer ',1)
 if key=='agency':s=s.replace('className="hq-major-form-dialog relative','className="agency-dialog hq-major-form-dialog relative',1)
 s=s.replace(f'className="{key}-dialog ',f'className="org-record-dialog {key}-dialog ',1)
 s=s.replace('className="flex items-center justify-between border-b border-white/10 px-6 py-5"','className="org-dialog-header flex items-center justify-between border-b border-white/10 px-6 py-5"',1)
 body='company-form-body space-y-5 p-6' if key=='company' else 'space-y-5 p-6'
 assert s.count('className="'+body+'"')==2,(name,'body count')
 s=s.replace('className="'+body+'"','className="org-dialog-view '+body+'"',1)
 s=s.replace('className="'+body+'"','className="org-record-form '+body+'"',1)
 match=re.search(r'<form\s+onSubmit=\{\w+\}\s+className="org-record-form [^"]+"\s*>',s);assert match,name
 s=s[:match.end()]+'\n                <div className="org-dialog-scroll">'+s[match.end():]
 footer='                <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">'
 assert footer in s,name;s=s.replace(footer,'                </div>\n                <div className="org-dialog-footer flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">',1)
 p.write_text(s,encoding='utf-8')
p=Path('src/styles/index.css');s=p.read_text(encoding='utf-8');s+='''
/* Organization create/edit/view dialogs: workspace reference geometry, isolated from main transforms. */
.hq-shell.hq-shared-shell > .org-dialog-layer {
  --org-dialog-sidebar:0px;
  position:fixed!important;inset:0!important;z-index:100!important;
  display:flex!important;align-items:center!important;justify-content:center!important;
  width:100%!important;max-width:100vw!important;height:100dvh!important;
  padding-block:12px!important;padding-inline-start:calc(var(--org-dialog-sidebar) + 12px)!important;padding-inline-end:12px!important;
  overflow:hidden!important;box-sizing:border-box;
}
@media(min-width:1024px){.hq-shell.hq-shared-shell[data-sidebar-hidden="false"] > .org-dialog-layer { --org-dialog-sidebar:var(--hq-sidebar-width-compact-lg,236px); }}
@media(min-width:1280px){.hq-shell.hq-shared-shell[data-sidebar-hidden="false"] > .org-dialog-layer { --org-dialog-sidebar:var(--hq-sidebar-width-compact-xl,248px); }}
@media(min-width:1440px){.hq-shell.hq-shared-shell[data-sidebar-hidden="false"] > .org-dialog-layer { --org-dialog-sidebar:var(--hq-sidebar-width-compact-2xl,252px); }}
.hq-shell.hq-shared-shell > .org-dialog-layer > .org-record-dialog {
  position:relative!important;inset:auto!important;display:flex!important;flex-direction:column!important;
  width:100%!important;max-width:none!important;min-width:0!important;
  height:min(88dvh,760px)!important;max-height:calc(100dvh - 24px)!important;min-height:0!important;
  margin:0!important;padding:0!important;overflow:hidden!important;box-sizing:border-box;
  border:1px solid var(--hq-ui-border)!important;border-radius:20px!important;
  color:var(--hq-ui-text)!important;background:var(--hq-ui-soft)!important;box-shadow:var(--hq-ui-modal-shadow)!important;
}
.hq-shell.hq-shared-shell .org-record-dialog > .org-dialog-header {
  display:flex!important;flex:0 0 auto!important;align-items:center!important;justify-content:space-between!important;
  gap:12px!important;padding:18px 24px!important;min-height:76px!important;
  background:var(--hq-ui-panel)!important;border-color:var(--hq-ui-border)!important;
}
.hq-shell.hq-shared-shell .org-dialog-header h3 { color:var(--hq-ui-text)!important;font-size:20px!important;line-height:1.5; }
.hq-shell.hq-shared-shell .org-dialog-header p,
.hq-shell.hq-shared-shell .org-dialog-header > div > div:first-child { display:none!important; }
.hq-shell.hq-shared-shell .org-dialog-header > button { flex:0 0 auto;min-width:44px;min-height:44px;color:var(--hq-ui-text)!important; }
.hq-shell.hq-shared-shell .org-record-dialog > .org-record-form {
  display:flex!important;flex:1 1 0%!important;flex-direction:column!important;min-height:0!important;height:auto!important;max-height:100%!important;
  width:100%!important;margin:0!important;padding:0!important;overflow:hidden!important;background:transparent!important;
}
.hq-shell.hq-shared-shell .org-record-form > .org-dialog-scroll {
  display:block!important;flex:1 1 0%!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;
  overscroll-behavior:contain;padding:24px!important;margin:0!important;
}
.hq-shell.hq-shared-shell .org-dialog-scroll > .grid,
.hq-shell.hq-shared-shell .org-dialog-view > .grid { display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px!important;min-width:0; }
.hq-shell.hq-shared-shell .org-dialog-scroll > :not(:first-child) { margin-block-start:20px; }
.hq-shell.hq-shared-shell .org-dialog-scroll label { display:block;min-width:0; }
.hq-shell.hq-shared-shell .org-dialog-scroll label > span:first-child { color:var(--hq-ui-text)!important;font-size:14px!important;font-weight:700;letter-spacing:normal;text-transform:none;margin-block-end:10px; }
.hq-shell.hq-shared-shell .org-dialog-scroll :is(.company-input,.branch-input,.agency-input) {
  display:block;box-sizing:border-box;width:100%!important;min-width:0!important;height:48px!important;min-height:48px!important;
  padding:10px 14px!important;border:1px solid var(--hq-ui-border)!important;border-radius:14px!important;
  background:var(--hq-ui-soft)!important;color:var(--hq-ui-text)!important;font-family:inherit;font-size:16px!important;line-height:normal!important;
}
.hq-shell.hq-shared-shell .org-dialog-scroll label:has(input[type=checkbox]) { display:flex;gap:12px; }
.hq-shell.hq-shared-shell .org-record-form > .org-dialog-footer {
  display:flex!important;flex:0 0 auto!important;flex-direction:row-reverse!important;justify-content:space-between!important;align-items:center!important;
  gap:12px!important;margin:0!important;padding:16px 24px!important;border-color:var(--hq-ui-border)!important;background:var(--hq-ui-soft)!important;
}
.hq-shell.hq-shared-shell .org-dialog-footer button { min-height:44px!important; }
.hq-shell.hq-shared-shell .org-dialog-footer button[type=submit] { min-width:0!important; }
.hq-shell.hq-shared-shell .org-record-dialog > .org-dialog-view {
  flex:1 1 0%!important;min-height:0!important;height:auto!important;overflow-y:auto!important;padding:24px!important;
}
@media(max-width:639px){
 .hq-shell.hq-shared-shell > .org-dialog-layer { padding:8px!important; }
 .hq-shell.hq-shared-shell > .org-dialog-layer > .org-record-dialog { height:calc(100dvh - 16px)!important;max-height:calc(100dvh - 16px)!important;border-radius:16px!important; }
 .hq-shell.hq-shared-shell .org-dialog-scroll > .grid,
 .hq-shell.hq-shared-shell .org-dialog-view > .grid { grid-template-columns:minmax(0,1fr)!important;gap:16px!important; }
 .hq-shell.hq-shared-shell .org-record-form > .org-dialog-scroll,
 .hq-shell.hq-shared-shell .org-record-dialog > .org-dialog-view { padding:16px!important; }
 .hq-shell.hq-shared-shell .org-record-dialog > .org-dialog-header,
 .hq-shell.hq-shared-shell .org-record-form > .org-dialog-footer { padding:14px 16px!important; }
}
''';p.write_text(s,encoding='utf-8');print('Three localized forms share reference modal layout; handlers/API retained.')
