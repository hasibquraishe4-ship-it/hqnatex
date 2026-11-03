import { useState } from "react";
import { ArrowLeft, ClipboardList, History, Package, RadioTower, Users } from "lucide-react";

import {
  ModuleHub,
  type ModuleHubCard,
} from "../../components/ModuleHub";

import { CustomerList } from "./CustomerList";
import { CustomerServiceList } from "./CustomerServiceList";
import { CustomerTechnicalValueList } from "./CustomerTechnicalValueList";
import { ServiceChangeRequestList } from "./ServiceChangeRequestList";
import { ServiceStatusHistoryList } from "./ServiceStatusHistoryList";
import { ServicePackageHistoryList } from "./ServicePackageHistoryList";
import type { Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type CustomerView =
  | "hub"
  | "customers"
  | "customer-services"
  | "technical-data"
  | "change-requests"
  | "status-history"
  | "package-history";

export function CustomerModule({ session }: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<CustomerView>("hub");

  const cards: ModuleHubCard[] = [
    {
      id: "customers",
      title: t.uiTabs.customers,
      description: t.customers.subtitle,
      icon: Users,
    },
    {
      id: "customer-services",
      title: t.uiTabs.customerServices,
      icon: RadioTower,
    },
    {
      id: "technical-data",
      title: t.customersServicesUi.customerTechnicalData,
      description: t.customersServicesUi.customerTechnicalDataDesc,
      icon: RadioTower,
    },
    {
      id: "change-requests",
      title: t.customersServicesUi.serviceChangeRequests,
      description: t.customersServicesUi.serviceChangeRequestsDesc,
      icon: ClipboardList,
    },
    {
      id: "status-history",
      title: t.customersServicesUi.serviceStatusHistory,
      description: t.customersServicesUi.serviceStatusHistoryDesc,
      icon: History,
    },
    {
      id: "package-history",
      title: t.customersServicesUi.servicePackageHistory,
      description: t.customersServicesUi.servicePackageHistoryDesc,
      icon: Package,
    },
  ];

  if (view === "hub") {
    return (
      <ModuleHub
        title={t.customers.title}
        subtitle={t.customers.subtitle}
        cards={cards}
        onOpen={(id) => setView(id as CustomerView)}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button
        type="button"
        onClick={() => setView("hub")}
        className="
          inline-flex items-center gap-2
          rounded-xl
          border border-white/10
          bg-white/5
          px-4 py-2
          text-xs font-bold
          text-slate-400
          transition-all
          hover:border-cyan-400/20
          hover:bg-cyan-400/5
          hover:text-cyan-400
        "
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t.customers.title}
      </button>

      {view === "customers" && (
        <CustomerList session={session} />
      )}

      {view === "customer-services" && (
        <CustomerServiceList session={session} />
      )}

      {view === "technical-data" && (
        <CustomerTechnicalValueList session={session} />
      )}

      {view === "change-requests" && (
        <ServiceChangeRequestList session={session} />
      )}

      {view === "status-history" && (
        <ServiceStatusHistoryList session={session} />
      )}

      {view === "package-history" && (
        <ServicePackageHistoryList session={session} />
      )}
    </div>
  );
}
