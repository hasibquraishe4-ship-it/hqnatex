export type ExportRecord = Record<string, unknown>;
type Labels = { title: string; fields: Record<string, string> };

export function prepareCompanyRecord(record: ExportRecord) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("No company record");
  for (const key of ["code", "legal_name", "status", "is_primary"]) {
    if (!Object.prototype.hasOwnProperty.call(record, key) || record[key] === null || record[key] === undefined || record[key] === "") throw new Error("Incomplete company record");
  }
  if (!Object.prototype.hasOwnProperty.call(record, "trade_name")) throw new Error("Incomplete company record");
  const entries = Object.entries(record).map(([key, value]) => ({
    key,
    value: value === undefined ? "undefined" : value === null ? "null" : typeof value === "object" ? JSON.stringify(value) : value,
  }));
  const name = `${record.code} - ${record.legal_name || record.trade_name}`
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").slice(0, 160);
  if (!entries.length || !name) throw new Error("Empty company export");
  return { entries, name };
}

export async function buildCompanyFile(record: ExportRecord, format: "xlsx" | "pdf", language: string, labels: Labels) {
  const { entries, name } = prepareCompanyRecord(record);
  const rtl = language !== "en";
  if (format === "xlsx") {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Company", { views: [{ rightToLeft: rtl }] });
    sheet.columns = [{ header: "Field", key: "key", width: 28 }, { header: "Label", key: "label", width: 32 }, { header: "Value", key: "value", width: 70 }];
    for (const entry of entries) sheet.addRow({ ...entry, label: labels.fields[entry.key] || entry.key });
    sheet.eachRow(row => { row.alignment = { vertical: "top", wrapText: true, readingOrder: rtl ? "rtl" : "ltr" }; });
    const data = await workbook.xlsx.writeBuffer();
    return { blob: new Blob([new Uint8Array(data)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename: `${name}.xlsx` };
  }
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  pdf.setProperties({ title: String(record.code), subject: JSON.stringify(record) });
  // Browser text shaping handles Persian/Pashto and mixed-direction text. Raster pages
  // avoid embedding or fetching a proprietary font and are intentionally not searchable.
  await document.fonts.ready;
  const canvas = document.createElement("canvas"); canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("PDF rendering unavailable");
  let y = 60, pages = 0;
  const reset = () => { ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#173b59"; ctx.font = "24px Tahoma, Arial, sans-serif"; };
  const flush = () => { if (pages++) pdf.addPage(); pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 595.28, 841.89, undefined, "FAST"); reset(); y = 60; };
  const line = (text: string, direction: "rtl" | "ltr") => {
    if (y > 1680) flush();
    ctx.direction = direction; ctx.textAlign = direction === "rtl" ? "right" : "left";
    ctx.fillText(text, direction === "rtl" ? 1180 : 60, y); y += 36;
  };
  const wrapped = (text: string, direction: "rtl" | "ltr") => {
    // Break long values by grapheme to retain every character without clipping.
    const parts = Array.from(new Intl.Segmenter(language, { granularity: "grapheme" }).segment(text), part => part.segment);
    let current = "";
    for (const char of parts) { if (ctx.measureText(current + char).width > 1120 && current) { line(current, direction); current = ""; } current += char; }
    line(current, direction);
  };
  reset(); wrapped(labels.title, rtl ? "rtl" : "ltr"); y += 20;
  for (const entry of entries) {
    wrapped(`${labels.fields[entry.key] || entry.key} [${entry.key}]`, rtl ? "rtl" : "ltr");
    for (const text of String(entry.value).split(/\r?\n/)) wrapped(text, /[\u0600-\u06ff]/.test(text) ? "rtl" : "ltr");
    y += 16;
  }
  flush();
  return { blob: pdf.output("blob"), filename: `${name}.pdf` };
}

export async function downloadCompanyRecord(record: ExportRecord, format: "xlsx" | "pdf", language: string, labels: Labels) {
  const file = await buildCompanyFile(record, format, language, labels);
  if (!file.blob.size) throw new Error("Empty company export");
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a"); link.href = url; link.download = file.filename;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
