# Company row export — final result

Changed files:
- src/features/finance/CompanyList.tsx
- src/components/DataTable.tsx
- src/features/finance/companyExport.ts (new)
- package.json
- package-lock.json

Build: PASS, npm run build, TypeScript + Vite, exit 0, 29.29s.
Warning: JavaScript chunks larger than 500 kB. Export libraries are dynamically imported.

Scope:
Company-specific action CSS only; three buttons are exactly 40 x 42 px with 8 px gaps.
RTL physical order: download, edit, view; LTR mirrors this order.
One export trigger per row; no company toolbar export duplicate.
DataTable receives an optional onExportRow callback; all other callers retain their existing behavior.
No new API endpoint/request; existing list row object is exported with all own fields.
No translation, route, permission, general stylesheet, workspace or database changes.
Compared existing source baseline: only CompanyList and DataTable differ; companyExport is the new helper.

Output:
Actual XLSX from ExcelJS; typed false and zero values retained; nested fields serialized as JSON.
Actual compressed PDF from jsPDF; browser-shaped Persian/Pashto text rendered to page images.
PDF is intentionally image-based, not searchable text. Full selected-record JSON is also retained in PDF subject metadata for verification.
Filenames derive from company code and legal name; invalid filename characters removed.
Missing/incomplete records reject before download; component shows existing localized company error message.

Verification:
Browser plugin unavailable; previous CUA runtime fails before connection. Used Playwright with installed Chrome in an isolated browser context.
Origin http://127.0.0.1:5273/; actual CompanyList/DataTable and CSS mounted with I18nProvider.
All API calls intercepted with synthetic companies; no business writes or real credentials.
Desktop 1366x900: fa, ps, en; mobile 390x900: fa, en.
Each tested viewport/language downloaded both formats through the actual row menu.
XLSX reopened with ExcelJS: all 12 selected-record fields matched, including extras/nested data/false/zero; second-company sentinel absent.
PDF files reopened with pypdf: valid pages/images and exact selected-record metadata, 12 fields, second-company sentinel absent.
Canvas text capture checked every field key and value for the PDF, no other-company values.
PDF page images extracted and Persian page visually inspected; mobile screenshot inspected after horizontal table scroll.
Invalid record cases rejected; zero framework/page errors.
This verifies the real components and downloadable files with fixture data, not a logged-in production company/session.

Artifacts:
browser-results.json; pdf-verification.json; screenshots company-*.png; fa/ps/en-selected.xlsx and .pdf; build-final.log; before/after SHA256.

Dependencies and remaining risks:
No Excel/PDF library previously existed. Added exceljs 4.4.0 and jspdf 4.2.1.
npm audit reports 12 issues (10 moderate, 2 high), including ExcelJS transitive dependencies and existing Vite/source-map-js findings; no broad audit fix applied. Full npm-audit.json saved.
Server initially crashed on Windows EBUSY while watching downloaded test files. Restarted Vite with an auxiliary backup config that only ignores backups in file watching; original API/proxy config inherited unchanged.
Current dev server on 5273 returns the normal app; fixture interception exists only inside the test browser.
