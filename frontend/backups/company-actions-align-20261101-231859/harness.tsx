import React from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "../../src/lib/i18n";
import { BranchList } from "../../src/features/finance/BranchList";
import { AgencyList } from "../../src/features/finance/AgencyList";
import { CompanyList } from "../../src/features/finance/CompanyList";
import "../../src/styles/index.css";
const lang = new URL(location.href).searchParams.get("language") || "fa";
localStorage.setItem("hqnatex.erp.lang", lang);
const Component = new URL(location.href).searchParams.get("page") === "branch" ? BranchList : new URL(location.href).searchParams.get("page") === "agency" ? AgencyList : CompanyList;
createRoot(document.getElementById("root")!).render(
<I18nProvider><div className="hq-shell hq-shared-shell" data-theme="light" dir={lang === "en" ? "ltr" : "rtl"}><main style={{padding:24}}><Component session={{access:"fixture",refresh:"fixture",tenantId:"fixture",tenantCode:"fixture",tenantName:"fixture"}} /></main></div></I18nProvider>
);

