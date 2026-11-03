const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
const backup = fs.readFileSync("backups/current-system-design.txt", "utf8").trim();
const files = [], rows = [], operational = [];
function collect(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, e.name); if (e.isDirectory()) collect(file); else if (file.endsWith(".tsx")) files.push(file); } }
collect("src/features");
for (const file of files) {
  const text = fs.readFileSync(file, "utf8"), source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function add(n, kind, value) { if (/[\p{L}]/u.test(value)) rows.push({ file, line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1, kind, text: value }); }
  function walk(n) {
    if (ts.isJsxText(n) && n.text.trim()) add(n, "text", n.text.trim().replace(/\s+/g, " "));
    if (ts.isStringLiteral(n)) {
      const parent = n.parent;
      if (ts.isJsxAttribute(parent) && ["placeholder", "label", "aria-label", "title"].includes(parent.name.getText(source))) add(n, "attribute", n.text);
      if (ts.isPropertyAssignment(parent) && ["header", "label", "message", "help", "subtitle", "description", "title"].includes(parent.name.getText(source))) add(n, "property", n.text);
      if (/\b(?:\d{1,3}\.){3}\d{1,3}\b|mikrotik|freeradius|password|secret|token/i.test(n.text) && !/className|\.css/.test(n.parent.getText(source).slice(0, 40))) operational.push({ file, line: source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1, value: /password|secret|token/i.test(n.text) ? "[credential-related identifier or UI label; inspect source privately]" : n.text });
    }
    ts.forEachChild(n, walk);
  } walk(source);
}
fs.writeFileSync(path.join(backup, "remaining-visible-copy.json"), JSON.stringify(rows, null, 2));
fs.writeFileSync(path.join(backup, "operational-source-review.json"), JSON.stringify(operational, null, 2));
const distinct = [...new Set(rows.map(r => r.text))];
fs.writeFileSync(path.join(backup, "visible-copy-distinct.json"), JSON.stringify(distinct, null, 2));
console.log(JSON.stringify({ files: files.length, visibleOccurrences: rows.length, distinct: distinct.length, filesWithCopy: [...new Set(rows.map(r => r.file))].length }));
console.log(JSON.stringify(distinct));
