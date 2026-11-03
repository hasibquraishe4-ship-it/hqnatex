from pathlib import Path
import sys
p=Path('src/styles/index.css');s=p.read_text(encoding='utf-8');key=sys.argv[1]
if key=='company':
 s+='''
/* Reference screenshot: separate compact return bar for organization detail pages. */
.hq-shell.hq-shared-shell main .organization-detail-layout { gap:16px!important; }
.hq-shell.hq-shared-shell main .organization-detail-layout > button { display:flex!important;align-items:center;justify-content:flex-end;align-self:stretch!important;width:100%!important;min-height:64px!important;height:auto!important;padding:12px 16px!important;margin:0!important;border:1px solid var(--hq-ui-border)!important;border-radius:var(--hq-ui-radius-lg)!important;background:var(--hq-ui-panel)!important;box-shadow:var(--hq-ui-shadow)!important; }
'''
root=f'.hq-shell.hq-shared-shell main .{key}-page'
s+=f'''
/* Screenshot alignment for {key}: title/create, one tools row, then table. */
{root} {{ display:flex!important;flex-direction:column!important;justify-content:flex-start!important;gap:12px!important;height:auto!important;min-height:0!important;padding:18px!important;background:var(--hq-ui-soft)!important; }}
{root} > :is(.company-page-header,.organization-record-header) {{ display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;justify-content:flex-start!important;align-items:center!important;gap:10px!important;min-height:48px!important;height:auto!important;margin:0!important;padding:0!important; }}
{root} > :is(.company-page-header,.organization-record-header) > div {{ flex:0 1 auto!important;min-width:0; }}
{root} > :is(.company-page-header,.organization-record-header) > button {{ flex:0 0 auto!important;margin:0!important;min-height:44px!important; }}
{root} .hq-data-table {{ display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-items:stretch!important;gap:12px!important;width:100%!important;height:auto!important;min-height:0!important;margin:0!important; }}
{root} .hq-data-table > * {{ margin:0!important; }}
{root} .hq-table-toolbar {{ display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap!important;width:100%!important;height:auto!important;min-height:44px!important;padding:0!important;gap:8px!important; }}
{root} .hq-table-controls {{ display:flex!important;flex-direction:row!important;align-items:center!important;flex-wrap:nowrap!important;gap:8px!important;width:100%!important;min-width:0!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important; }}
{root} .hq-table-controls > form {{ display:block!important;position:relative;flex:1 1 0%!important;width:auto!important;max-width:none!important;min-width:0!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important; }}
{root} .hq-table-controls input {{ width:100%!important;max-width:none!important;min-height:44px!important;height:44px!important;margin:0!important; }}
{root} .hq-table-controls > div {{ flex:0 0 auto!important;width:auto!important;min-width:0!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important; }}
{root} .hq-table-controls > div > button {{ min-width:42px!important;min-height:44px!important; }}
{root} .hq-table-panel {{ display:block!important;width:100%!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;overflow:hidden!important; }}
{root} .hq-table-panel > .overflow-x-auto {{ width:100%!important;max-width:100%!important;min-height:0!important;height:auto!important;overflow-x:auto!important; }}
{root} table {{ width:100%!important;margin:0!important;border-collapse:separate!important;border-spacing:0 4px!important; }}
{root} thead th {{ height:38px!important;padding-block:8px!important;font-size:12px!important;background:var(--hq-ui-header)!important; }}
{root} tbody td {{ height:44px!important;font-size:13px!important;padding-block:8px!important; }}
{root} .hq-table-panel .hq-table-pagination {{ display:flex!important;flex-direction:row!important;justify-content:space-between!important;flex-wrap:wrap!important;gap:12px!important;padding:12px 0 0!important;margin:12px 0 0!important;min-height:0!important;height:auto!important;border:0!important;background:transparent!important; }}
@media(max-width:639px){{
 {root} {{ padding:12px!important; }}
 {root} .hq-table-controls {{ flex-wrap:wrap!important; }}
 {root} .hq-table-controls > form {{ flex-basis:calc(100% - 60px)!important; }}
 {root} table {{ min-width:640px!important; }}
}}
'''
p.write_text(s,encoding='utf-8');print(key+': reference screenshot layout applied (CSS only)')
