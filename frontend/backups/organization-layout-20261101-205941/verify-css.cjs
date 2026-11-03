const fs=require('fs'),postcss=require('postcss'),path=require('path');
const dir=fs.readFileSync('backups/current-organization-layout.txt','utf8').trim();
function canon(file){function visit(n){if(n.type==='comment')return null;if(n.type==='rule'&&/organization|company-|branch-|agency-/.test(n.selector))return null;if(n.type==='decl')return [n.type,n.prop,n.value,n.important||false];const children=(n.nodes||[]).map(visit).filter(Boolean);if(n.type==='atrule'&&n.nodes&&!children.length)return null;return [n.type,n.selector||n.name||'',n.params||'',children]};return JSON.stringify(visit(postcss.parse(fs.readFileSync(file,'utf8'))));}
if(canon(path.join(dir,'src/styles/index.css'))!==canon('src/styles/index.css'))throw Error('CSS outside organization scope changed');
console.log('CSS outside organization/company/branch/agency scopes: unchanged');
