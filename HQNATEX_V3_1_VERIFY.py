#!/usr/bin/env python3
import json,os,subprocess,sys
from pathlib import Path
def run(c,cwd,e): return subprocess.run(c,cwd=str(cwd),env=e,text=True,capture_output=True)
def main():
 root=Path.cwd();core=root/'core';app=core/'apps'/'platform_tenancy_v3';e=os.environ.copy();f=core/'.env.core'
 if f.exists():
  for line in f.read_text().splitlines():
   s=line.strip()
   if s and not s.startswith('#') and '=' in s:
    k,v=s.split('=',1);e.setdefault(k.strip(),v.strip().strip('\"').strip("'"))
 py=str(core/'.venv/bin/python')
 req=['models.py','runtime.py','router.py','rls.py','api.py','views.py','management/commands/provision_tenant_database.py','management/commands/migrate_tenant_databases.py','management/commands/backup_tenant_database.py','management/commands/apply_company_rls.py']
 result={'files':{x:(app/x).exists() for x in req},'checks':{}}
 c=run([py,'manage.py','check'],core,e);result['checks']['django_check']=c.returncode==0
 p=run([py,'manage.py','showmigrations','--plan'],core,e);result['checks']['pending_migrations']=sum('[ ]' in x for x in p.stdout.splitlines()) if p.returncode==0 else -1
 result['status']='PASS' if all(result['files'].values()) and result['checks']['django_check'] and result['checks']['pending_migrations']==0 else 'FAIL'
 d=root/'docs';d.mkdir(exist_ok=True);out=d/'HQNATEX_MULTITENANT_V3_1_VERIFY_REPORT.json';out.write_text(json.dumps(result,indent=2));print(json.dumps({'status':result['status'],'report':str(out)},indent=2));sys.exit(0 if result['status']=='PASS' else 1)
if __name__=='__main__': main()
