import React from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "../../src/lib/i18n";
import { CompanyList } from "../../src/features/finance/CompanyList";
import "../../src/styles/index.css";
const lang = new URL(location.href).searchParams.get("language") || "fa";
localStorage.setItem("hqnatex.erp.lang", lang);
createRoot(document.getElementById("root")!).render(
<I18nProvider><div className="hq-shell hq-shared-shell" data-theme="light" dir={lang === "en" ? "ltr" : "rtl"}><main style={{padding:24}}><CompanyList session={{access:"fixture",refresh:"fixture",tenantId:"fixture",tenantCode:"fixture",tenantName:"fixture"}} /></main></div></I18nProvider>
);
