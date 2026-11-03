# Organization records localization

CompanyList, BranchList and AgencyList now use central organizationRecords dictionaries.
English, Dari and Pashto: 69 matching keys per language.
Coverage: titles, columns, action labels, accessibility labels, form labels/placeholders, status labels, create/edit/view dialogs, yes/no, submit/cancel/saving and local validation/success/failure messages.
AST audit: zero remaining literal display text nodes or label/placeholder/aria-label/header/message strings in all three components.
AST verification: event handlers, form bindings and API calls unchanged.
Stored codes/names, IDs, status enum values and backend-provided text are not translated or modified.
Existing RTL/LTR provider preserved. No layout/CSS or workspace/reference changes.
Six authorized source files changed; SHA256 backup and final change manifests saved.
npm run build: PASS, exit 0, TypeScript and Vite, 15.67s.
Warning: chunks exceed 500 kB.
Browser language switching and rendered RTL/LTR not verified; browser runtime remains unavailable in this environment.
