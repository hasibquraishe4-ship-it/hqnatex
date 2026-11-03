const fs=require('fs'),ts=require('typescript'),path=require('path');
const dest=fs.readFileSync('backups/current-shared-design.txt','utf8').trim();
function canonical(file){
const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const result=ts.transform(source,[context=>{const visit=node=>{
if(ts.isJsxAttribute(node)&&node.name.getText(source)==='className')return undefined;
if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==='style')return undefined;
if(ts.isJsxText(node)&&!node.text.trim())return undefined;
if(ts.isPropertySignature(node)&&node.name.getText(source)==='className')return undefined;
return ts.visitEachChild(node,visit,context)};return node=>ts.visitNode(node,visit)}]);
const out=ts.createPrinter({removeComments:true}).printFile(result.transformed[0]);result.dispose();return out;
}
for(const name of ['AppShell.tsx','DataTable.tsx','ModuleHub.tsx','PageHeader.tsx']){
const a=canonical(path.join(dest,'src/components',name)),b=canonical(path.join('src/components',name));
if(a!==b)throw Error(name+': non-presentation change detected');
console.log(name+': handlers, text, direction and permissions unchanged');
}
