const fs = require("fs"), path = require("path"), ts = require("typescript");
const locales = ["en", "fa", "ps"], roots = {}, catalogs = {}, files = [], results = [];
function literal(n) {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isNumericLiteral(n)) return +n.text;
  if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) return literal(n.expression);
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(literal);
  if (ts.isObjectLiteralExpression(n)) return Object.fromEntries(n.properties.map(p => { if (!ts.isPropertyAssignment(p)) throw Error(); return [p.name.text, literal(p.initializer)]; }));
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (n.kind === ts.SyntaxKind.NullKeyword) return null;
  throw Error("not literal");
}
for (const lang of locales) {
  const file = `src/i18n/${lang}.ts`, text = fs.readFileSync(file, "utf8"), source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  let prop;
  function find(n) { if (ts.isPropertyAssignment(n) && n.name.getText(source) === "featureCopy") prop = n; else ts.forEachChild(n, find); } find(source);
  roots[lang] = { file, text, source, prop }; catalogs[lang] = literal(prop.initializer);
}
function collect(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, e.name); if (e.isDirectory()) collect(file); else if (file.endsWith(".tsx")) files.push(file); } } collect("src/features");
for (const file of files) {
  let text = fs.readFileSync(file, "utf8"), source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), edits = [], count = 0;
  const id = file.replace(/^src[\\/]features[\\/]/, "").replace(/\.tsx$/, "").replace(/[^a-zA-Z0-9_]/g, "_");
  function walk(n) {
    if (ts.isObjectLiteralExpression(n)) {
      let object; try { object = literal(n); } catch {}
      if (object && Object.keys(object).length === 3 && locales.every(lang => object[lang] && typeof object[lang] === "object")) {
        const key = "local" + count++;
        for (const lang of locales) { catalogs[lang][id] ||= {}; catalogs[lang][id][key] = object[lang]; }
        edits.push([n.getStart(source), n.end, `{${locales.map(lang => `${lang}:getUiTranslation(${JSON.stringify(lang)}).featureCopy.${id}.${key}`).join(",")}}`]); return;
      }
    }
    ts.forEachChild(n, walk);
  } walk(source);
  if (!edits.length) continue;
  edits.sort((a, b) => b[0] - a[0]); for (const [a,b,value] of edits) text = text.slice(0,a) + value + text.slice(b);
  if (!text.includes("getTranslation as getUiTranslation")) { let relative=path.relative(path.dirname(file),"src/i18n").replaceAll("\\","/"); if (!relative.startsWith(".")) relative="./"+relative; text=`import { getTranslation as getUiTranslation } from ${JSON.stringify(relative)};\n`+text; }
  fs.writeFileSync(file,text);results.push({file, count});
}
for (const lang of locales) { const {file,text,source,prop}=roots[lang]; fs.writeFileSync(file,text.slice(0,prop.initializer.getStart(source))+JSON.stringify(catalogs[lang],null,2)+text.slice(prop.initializer.end)); }
const backup=fs.readFileSync("backups/current-system-design.txt","utf8").trim(); fs.writeFileSync(path.join(backup,"nested-copy-migration.json"),JSON.stringify(results,null,2)); console.log(JSON.stringify(results));
