const {chromium}=require('./qa/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const ExcelJS=require(path.resolve('node_modules/exceljs'));
(async()=>{
 const dir=__dirname,relative='/backups/'+path.basename(dir)+'/harness.tsx';
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const fixture={id:'company-A',tenant:'tenant-one',code:'QA001',legal_name:'شرکت آزمایشی پښتو ښایسته',trade_name:'نام تجاری آزمایشی',status:'active',is_primary:false,created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T01:00:00Z',extra_field:'ONLY_SELECTED_123',nested:{city:'کابل',enabled:false},numeric_zero:0};
 const other={...fixture,id:'company-B',code:'QA002',legal_name:'DO_NOT_EXPORT_OTHER_567',extra_field:'OTHER_SECRET_789'};
 const results=[];
 for(const [lang,width] of [['fa',1366],['ps',1366],['en',1366],['fa',390],['en',390]]){
  console.log('TEST',lang,width); const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>route.request().method()==='GET'&&route.request().url().includes('/api/v1/companies/')?route.fulfill({json:{count:2,next:null,previous:null,results:[fixture,other]}}):route.abort());
  await page.route('http://127.0.0.1:5273/?**',route=>route.fulfill({contentType:'text/html',body:'<html><head><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;</script></head><body><div id="root"></div><script type="module" src="'+relative+'"></script></body></html>'}));
  await page.goto('http://127.0.0.1:5273/?language='+lang);try { await page.getByText(fixture.legal_name,{exact:true}).waitFor({timeout:60000}); } catch(e) { await page.screenshot({path:path.join(dir,'harness-failure.png'),fullPage:true}); fs.writeFileSync(path.join(dir,'harness-failure.txt'),JSON.stringify({errors,html:await page.content()})); console.log(errors); throw e; }
  const row=page.locator('tbody tr').filter({hasText:fixture.code});assert.equal(await row.locator('.hq-row-export').count(),1);assert.equal(await page.locator('.hq-table-controls .hq-table-export-toggle').count(),0);
  const exportButton=row.locator('.hq-table-export-toggle');const pen=row.locator('button').filter({has:page.locator('svg.lucide-pencil')});const eye=row.locator('button').filter({has:page.locator('svg.lucide-eye')});
  const boxes=await Promise.all([exportButton.boundingBox(),pen.boundingBox(),eye.boundingBox()]);for(const b of boxes){assert(Math.abs(b.width-40)<1);assert(Math.abs(b.height-42)<1);assert(Math.abs(b.y-boxes[0].y)<1)}
  if(lang==='en')assert(boxes[0].x>boxes[1].x&&boxes[1].x>boxes[2].x);else assert(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,'page overflow');
  await exportButton.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`company-${lang}-${width}.png`),fullPage:true});
  if(true){
   await exportButton.click();const menu=row.locator('.hq-table-export-menu');const dl1=page.waitForEvent('download',{timeout:120000});await menu.locator('button').nth(0).click();const xlsx=await dl1;const xlsxPath=path.join(dir,`${lang}-selected.xlsx`);await xlsx.saveAs(xlsxPath);assert(xlsx.suggestedFilename().endsWith('.xlsx'));const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(xlsxPath);const rows=wb.worksheets[0].getSheetValues();const values=new Map(rows.filter(Boolean).slice(1).map(r=>[r[1],r[3]]));assert.equal(values.size,Object.keys(fixture).length);for(const [k,v] of Object.entries(fixture))assert.deepStrictEqual(values.get(k),typeof v==='object'?JSON.stringify(v):v);assert(!JSON.stringify(rows).includes('DO_NOT_EXPORT_OTHER'));assert(!JSON.stringify(rows).includes('OTHER_SECRET'));
   console.log('PDF import diagnostic', await page.evaluate(async()=>{try {const m=await import('/src/features/finance/companyExport.ts'); const f=await m.buildCompanyFile({code:'TEST',legal_name:'Test',trade_name:'',status:'active',is_primary:false},'pdf','fa',{title:'Test',fields:{}}); return {size:f.blob.size};} catch(e){return String(e?.stack||e)}})); await exportButton.click();const dl2=page.waitForEvent('download',{timeout:120000});await menu.locator('button').nth(1).click();const pdf=await dl2;const pdfPath=path.join(dir,`${lang}-selected.pdf`);await pdf.saveAs(pdfPath);const bytes=fs.readFileSync(pdfPath);assert(bytes.subarray(0,5).toString()==='%PDF-');assert(bytes.length>1000);assert(pdf.suggestedFilename().endsWith('.pdf'));
   // Capture the exact text passed to the PDF canvas and verify complete selected record only.
   const rendered=await page.evaluate(async({fixture,lang})=>{const mod=await import('/src/features/finance/companyExport.ts');const seen=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){seen.push(text);return original.call(this,text,...args)};try{await mod.buildCompanyFile(fixture,'pdf',lang,{title:'Company',fields:{}})}finally{CanvasRenderingContext2D.prototype.fillText=original}return seen.join('\n')},{fixture,lang});for(const key of Object.keys(fixture))assert(rendered.includes('['+key+']'));for(const v of Object.values(fixture))assert(rendered.includes(typeof v==='object'?JSON.stringify(v):String(v)));assert(!rendered.includes('OTHER_SECRET'));
  }
  const invalidRejected=await page.evaluate(async()=>{const m=await import('/src/features/finance/companyExport.ts');for(const record of [null,{}, {code:'X',legal_name:'X',status:'active',is_primary:false}]){try{m.prepareCompanyRecord(record);return false}catch{}}return true});assert(invalidRejected);assert.deepStrictEqual(errors,[]);results.push({lang,width,buttons:boxes,overflow,errors});await context.close();
 }
 await browser.close();fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify(results,null,2));console.log('PASS: RTL/LTR/mobile buttons; row-specific XLSX/PDF downloads; complete selected-record values and no other record.');
})().catch(e=>{console.error(e);process.exit(1)});




