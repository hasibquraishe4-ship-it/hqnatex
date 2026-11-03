const fs = require("node:fs"), path = require("node:path"), ts = require("typescript"), crypto = require("node:crypto");
const root = process.cwd(), backup = fs.readFileSync("backups/current-system-design.txt", "utf8").trim();
const locales = ["en", "fa", "ps"], catalog = { en: {}, fa: {}, ps: {} }, phrases = { en: {}, fa: {}, ps: {} };
const files = [], results = [];
function collect(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  const file = path.join(dir, e.name); if (e.isDirectory()) collect(file); else if (file.endsWith(".tsx")) files.push(file);
} }
collect(path.join(root, "src/features"));
function value(n) {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (n.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) return value(n.expression);
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(value);
  if (ts.isObjectLiteralExpression(n)) return Object.fromEntries(n.properties.map(p => {
    if (!ts.isPropertyAssignment(p)) throw Error("Non-literal dictionary");
    return [p.name.text, value(p.initializer)];
  }));
  throw Error("Non-literal dictionary");
}
function idFor(english, salt) { return english.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 48) + "_" + crypto.createHash("sha1").update(salt).digest("hex").slice(0, 7); }
for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fileId = path.relative(path.join(root, "src/features"), file).replace(/\.tsx$/, "").replace(/[^a-zA-Z0-9_]/g, "_");
  const edits = [], removed = [], changes = [];
  let languageVariable;
  function findLanguage(n) {
    if (ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(source) === "useTranslation") {
      const binding = n.name.elements.find(e => (e.propertyName?.getText(source) || e.name.getText(source)) === "language");
      if (binding) languageVariable = binding.name.getText(source);
    }
    ts.forEachChild(n, findLanguage);
  } findLanguage(source);
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      let data; try { data = value(declaration.initializer); } catch { continue; }
      if (!data || Array.isArray(data) || typeof data !== "object") continue;
      const name = declaration.name.text;
      if (locales.every(lang => data[lang] && typeof data[lang] === "object") && Object.keys(data).every(k => locales.includes(k))) {
        for (const lang of locales) { catalog[lang][fileId] ||= {}; catalog[lang][fileId][name] = data[lang]; }
        edits.push([declaration.initializer.getStart(source), declaration.initializer.end, `{ ${locales.map(lang => `${lang}: getUiTranslation(${JSON.stringify(lang)}).featureCopy.${fileId}.${name}`).join(", ")} }`]);
        removed.push([declaration.initializer.pos, declaration.initializer.end]); changes.push(name);
      } else if (Object.values(data).length && Object.values(data).every(v => Array.isArray(v) && v.length === 3 && v.every(x => typeof x === "string"))) {
        for (const [i, lang] of locales.entries()) { catalog[lang][fileId] ||= {}; catalog[lang][fileId][name] = Object.fromEntries(Object.entries(data).map(([k, triple]) => [k, triple[i]])); }
        edits.push([declaration.initializer.getStart(source), declaration.initializer.end, `{ ${Object.keys(data).map(key => `${JSON.stringify(key)}: [${locales.map(lang => `getUiTranslation(${JSON.stringify(lang)}).featureCopy.${fileId}.${name}[${JSON.stringify(key)}]`).join(", ")}]`).join(", ")} }`]);
        removed.push([declaration.initializer.pos, declaration.initializer.end]); changes.push(name);
      }
    }
  }
  function walk(n) {
    if (removed.some(([a, b]) => n.pos >= a && n.end <= b)) return;
    if (languageVariable && ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "tr") {
      const args = n.arguments.length === 1 && ts.isArrayLiteralExpression(n.arguments[0]) ? n.arguments[0].elements : n.arguments;
      if (args.length === 3 && args.every(ts.isStringLiteral)) {
        const triple = args.map(a => a.text), id = idFor(triple[0], triple.join("\0"));
        locales.forEach((lang, i) => phrases[lang][id] = triple[i]);
        edits.push([n.getStart(source), n.end, `getUiTranslation(${languageVariable}).systemPhrases.${id}`]); changes.push("phrase"); return;
      }
    }
    ts.forEachChild(n, walk);
  } walk(source);
  if (!edits.length) continue;
  edits.sort((a, b) => b[0] - a[0]);
  for (const [a, b, replacement] of edits) text = text.slice(0, a) + replacement + text.slice(b);
  let relative = path.relative(path.dirname(file), path.join(root, "src/i18n")).replaceAll("\\", "/");
  if (!relative.startsWith(".")) relative = "./" + relative;
  text = `import { getTranslation as getUiTranslation } from ${JSON.stringify(relative)};\n` + text;
  fs.writeFileSync(file, text); results.push({ file: path.relative(root, file), dictionaries: changes.filter(c => c !== "phrase"), phrases: changes.filter(c => c === "phrase").length });
}
for (const lang of locales) {
  const file = path.join(root, "src/i18n", lang + ".ts"); let text = fs.readFileSync(file, "utf8");
  const marker = `export const ${lang} = {`;
  if (!text.includes(marker)) throw Error("Missing catalog export");
  text = text.replace(marker, marker + "\n  featureCopy: " + JSON.stringify(catalog[lang], null, 2) + ",\n  systemPhrases: " + JSON.stringify(phrases[lang], null, 2) + ",");
  fs.writeFileSync(file, text);
}
fs.writeFileSync(path.join(backup, "translation-migration.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ files: results.length, localDictionaries: results.reduce((n, r) => n + r.dictionaries.length, 0), centralPhrases: Object.keys(phrases.en).length }));
