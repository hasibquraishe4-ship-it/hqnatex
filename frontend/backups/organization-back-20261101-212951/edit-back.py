from pathlib import Path
for name,old,new in [('fa','بازگشت به سازمان','بازگشت'),('ps','سازمان ته ستنېدل','بېرته'),('en','Back to Organization','Back')]:
 p=Path('src/i18n')/(name+'.ts');s=p.read_text(encoding='utf-8');a='back: "'+old+'"';assert s.count(a)==1;s=s.replace(a,'back: "'+new+'"',1);p.write_text(s,encoding='utf-8')
p=Path('src/styles/index.css');s=p.read_text(encoding='utf-8')
a='.hq-shell.hq-shared-shell main .organization-detail-layout > button { display:flex!important;align-items:center;justify-content:flex-end;align-self:stretch!important;width:100%!important;min-height:64px!important;height:auto!important;padding:12px 16px!important;'
b='.hq-shell.hq-shared-shell main .organization-detail-layout > button { display:inline-flex!important;align-items:center;justify-content:center;align-self:flex-start!important;width:auto!important;min-height:40px!important;height:auto!important;padding:10px 16px!important;'
assert s.count(a)==1;s=s.replace(a,b,1);p.write_text(s,encoding='utf-8')
print('Shared back button: compact 3D; fa/ps/en labels shortened.')
