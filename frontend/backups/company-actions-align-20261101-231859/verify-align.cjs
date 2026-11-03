const fs=require('fs'),path=require('path'),assert=require('assert');
const root=fs.readFileSync('backups/current-company-real-export.txt','utf8').trim();const {chromium}=require(path.join(root,'qa/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[];
for(const pageName of ['company','branch','agency'])for(const [lang,width] of [['fa',1366],['en',1366],['fa',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const record={id:'one',code:'QAALIGN',name:'Record One',legal_name:'Record One',trade_name:'Record One',company:'one',branch:'one',status:'active',is_primary:true};
 await page.route('**/api/**',r=>r.request().method()==='GET'?r.fulfill({json:{count:1,results:[record],next:null,previous:null}}):r.abort());
 const preamble='<script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;</script>';
 await page.route('http://127.0.0.1:5273/?**',r=>r.fulfill({contentType:'text/html',body:'<html><head>'+preamble+'</head><body><div id="root"></div><script type="module" src="/backups/'+path.basename(__dirname)+'/harness.tsx"></script></body></html>'}));
 await page.goto('http://127.0.0.1:5273/?language='+lang+'&page='+pageName);const row=page.locator('tbody tr').filter({hasText:'QAALIGN'});await row.waitFor();const cell=row.locator('td').last();const buttons=cell.locator('button:not(.hq-table-export-menu button)');assert.equal(await buttons.count(),3);await buttons.first().scrollIntoViewIfNeeded();const boxes=await buttons.evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));const td=await cell.boundingBox();for(const b of boxes){assert.equal(b.width,40);assert.equal(b.height,42);assert(Math.abs(b.y-boxes[0].y)<1)}const min=Math.min(...boxes.map(b=>b.x)),max=Math.max(...boxes.map(b=>b.x+b.width));assert(min>=td.x&&max<=td.x+td.width);await page.screenshot({path:path.join(__dirname,'current-'+pageName+'.png'),fullPage:true});if(width===1366){if(lang==='fa')assert(min-td.x<20);else assert(td.x+td.width-max<20)}assert.deepStrictEqual(errors,[]);await page.screenshot({path:path.join(__dirname,pageName+'-'+lang+'-'+width+'.png'),fullPage:true});results.push({pageName,lang,width,buttons:boxes,cell:td});await context.close();
}
await browser.close();fs.writeFileSync(path.join(__dirname,'alignment-results.json'),JSON.stringify(results,null,2));console.log('PASS: all three pages; RTL/LTR desktop and RTL mobile; three 40x42 aligned buttons within action cell.');})().catch(e=>{console.error(e);process.exit(1)});



