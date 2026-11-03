from pathlib import Path
p=Path('src/features/finance/CompanyList.tsx');s=p.read_text(encoding='utf-8')
a='className="company-project-table"';assert s.count(a)==1;s=s.replace(a,'className="company-project-table company-inline-actions"',1)
marker='    </>\n  );';assert s.count(marker)==1
css='''      <style>{`
        /* Company list only: the existing download remains a single row action. */
        .hq-shell.hq-shared-shell .company-page .company-inline-actions td > div:has(> .hq-row-export) {
          display:inline-flex!important;flex-direction:row!important;flex-wrap:nowrap!important;
          align-items:center!important;justify-content:flex-start!important;gap:8px!important;
          width:max-content!important;max-width:none!important;min-height:36px!important;
          margin:0!important;padding:0!important;position:static!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions td > div:has(> .hq-row-export) > div:not(.hq-row-export) {
          order:1!important;display:inline-flex!important;flex-direction:row!important;flex-wrap:nowrap!important;
          align-items:center!important;gap:8px!important;margin:0!important;padding:0!important;flex:0 0 auto!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions .hq-row-export {
          order:2!important;display:inline-flex!important;align-items:center!important;align-self:center!important;
          flex:0 0 auto!important;position:relative!important;inset:auto!important;
          transform:none!important;width:auto!important;height:36px!important;min-height:0!important;margin:0!important;padding:0!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions .hq-row-export > div {
          display:inline-flex!important;align-items:center!important;position:relative!important;
          inset:auto!important;transform:none!important;margin:0!important;padding:0!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions td button:not(.hq-table-export-menu button) {
          display:inline-flex!important;align-items:center!important;justify-content:center!important;
          box-sizing:border-box;width:36px!important;height:36px!important;min-height:36px!important;
          padding:8px!important;border-radius:8px!important;margin:0!important;
          border:1px solid var(--hq-ui-border)!important;background:var(--hq-ui-soft)!important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 3px 0 rgba(15,50,75,.22),0 6px 12px rgba(15,50,75,.14)!important;
        }
        .hq-shell.hq-shared-shell .company-page .company-inline-actions td button:not(.hq-table-export-menu button):hover {
          background:var(--hq-ui-hover)!important;
        }
      `}</style>
'''
s=s.replace(marker,css+marker,1);p.write_text(s,encoding='utf-8')
print('Only CompanyList.tsx changed; existing export instance retained inside row actions.')
