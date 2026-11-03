/* AST-only presentation migration. Never edits API calls, payloads or event handlers. */
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
const root = process.cwd();
const backup = fs.readFileSync("backups/current-system-design.txt", "utf8").trim();
const files = [];
function collect(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
  const file = path.join(dir, item.name);
  if (item.isDirectory()) collect(file); else if (file.endsWith(".tsx")) files.push(file);
} }
collect(path.join(root, "src/features"));
const report = [];
for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [], imports = new Map(), counts = {};
  const addImport = (name, from, alias = name) => imports.set(alias, { name, from, alias });
  const count = name => counts[name] = (counts[name] || 0) + 1;
  function attr(open, name) { return open.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === name); }
  function literal(open, name) { const a = attr(open, name); return a?.initializer && ts.isStringLiteral(a.initializer) ? a.initializer.text : ""; }
  function tags(element, tag, extra = "") {
    const open = ts.isJsxElement(element) ? element.openingElement : element;
    edits.push([open.tagName.getStart(source), open.tagName.end, tag]);
    if (extra) edits.push([open.tagName.end, open.tagName.end, extra]);
    if (ts.isJsxElement(element)) edits.push([element.closingElement.tagName.getStart(source), element.closingElement.tagName.end, tag]);
  }
  function jsxTags(node) { const out = new Set(); function walk(n) {
    if (ts.isJsxElement(n)) out.add(n.openingElement.tagName.getText(source));
    else if (ts.isJsxSelfClosingElement(n)) out.add(n.tagName.getText(source));
    ts.forEachChild(n, walk);
  } walk(node); return out; }
  function walk(node) {
    if (ts.isFunctionDeclaration(node) && ["Field", "Detail"].includes(node.name?.text)) {
      const binding = node.parameters[0]?.name;
      const keys = binding && ts.isObjectBindingPattern(binding) ? binding.elements.map(e => e.name.getText(source)) : [];
      const allowed = node.name.text === "Field" ? ["label", "required", "children", "span", "className", "hint", "error"] : ["label", "value", "mono"];
      if (keys.length && keys.includes("label") && keys.every(k => allowed.includes(k))) {
        addImport(node.name.text === "Field" ? "FormField" : "DetailField", "Interface", node.name.text);
        edits.push([node.getStart(source), node.end, ""]); count(node.name.text); return;
      }
    }
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const open = ts.isJsxElement(node) ? node.openingElement : node;
      const name = open.tagName.getText(source), cls = literal(open, "className");
      if (name === "table") {
        addImport("DataTable", "DataTable", "SharedDataTable"); tags(node, "SharedDataTable", " native"); count("table");
      } else if (!attr(open, "ref")) {
        if (name === "select") { addImport("Select", "Interface", "SharedSelect"); tags(node, "SharedSelect"); count("select"); }
        else if (name === "input" && literal(open, "type") === "date") {
          addImport("DatePicker", "Interface", "SharedDatePicker"); tags(node, "SharedDatePicker"); count("date");
        } else if (name === "button" && !/rose|red-|amber|danger/.test(cls)) {
          const primary = /bg-cyan-500\b|bg-blue-600\b|wp-primary\b/.test(cls);
          const component = primary ? "PrimaryButton" : "SecondaryButton";
          addImport(component, "Interface", "Shared" + component);
          tags(node, "Shared" + component, attr(open, "type") ? "" : ' type="submit"'); count("button");
        } else if (name === "div" && /hq-major-form-dialog|(?:relative w-full max-w[^ ]* overflow-hidden rounded)|modal-panel|dialog-panel/.test(cls)) {
          addImport("Modal", "Modal", "SharedModal"); tags(node, "SharedModal", " native"); count("modal");
        } else if (["div", "header", "section", "form"].includes(name) && ts.isJsxElement(node)) {
          const inside = jsxTags(node);
          if (["div", "header", "section"].includes(name) && (inside.has("h1") || inside.has("h2")) && !inside.has("table") && !inside.has("form") && /flex.*items-center.*justify-between/.test(cls)) {
            addImport("PageHeader", "PageHeader", "SharedPageHeader"); tags(node, "SharedPageHeader", ` native as="${name}"`); count("header");
          } else if (["div", "form"].includes(name) && inside.has("input") && !inside.has("textarea") && !inside.has("table") && !inside.has("h1") && !inside.has("h2") && /flex|bar|filter|search/.test(cls) && (name === "form" || inside.has("select"))) {
            addImport("FilterBar", "Interface", "SharedFilterBar"); tags(node, "SharedFilterBar", ` as="${name}"`); count("filter");
          } else if (name === "div" && /pagination|picker-pages/.test(cls)) {
            addImport("Pagination", "Interface", "SharedPagination"); tags(node, "SharedPagination"); count("pagination");
          }
        }
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  if (!edits.length) continue;
  // Descending offsets keep source text, comments and handlers byte-for-byte intact.
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  for (const [start, end, replacement] of edits) text = text.slice(0, start) + replacement + text.slice(end);
  const groups = new Map();
  for (const item of imports.values()) {
    const list = groups.get(item.from) || [];
    list.push(item.name === item.alias ? item.name : `${item.name} as ${item.alias}`); groups.set(item.from, list);
  }
  const prefix = [...groups].map(([module, names]) => {
    let relative = path.relative(path.dirname(file), path.join(root, "src/components", module)).replaceAll("\\", "/");
    if (!relative.startsWith(".")) relative = "./" + relative;
    return `import { ${names.join(", ")} } from ${JSON.stringify(relative)};`;
  }).join("\n");
  fs.writeFileSync(file, prefix + "\n" + text);
  report.push({ file: path.relative(root, file), ...counts });
}
fs.writeFileSync(path.join(backup, "shared-component-migration.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ files: report.length, totals: report.reduce((all, row) => {
  for (const [key, value] of Object.entries(row)) if (typeof value === "number") all[key] = (all[key] || 0) + value;
  return all;
}, {}) }));
