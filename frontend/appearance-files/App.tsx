import { WorkspaceModule } from "./features/workspace/WorkspaceModule";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { LoaderCircle, RadioTower, Settings as SettingsIcon } from "lucide-react";
import { AppShell, type Section } from "./components/AppShell";
import { ModuleTabs } from "./components/ModuleTabs";
import {
  fetchers,
  login,
  SESSION_EXPIRED_EVENT,
  SESSION_STORAGE_KEY,
  SESSION_UPDATED_EVENT,
  type Session,
} from "./lib/api";
import { useTranslation } from "./lib/i18n";

import { CallCenterModule } from "./features/callcenter/CallCenterModule";
// Feature Imports
import { Dashboard } from "./features/dashboard/Dashboard";
import type { FinanceTabId } from "./features/finance/FinanceTypes";
import { OrganizationModule } from "./features/finance/OrganizationModule";
import { SecurityModule } from "./features/settings/SecurityModule";
import { SubscribersServicesModule } from "./features/customers/SubscribersServicesModule";

import { PackageList } from "./features/services/PackageList";
import { PaymentList } from "./features/billing/PaymentList";
import { PartnerList } from "./features/partners/PartnerList";
import { AgencyList } from "./features/finance/AgencyList";
import { AccountList } from "./features/finance/AccountList";
import { FinanceAccountingModule } from "./features/finance/FinanceAccountingModule";
import { SaleList } from "./features/sales/SaleList";
import { InvoiceList } from "./features/billing/InvoiceList";
import { ReceivableList } from "./features/billing/ReceivableList";
import { RevenueList } from "./features/revenue/RevenueList";
import { RevenueAllocationList } from "./features/revenue/RevenueAllocationList";
import { ShareRuleList } from "./features/revenue/ShareRuleList";
import { AgencySettlementList } from "./features/revenue/AgencySettlementList";
import { Settings } from "./features/settings/Settings";
import { GlobalBackgroundController } from "./features/settings/GlobalBackgroundController";
import { ResourceList } from "./features/noc/ResourceList";
import { NetworkReadiness } from "./features/network/NetworkReadiness";
import { AuditLogList } from "./features/audit/AuditLogList";
import { SystemStatus } from "./features/system/SystemStatus";

import { WarehouseProcurementModule } from "./features/warehouse/WarehouseProcurementModule";
import { EquipmentAssetsModule } from "./features/equipment/EquipmentAssetsModule";
import { HRPayrollModule } from "./features/hr/HRPayrollModule";
function LoginScreen({ onLoggedIn }: { onLoggedIn: (session: Session) => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("tenant001.admin@example.invalid");
  const [password, setPassword] = useState("");
  const [tenantCode, setTenantCode] = useState("ISP001");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { 
      const session = await login(email, password, tenantCode);
      onLoggedIn(session);
    }
    catch (err) { setError(err instanceof Error ? err.message : t.auth.loginFailed); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 overflow-hidden relative">
      <div className="absolute top-1/4 start-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 end-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <form onSubmit={submit} className="w-full max-w-[440px] glass-panel rounded-[2rem] p-8 lg:p-10 relative z-10 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 p-[1px] mb-6 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
              <RadioTower className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">HQNATEX ERP</h2>
          <p className="mt-2 text-slate-400 font-medium">{t.common.workspace}</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">{t.auth.email}</label>
            <input className="w-full glass-input" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">{t.auth.password}</label>
            <input type="password" className="w-full glass-input" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">{t.auth.tenantCode}</label>
            <input className="w-full glass-input uppercase font-bold text-cyan-400" value={tenantCode} onChange={e=>setTenantCode(e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-medium text-rose-200">
            {error}
          </div>
        )}

        <button disabled={busy} className="mt-8 relative w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 font-bold text-slate-950 transition-all hover:scale-[1.02] active:scale-95">
          {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : t.auth.signIn}
        </button>
      </form>
    </div>
  );
}

function App() {
  const { t } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [financeTab, setFinanceTab] = useState<FinanceTabId>("dashboard");
  const [context, setContext] = useState<any>(null);

  const handleSectionChange = (nextSection: Section, nextFinanceTab?: FinanceTabId) => {
    setSection(nextSection);
    if (nextFinanceTab) {
      setFinanceTab(nextFinanceTab);
    } else if (nextSection === "finance") {
      setFinanceTab("dashboard");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) setSession(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const handleSessionUpdated = (
      event: Event,
    ) => {
      const detail =
        (event as CustomEvent<Session>)
          .detail;

      if (detail) {
        setSession(detail);
      }
    };

    const handleSessionExpired = () => {
      setSession(null);
      setContext(null);
    };

    window.addEventListener(
      SESSION_UPDATED_EVENT,
      handleSessionUpdated,
    );

    window.addEventListener(
      SESSION_EXPIRED_EVENT,
      handleSessionExpired,
    );

    return () => {
      window.removeEventListener(
        SESSION_UPDATED_EVENT,
        handleSessionUpdated,
      );

      window.removeEventListener(
        SESSION_EXPIRED_EVENT,
        handleSessionExpired,
      );
    };
  }, []);

    // Persist session state independently from tenant context.
    useEffect(() => {
      if (session) {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(session),
        );
      } else {
        localStorage.removeItem(
          SESSION_STORAGE_KEY,
        );
        setContext(null);
      }
    }, [session]);

    // Load tenant context once for the active tenant.
    // Updating companyId must not trigger another context request.
    useEffect(() => {
      if (!session?.tenantId) {
        return;
      }

      let cancelled = false;

      fetchers
        .context(session)
        .then((nextContext) => {
          if (!cancelled) {
            setContext(nextContext);
          }
        })
        .catch(console.error);

      return () => {
        cancelled = true;
      };
    }, [session?.tenantId]);

    // Select the primary company after context has loaded.
    useEffect(() => {
      if (
        !session ||
        session.companyId ||
        !context?.companies?.length
      ) {
        return;
      }

      const primary =
        context.companies.find(
          (company: any) =>
            company.is_primary,
        ) ||
        context.companies[0];

      setSession((current) => {
        if (
          !current ||
          current.companyId
        ) {
          return current;
        }

        return {
          ...current,
          companyId: primary.id,
        };
      });
    }, [
      session?.companyId,
      context,
    ]);

  if (!session) return <LoginScreen onLoggedIn={setSession} />;

  const currentCompany = context?.companies?.find((c: any) => c.id === session.companyId);

  const renderContent = () => {
    switch (section) {
      case "dashboard": return <Dashboard session={session} />;
      case "security": return <SecurityModule session={session} />;
      case "organization": return <OrganizationModule session={session} />;
      case "subscribersServices":
      case "customers":
      case "services":
        return <SubscribersServicesModule session={session} />;
        case "packages": return <PackageList session={session} />;
      case "sales": return <SaleList session={session} />;
      case "billing":
          return (
            <ModuleTabs
              tabs={[
                {
                  id: "invoices",
                  label: t.uiTabs.invoices,
                  content: <InvoiceList session={session} />,
                },
                {
                  id: "receivables",
                  label: t.uiTabs.receivables,
                  content: <ReceivableList session={session} />,
                },
              ]}
            />
          );
        case "payments": return <PaymentList session={session} />;
      case "revenue":
          return (
            <ModuleTabs
              tabs={[
                {
                  id: "revenue",
                  label: t.uiTabs.revenue,
                  content: <RevenueList session={session} />,
                },
                {
                  id: "allocations",
                  label: t.uiTabs.allocations,
                  content: <RevenueAllocationList session={session} />,
                },
                {
                  id: "rules",
                  label: t.uiTabs.rules || "Share Rules",
                  content: <ShareRuleList session={session} />,
                },
                {
                  id: "settlements",
                  label: t.uiTabs.settlements,
                  content: <AgencySettlementList session={session} />,
                },
              ]}
            />
          );
        case "agencies": return <AgencyList session={session} />;
        case "partners": return <PartnerList session={session} />;
      case "reports": return <FinanceAccountingModule
          key={`${session.tenantId}:${session.companyId}:reports`}
          session={session}
          initialTab="reports"
          onSectionChange={handleSectionChange}
        />;
      case "finance": return <FinanceAccountingModule
          session={session}
          initialTab={financeTab}
          onSectionChange={handleSectionChange}
        />;
      case "noc": return <ResourceList session={session} />;
      case "bi": return <SystemStatus />;
      case "audit": return <AuditLogList session={session} />;
      case "integrations": return <NetworkReadiness session={session} />;
      case "settings":
        return (
          <Settings
            session={session}
            context={context}
            onCompanyChange={(id) =>
              setSession({
                ...session,
                companyId: id,
              })
            }
          />
        );
      case "documents":
      case "projects": return <WorkspaceModule key={`${session.tenantId}:${session.companyId}`} session={session} />;
      case "callcenter": return <CallCenterModule session={session} />;
      case "hr": return <HRPayrollModule session={session} />;
      case "payroll": return <HRPayrollModule session={session} />;
      case "equipment": return <EquipmentAssetsModule session={session} />;
      case "assets": return <EquipmentAssetsModule session={session} />;
      case "warehouse": return <WarehouseProcurementModule session={session} />;
      default: return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <SettingsIcon className="h-8 w-8 text-slate-600" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t.common.underConstruction}</h2>
          <p className="text-slate-500 font-medium mt-2 max-w-sm">
            {t.common.comingSoon.replace("{section}", t.common[section as keyof typeof t.common] || section)}
          </p>
        </div>
      );
    }
  };

  return (
    <AppShell
      section={section}
      financeTab={financeTab}
      onSectionChange={handleSectionChange}
      tenantName={session.tenantName}
      tenantCode={session.tenantCode}
      companyName={currentCompany?.legal_name}
      onLogout={() => setSession(null)}
    >
      <GlobalBackgroundController session={session} />
      {renderContent()}
    </AppShell>
  );
}

export default App;
