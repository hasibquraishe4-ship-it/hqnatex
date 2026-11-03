from pathlib import Path
import sys,json
base=Path.cwd();dest=Path((base/'backups/current-company-real-export.txt').read_text(encoding='utf-8-sig').strip());sys.path.insert(0,str(dest/'qa-python'))
from pypdf import PdfReader
results=[]
for lang in ['fa','ps','en']:
 path=dest/(lang+'-selected.pdf');reader=PdfReader(path);record=json.loads(reader.metadata.subject)
 assert record['code']=='QA001' and record['is_primary'] is False and record['numeric_zero']==0
 assert record['extra_field']=='ONLY_SELECTED_123' and record['nested']['city']=='کابل'
 assert 'DO_NOT_EXPORT_OTHER' not in reader.metadata.subject and 'OTHER_SECRET' not in reader.metadata.subject
 assert len(record)==12
 assert len(reader.pages)>0
 for i,page in enumerate(reader.pages):
  assert len(page.images)>0
  image=page.images[0];(dest/(f'{lang}-pdf-page-{i+1}.png')).write_bytes(image.data)
 results.append({'language':lang,'pages':len(reader.pages),'fields':len(record),'bytes':path.stat().st_size,'selected_company_only':True})
(dest/'pdf-verification.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results))
