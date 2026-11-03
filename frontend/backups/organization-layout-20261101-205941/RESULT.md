# Organization layout — result

Order and builds:
1. Organization home: PASS (2m35s).
2. Companies: PASS (16.55s).
3. Branches: PASS (17.67s).
4. Agencies: PASS (20.76s).

All builds: npm run build (tsc -b and Vite), exit 0.
Warning in all builds: chunks larger than 500 kB.

Changed source files:
src\features\finance\AgencyList.tsx
src\features\finance\BranchList.tsx
src\features\finance\CompanyList.tsx
src\features\finance\OrganizationModule.tsx
src\styles\index.css

Backup hashes: backup-SHA256.csv. Changes: changed-files-SHA256.csv.
All workspace source files, including WorkspaceModule and ProjectsModule, unchanged by SHA256.
PostCSS comparison: all CSS outside organization/company/branch/agency scopes unchanged.
TypeScript AST comparison ignoring className/style/formatting: handlers, text, direction, API and permission logic unchanged in all four components.
Organization home uses the reference horizontal card dimensions (82px card, 42px icon, 14px gap; compact mobile variants).
Organization contents preserved: companies, branches, agencies.
Compact record panels, title/tools spacing, primary button style and controlled table scroll added per page.
RTL/LTR logic preserved; logical CSS properties used.
No Backend, translations, API, routes, permissions, migration or database changes.

Visual verification: not performed. Browser control previously fails before attachment with Windows sandbox kernel setup error.
Exact rendered match, laptop/mobile clipping, forms and state interactions remain unverified in browser.
