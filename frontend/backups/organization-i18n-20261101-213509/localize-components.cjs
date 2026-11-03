const fs=require('fs'),ts=require('typescript'),path=require('path');
const dest=fs.readFileSync('backups/current-organization-i18n.txt','utf8').trim();
const maps=JSON.parse(fs.readFileSync(path.join(dest,'translation-map.json'),'utf8'));
for(const [group,name] of [['company','CompanyList'],['branch','BranchList'],['agency','AgencyList']]){
 const file='src/features/finance/'+name+'.tsx';let text=fs.readFileSync(file,'utf8');const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];let count=0;
 function add(n,value){edits.push([n.getStart(source),n.end,value]);count++}
 function walk(n){
 if(ts.isJsxText(n)){const expr=maps[group][n.text.trim().replace(/\s+/g,' ')];if(expr){edits.push([n.pos,n.end,'\n                    {'+expr+'}\n                  ']);count++}}
 if(ts.isStringLiteral(n)&&maps[group][n.text]){const expr=maps[group][n.text],p=n.parent;
 if(ts.isJsxAttribute(p)&&['label','placeholder','aria-label'].includes(p.name.getText(source)))add(n,'{'+expr+'}');
 else if((ts.isPropertyAssignment(p)&&['header','message'].includes(p.name.getText(source)))||ts.isConditionalExpression(p))add(n,expr);
 }
 ts.forEachChild(n,walk)
 }
 walk(source);edits.sort((a,b)=>b[0]-a[0]);for(const [start,end,value] of edits)text=text.slice(0,start)+value+text.slice(end);
 text=text.replace(/value=\{selected\.status\}/g,'value={t.common[selected.status as keyof typeof t.common] || selected.status}');
 fs.writeFileSync(file,text);console.log(name+': '+count+' display strings localized')
}
