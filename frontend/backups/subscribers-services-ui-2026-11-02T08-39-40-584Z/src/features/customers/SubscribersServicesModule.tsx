import { SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import {
  useState,
} from "react";

import {
  ArrowLeft,
} from "lucide-react";

import type {
  Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

import {
  SubscribersServicesDashboard,
} from "./SubscribersServicesDashboard";

import {
  CustomerList,
} from "./CustomerList";

import {
  CustomerServiceList,
} from "./CustomerServiceList";

import {
  CustomerTechnicalValueList,
} from "./CustomerTechnicalValueList";
import { ServiceActivationList } from "./ServiceActivationList";
import { InstallationWorkOrderList } from "./InstallationWorkOrderList";
import { ProvisioningJobList } from "./ProvisioningJobList";
import { IPAssignmentList } from "./IPAssignmentList";
import { RadiusAccountList } from "./RadiusAccountList";
import { TechnicalTestResultList } from "./TechnicalTestResultList";
import { ActivationChecklistList } from "./ActivationChecklistList";
import { FieldVisitList } from "./FieldVisitList";
import { TroubleTicketList } from "./TroubleTicketList";
import { DecommissionRecordList } from "./DecommissionRecordList";
import { CustomerEquipmentAssignmentList } from "./CustomerEquipmentAssignmentList";
import { TechnicalAttachmentList } from "./TechnicalAttachmentList";
import { ServiceAgencyHistoryList } from "./ServiceAgencyHistoryList";

import {
  ServiceChangeRequestList,
} from "./ServiceChangeRequestList";

import {
  ServiceStatusHistoryList,
} from "./ServiceStatusHistoryList";

import {
  ServicePackageHistoryList,
} from "./ServicePackageHistoryList";

import {
  ServiceCategoryList,
} from "../services/ServiceCategoryList";

import {
  ServiceList,
} from "../services/ServiceList";

import {
  PackageList,
} from "../services/PackageList";

import {
  TechnicalFieldList,
} from "../services/TechnicalFieldList";

import {
  TechnologyList,
} from "../services/TechnologyList";

import {
  ServiceTechnologyList,
} from "../services/ServiceTechnologyList";

type Props = {
  session: Session;
};

type UnifiedView =
  | "hub"
  | "customers"
  | "customer-services"
  | "activations"
  | "work-orders"
  | "provisioning-jobs"
  | "ip-assignments"
  | "radius-accounts"
  | "technical-tests"
  | "activation-checklist"
  | "field-visits"
  | "trouble-tickets"
  | "decommission-records"
  | "customer-equipment"
  | "service-attachments"
  | "agency-history"
  | "technical-data"
  | "change-requests"
  | "status-history"
  | "package-history"
  | "categories"
  | "services"
  | "packages"
  | "technical-fields"
  | "technologies"
  | "service-technologies";

export function SubscribersServicesModule({
  session,
}: Props) {
  const { t } = useTranslation();

  const [view, setView] =
    useState<UnifiedView>("hub");

  if (view === "hub") {
    return (
      <div className="space-y-5">
        <SubscribersServicesDashboard
          session={session}
          onOpen={(next) =>
            setView(next as UnifiedView)
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SharedSecondaryButton
            type="button"
            onClick={() =>
              setView(
                "activation-checklist",
              )
            }
            className="
              w-full
              rounded-[24px]
              border border-cyan-400/20
              bg-cyan-400/[0.06]
              px-5 py-4
              text-start
              shadow-xl
              backdrop-blur-xl
              transition-all
              hover:-translate-y-0.5
              hover:border-cyan-400/40
              hover:bg-cyan-400/[0.10]
            "
          >
            <div className="text-sm font-black text-cyan-300">
              {t.customersServicesUi.tabChecklist}
            </div>
          </SharedSecondaryButton>

          <SharedSecondaryButton
            type="button"
            onClick={() =>
              setView(
                "field-visits",
              )
            }
            className="
              w-full
              rounded-[24px]
              border border-cyan-400/20
              bg-cyan-400/[0.06]
              px-5 py-4
              text-start
              shadow-xl
              backdrop-blur-xl
              transition-all
              hover:-translate-y-0.5
              hover:border-cyan-400/40
              hover:bg-cyan-400/[0.10]
            "
          >
            <div className="text-sm font-black text-cyan-300">
              {t.customersServicesUi.tabFieldVisits}
            </div>
          </SharedSecondaryButton>

        <SharedSecondaryButton
          type="button"
          onClick={() =>
            setView(
              "trouble-tickets",
            )
          }
          className="
            w-full
            rounded-[24px]
            border border-cyan-400/20
            bg-cyan-400/[0.06]
            px-5 py-4
            text-start
            shadow-xl
            backdrop-blur-xl
            transition-all
            hover:-translate-y-0.5
            hover:border-cyan-400/40
            hover:bg-cyan-400/[0.10]
          "
        >
          <div className="text-sm font-black text-cyan-700 dark:text-cyan-300">
            {t.customersServicesUi.tabFaults}
          </div>
        </SharedSecondaryButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        space-y-5
        animate-in fade-in
        duration-300
      "
    >
      <SharedSecondaryButton
        type="button"
        onClick={() =>
          setView("hub")
        }
        className="
          inline-flex items-center
          gap-2
          rounded-xl
          border border-slate-700/60
          bg-white/60
          px-4 py-2
          text-xs font-bold
          text-slate-600
          shadow-sm
          transition-all
          hover:border-cyan-400/40
          hover:text-cyan-700
          dark:border-white/10
          dark:bg-white/5
          dark:text-slate-400
          dark:hover:text-cyan-300
        "
      >
        <ArrowLeft
          className="
            h-4 w-4
            rtl:rotate-180
          "
        />

        {t.common.subscribersServices}
      </SharedSecondaryButton>

      {view === "customers" && (
        <CustomerList
          session={session}
        />
      )}

      {view ===
        "customer-services" && (
        <CustomerServiceList
          session={session}
        />
      )}
      {view === "activations" && (
        <ServiceActivationList session={session} />
      )}

      {view === "work-orders" && (
        <InstallationWorkOrderList session={session} />
      )}

      {view === "provisioning-jobs" && (
        <ProvisioningJobList session={session} />
      )}

      {view === "ip-assignments" && (
        <IPAssignmentList session={session} />
      )}

      {view === "radius-accounts" && (
        <RadiusAccountList session={session} />
      )}

      {view === "technical-tests" && (
        <TechnicalTestResultList session={session} />
      )}

      {view ===
        "activation-checklist" && (
        <ActivationChecklistList
          session={session}
        />
      )}

      {view === "field-visits" && (
        <FieldVisitList
          session={session}
        />
      )}

      {view === "trouble-tickets" && (
        <TroubleTicketList
          session={session}
        />
      )}

      {view === "decommission-records" && (
        <DecommissionRecordList
          session={session}
        />
      )}

      {view === "customer-equipment" && (
        <CustomerEquipmentAssignmentList
          session={session}
        />
      )}

      {view === "service-attachments" && (
        <TechnicalAttachmentList
          session={session}
        />
      )}

      {view === "agency-history" && (
        <ServiceAgencyHistoryList
          session={session}
        />
      )}


      {view ===
        "technical-data" && (
        <CustomerTechnicalValueList
          session={session}
        />
      )}

      {view ===
        "change-requests" && (
        <ServiceChangeRequestList
          session={session}
        />
      )}

      {view ===
        "status-history" && (
        <ServiceStatusHistoryList
          session={session}
        />
      )}

      {view ===
        "package-history" && (
        <ServicePackageHistoryList
          session={session}
        />
      )}

      {view === "categories" && (
        <ServiceCategoryList
          session={session}
        />
      )}

      {view === "services" && (
        <ServiceList
          session={session}
        />
      )}

      {view === "packages" && (
        <PackageList
          session={session}
        />
      )}

      {view ===
        "technical-fields" && (
        <TechnicalFieldList
          session={session}
        />
      )}

      {view === "technologies" && (
        <TechnologyList
          session={session}
        />
      )}

      {view ===
        "service-technologies" && (
        <ServiceTechnologyList
          session={session}
        />
      )}
    </div>
  );
}
