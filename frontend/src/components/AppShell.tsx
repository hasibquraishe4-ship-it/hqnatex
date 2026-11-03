import {
  Boxes, LogOut, Network, ShoppingCart, UsersRound, LayoutDashboard,
  Settings, UserCircle, Menu, X, ChevronRight, ChevronLeft,
  Search, Bell, Moon, Sun, Wallet, Landmark, Globe2,
  Users, FileText, BarChart3,
  ShieldCheck, Share2, Building2, Package, Headphones, Layers,
  ReceiptText, PieChart
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation, type Language } from "../lib/i18n";
import { CANONICAL_MODULE_REGISTRY, type CanonicalModule } from "../config/moduleRegistry";
import type { FinanceTabId } from "../features/finance/FinanceTypes";

export type Section =
  | "dashboard" | "security" | "organization" | "subscribersServices" | "customers" | "services" | "packages" | "sales" 
  | "billing" | "payments" | "revenue" | "agencies" | "partners" 
  | "settlements" | "finance" | "accounting" | "expenses" | "tax" 
  | "warehouse" | "equipment" | "procurement" | "assets" | "noc" 
  | "hr" | "payroll" | "callcenter" | "documents" | "projects" 
  | "reports" | "bi" | "audit" | "integrations" | "settings" | "profile";

type Props = {
  children: ReactNode;
  section: Section;
  onSectionChange: (section: Section, financeTab?: FinanceTabId) => void;
  financeTab?: FinanceTabId;
  tenantName: string;
  tenantCode: string;
  onLogout: () => void;
  companyName?: string;
  companyLogo?: string;
};

const MODULE_ICONS: Record<string, any> = {
  "dashboard": LayoutDashboard,
  "organization": Building2,
  "subscribers-services": UsersRound,
  "sales": ShoppingCart,
  "billing-payments": ReceiptText,
  "revenue-settlements": PieChart,
  "treasury": Wallet,
  "finance-accounting": Landmark,
  "warehouse-procurement": Package,
  "equipment-assets": Layers,
  "network-noc": Network,
  "hr-payroll": Users,
  "call-center": Headphones,
  "documents-projects": FileText,
  "reports-bi": BarChart3,
  "security-audit": ShieldCheck,
  "integrations": Share2,
  "settings": Settings,
  "profile": UserCircle,
};

const FINANCE_CHILD_MODULE_IDS = new Set([
  "billing-payments",
  "revenue-settlements",
  "treasury",
]);

export function AppShell({ 
  children, section, onSectionChange, financeTab,
  tenantName, tenantCode, onLogout, companyName 
}: Props) {
  const { t, language, setLanguage, rtl } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.localStorage.getItem(
        "hqnatex:ui:sidebar-hidden"
      ) === "1"
    );
  });

  const updateSidebarVisibility = (hidden: boolean) => {
    setIsSidebarHidden(hidden);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "hqnatex:ui:sidebar-hidden",
        hidden ? "1" : "0"
      );
    }
  };

  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const scrollingModules = CANONICAL_MODULE_REGISTRY.filter((mod) => mod.id !== "profile");
  const profileModule = CANONICAL_MODULE_REGISTRY.find((mod) => mod.id === "profile");

  const getModuleLabel = (mod: CanonicalModule) => {
    const common = t.common as Record<string, string>;
    if (common[mod.labelKey]) return common[mod.labelKey];
    const dict: Record<string, Record<string, string>> = {
      billingPayments: { en: "Billing & Payments", fa: "صورتحساب و پرداخت‌ها", ps: "بلونه او تادیات" },
      revenueSettlements: { en: "Revenue & Settlements", fa: "عواید و تصفیه‌حساب‌ها", ps: "عواید او تصفیې" },
      treasury: { en: "Cash & Bank", fa: "نقدینگی و بانک", ps: "نغدې او بانک" },
      financeAccounting: { en: "Finance & Accounting", fa: "مالی و حسابداری", ps: "مالي او حسابداري" },
      warehouseProcurement: { en: "Warehouse & Procurement", fa: "گدام و تدارکات", ps: "ګودام او تدارکات" },
      equipmentAssets: { en: "Equipment & Assets", fa: "تجهیزات و دارایی‌ها", ps: "وسایل او شتمنۍ" },
      networkNoc: { en: "Network / NOC", fa: "شبکه / مدیریت شبکه", ps: "شبکه / این‌او‌سي" },
      hrPayroll: { en: "HR & Payroll", fa: "منابع بشری و معاشات", ps: "بشري سرچینې او معاشونه" },
      callCenter: { en: "Call Center", fa: "مرکز تماس", ps: "د اړیکو مرکز" },
      documentsProjects: { en: "Documents & Projects", fa: "اسناد و پروژه‌ها", ps: "اسناد او پروژې" },
      reportsBi: { en: "Reports & BI", fa: "گزارشات و تحلیل", ps: "راپورونه او بي‌ای" },
      securityAudit: { en: "Security & Audit", fa: "امنیت و تفتیش", ps: "امنیت او پلټنه" },
    };
    return dict[mod.labelKey]?.[language] || dict[mod.labelKey]?.en || mod.id;
  };

  const isModuleActive = (mod: CanonicalModule) => {
    if (FINANCE_CHILD_MODULE_IDS.has(mod.id)) {
      return false;
    }

    if (mod.id === "treasury") {
      return section === "finance" && financeTab === "cashBank";
    }
    if (mod.id === "finance-accounting") {
      return (
        section === "finance" ||
        section === "billing" ||
        section === "payments" ||
        section === "revenue" ||
        section === "settlements" ||
        section === "accounting" ||
        section === "expenses" ||
        section === "tax"
      );
    }
    if (mod.id === "profile") {
      return section === "profile";
    }
    return section === mod.target.section || (mod.sections as readonly string[]).includes(section);
  };

  const handleModuleClick = (mod: CanonicalModule, isMobile = false) => {
    if (mod.id === "treasury") {
      onSectionChange("finance", "cashBank");
    } else if (mod.id === "finance-accounting") {
      onSectionChange("finance", "dashboard");
    } else {
      onSectionChange(mod.target.section as Section);
    }
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const activeModule = CANONICAL_MODULE_REGISTRY.find((m) => isModuleActive(m)) || CANONICAL_MODULE_REGISTRY[0];

  const NavItem = ({ mod, isMobile = false }: { mod: CanonicalModule; isMobile?: boolean }) => {
    if (FINANCE_CHILD_MODULE_IDS.has(mod.id)) {
      return null;
    }

    const Icon = MODULE_ICONS[mod.id] || LayoutDashboard;
    const isActive = isModuleActive(mod);

    return (
      <button
        type="button"
        onClick={() => handleModuleClick(mod, isMobile)}
        className={`nav-3d flex w-full h-[20px] min-h-[20px] items-center gap-1.5 rounded-md px-2 py-0 text-start text-[10.5px] leading-none font-semibold transition-all duration-200 group relative ${
          isActive 
            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]" 
            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100 border border-transparent"
        }`}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors ${isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-300"}`} />
        <span className="min-w-0 flex-1 whitespace-nowrap overflow-visible text-clip">{getModuleLabel(mod)}</span>
        
        
        {isActive && (
          <div className={`absolute inset-y-1 w-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.7)] ${rtl ? "-end-1" : "-start-1"}`} />
        )}
      </button>
    );
  };

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      data-theme={isDarkMode ? "dark" : "light"}
      className="hq-shell hq-shared-shell relative min-h-screen overflow-x-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-950 bg-[#050914]"
    
      data-sidebar-hidden={isSidebarHidden ? "true" : "false"}
    >
      {/* Sidebar Desktop */}
      
      {isSidebarHidden && (
        <button
          type="button"
          data-sidebar-visibility-control="show"
          className="hq-sidebar-show-control"
          onClick={() => updateSidebarVisibility(false)}
          aria-label={
            language === "fa"
              ? "نمایش ماژول‌ها"
              : language === "ps"
                ? "ماډیولونه ښکاره کړئ"
                : "Show modules"
          }
          title={
            language === "fa"
              ? "نمایش ماژول‌ها"
              : language === "ps"
                ? "ماډیولونه ښکاره کړئ"
                : "Show modules"
          }
        >
          <Menu className="h-4 w-4" />

          <span>
            {language === "fa"
              ? "نمایش ماژول‌ها"
              : language === "ps"
                ? "ماډیولونه"
                : "Show modules"}
          </span>
        </button>
      )}

<aside className="hq-desktop-sidebar fixed inset-y-0 start-0 z-30 hidden w-[17.5rem] lg:block p-1.5">
        <div className="glass-panel sidebar-glass h-full rounded-[1.75rem] flex flex-col overflow-hidden">
          {/* Brand & Context */}
          <div className="px-2.5 pt-2 pb-1">
            <div className="flex items-center gap-3.5">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-700"></div>
                <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-slate-950 border border-white/10 shadow-lg shadow-black/40">
                  <Boxes className="h-4.5 w-4.5 text-cyan-400" />
                </div>
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-white leading-none">HQNATEX</p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-400/90">{t.common.enterprise || "Enterprise OSS/BSS"}</p>
              </div>
            </div>
            
            <div className="hq-organization-context context-glass mt-1.5 rounded-lg px-2 py-1.5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5 whitespace-nowrap">{tenantCode}</p>
              <p className="text-[11px] leading-4 font-bold text-white relative z-10 whitespace-nowrap">{companyName || tenantName}</p>
            </div>
          </div>

          {/* Canonical 18 Scrolling Modules */}
          <nav className="flex-1 min-h-0 px-1.5 py-0 space-y-0 overflow-y-hidden" aria-label={t.common.primaryNavigation || "Primary navigation"}
                data-sidebar-module-scroll="true">
            <div className="hidden">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 opacity-60">
                {t.common.coreOperations || "Modules"}
              </p>
            </div>
            {scrollingModules.map((mod) => (
              <NavItem key={mod.id} mod={mod} />
            ))}
          </nav>

          {/* Fixed Bottom Profile & Logout */}
          <div className="px-1.5 py-1 mt-auto border-t border-white/5 space-y-0">
            {profileModule && (
              <button
                type="button"
                onClick={() => handleModuleClick(profileModule)}
                className={`flex w-full h-[20px] min-h-[20px] items-center gap-1.5 rounded-md px-2 py-0 text-[10.5px] leading-none font-semibold transition-all duration-200 ${
                  section === "profile" 
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.12)]" 
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <UserCircle className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span className="whitespace-nowrap overflow-visible">{getModuleLabel(profileModule)}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full h-[20px] min-h-[20px] items-center gap-1.5 rounded-md px-2 py-0 text-[10.5px] leading-none font-semibold text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 mt-0.5"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>{t.common.logout || "Logout"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="hq-shell-main lg:ps-[18.5rem] min-h-screen transition-all duration-300 relative z-[1] flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 p-3.5 pb-2">
          <div className="glass-panel topbar-glass rounded-[1.4rem] px-4 h-[4.25rem] flex items-center justify-between gap-4">
            <div className="hq-topbar-context flex items-center gap-3 flex-1">
              <button 
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all"
                aria-label="Open mobile menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              
              <button
                type="button"
                data-sidebar-visibility-control="hide"
                className="hq-sidebar-hide-control hidden lg:inline-flex"
                onClick={() => updateSidebarVisibility(true)}
                aria-label={
                  language === "fa"
                    ? "پنهان کردن ماژول‌ها"
                    : language === "ps"
                      ? "ماډیولونه پټ کړئ"
                      : "Hide modules"
                }
                title={
                  language === "fa"
                    ? "پنهان کردن ماژول‌ها"
                    : language === "ps"
                      ? "ماډیولونه پټ کړئ"
                      : "Hide modules"
                }
              >
                {rtl
                  ? <ChevronRight className="h-4 w-4" />
                  : <ChevronLeft className="h-4 w-4" />
                }

                <span className="hidden 2xl:inline">
                  {language === "fa"
                    ? "پنهان ماژول‌ها"
                    : language === "ps"
                      ? "ماډیولونه پټ"
                      : "Hide modules"}
                </span>
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                <span className="text-slate-400">HQNATEX</span>
                <ChevronRight className={`h-3.5 w-3.5 text-slate-600 ${rtl ? "rotate-180" : ""}`} />
                <span className="text-cyan-400 font-extrabold">{getModuleLabel(activeModule)}</span>
              </div>
            </div>

            {/* Premium Search */}
            <div className="hq-topbar-search hidden md:flex items-center gap-3 bg-slate-900/40 border border-white/10 rounded-xl px-3.5 py-2 w-full max-w-sm group focus-within:border-cyan-500/50 focus-within:bg-slate-900/60 transition-all duration-200">
              <Search className="h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                type="text" 
                placeholder={t.common.search || "Search anything..."}
                className="bg-transparent border-none outline-none text-xs w-full text-slate-200 placeholder:text-slate-500"
              />
            </div>

            {/* Controls */}
            <div className="hq-topbar-controls flex items-center gap-2 lg:gap-3">
              <div className="flex items-center gap-1 sm:gap-2 px-2 py-1 rounded-xl bg-white/5 border border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Toggle theme"
                data-theme-toggle="explicit"
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-0.5"></div>
                <button 
                  type="button"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all relative"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-0.5"></div>
                <div
                  className="language-glass-selector relative"
                  data-language-selector="glass-dropdown"
                >
                  <button
                    type="button"
                    className="language-glass-trigger"
                    onClick={() => setIsLanguageMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={isLanguageMenuOpen}
                    aria-label="Select language"
                  >
                    <Globe2 className="h-4 w-4 shrink-0" />
                    <span className="language-trigger-code">
                      {language.toUpperCase()}
                    </span>
                    <ChevronRight
                      className={`language-trigger-chevron h-3.5 w-3.5 transition-transform ${
                        isLanguageMenuOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {isLanguageMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="language-menu-backdrop"
                        aria-label="Close language menu"
                        onClick={() => setIsLanguageMenuOpen(false)}
                      />

                      <div
                        className="language-glass-menu"
                        role="menu"
                        aria-label="Language"
                      >
                        {(["fa", "ps", "en"] as Language[]).map((lang) => {
                          const label =
                            lang === "fa"
                              ? "دری"
                              : lang === "ps"
                                ? "پښتو"
                                : "English";

                          return (
                            <button
                              key={lang}
                              type="button"
                              role="menuitemradio"
                              aria-checked={language === lang}
                              className={`language-glass-option ${
                                language === lang ? "is-active" : ""
                              }`}
                              onClick={() => {
                                setLanguage(lang);
                                setIsLanguageMenuOpen(false);
                              }}
                            >
                              <span
                                className="language-option-label"
                                dir={lang === "en" ? "ltr" : "rtl"}
                              >
                                {label}
                              </span>

                              <span className="language-option-code">
                                {lang.toUpperCase()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* User Avatar */}
              <div className="hq-topbar-profile flex items-center gap-3 ps-2 sm:ps-3 border-s border-white/10">
                <div className="hidden sm:block text-end">
                  <p className="text-xs font-bold text-white leading-none">{t.common.adminUser || "Admin User"}</p>
                  <p className="text-[10px] text-cyan-400/80 font-semibold mt-1">{t.common.platformManager || "Platform Manager"}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/10">
                  <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-xs">
                    {tenantName.substring(0, 2).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <div className="px-4 pb-8 pt-2 lg:px-6 w-full max-w-[1700px] mx-auto flex-1 overflow-visible hq-main-scroll hq-unified-content" data-ui-section={section}>
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className={`absolute inset-y-0 ${rtl ? "end-0" : "start-0"} hq-mobile-sidebar w-80 p-3.5 transition-transform duration-300`}>
            <div className="glass-panel sidebar-glass h-full rounded-[2rem] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Boxes className="h-6 w-6 text-cyan-400" />
                  <span className="text-xl font-bold text-white">HQNATEX</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto"
                data-sidebar-module-scroll="true">
                {scrollingModules.map((mod) => (
                  <NavItem key={mod.id} mod={mod} isMobile />
                ))}
              </nav>
              <div className="p-4 border-t border-white/5 space-y-1">
                {profileModule && (
                  <button
                    type="button"
                    onClick={() => handleModuleClick(profileModule, true)}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-start text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <UserCircle className="h-5 w-5 text-cyan-400" />
                    <span>{getModuleLabel(profileModule)}</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={onLogout} 
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-start text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  <span>{t.common.logout || "Logout"}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.2); }
      `}</style>
    </div>
  );
}
