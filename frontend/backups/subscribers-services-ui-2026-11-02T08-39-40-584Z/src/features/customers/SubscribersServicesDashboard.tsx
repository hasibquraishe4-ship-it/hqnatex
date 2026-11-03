import { SecondaryButton as SharedSecondaryButton, PrimaryButton as SharedPrimaryButton } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  Package,
  RadioTower,
  Truck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

import {
  fetchers,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
  onOpen: (view: string) => void;
};

type Summary = {
  customers: number;
  customerServices: number;
  services: number;
  packages: number;
};

type RecentCustomer = {
  id: string;
  code?: string;
  customer_code?: string;
  display_name?: string;
  phone?: string;
  branch_name?: string;
  status?: string;
};

type ActionCardProps = {
  icon: any;
  title: string;
  description?: string;
  onClick: () => void;
  wide?: boolean;
};

function ActionCard({
  icon: Icon,
  title,
  onClick,
  wide = false,
}: ActionCardProps) {
  return (
    <SharedSecondaryButton
      type="button"
      onClick={onClick}
      className={`
        group
          subscriber-action-card
          min-h-[108px]
        rounded-2xl
        border border-slate-200/70
        bg-white/55
        p-5
        text-start
        shadow-[0_8px_24px_rgba(15,23,42,0.08),0_5px_0_rgba(148,163,184,0.22)]
        backdrop-blur-xl
        transition-all
        hover:-translate-y-0.5
        hover:border-cyan-400/40
        hover:shadow-[0_12px_30px_rgba(14,165,233,0.12),0_5px_0_rgba(14,165,233,0.15)]
        dark:border-white/10
        dark:bg-white/5
        ${wide ? "md:col-span-2" : ""}
      `}
    >
      <div className="flex h-full items-center gap-4">
        <div
          className="
            grid h-12 w-12
            shrink-0 place-items-center
            rounded-2xl
            border border-white/60
            bg-white/70
            text-cyan-600
            shadow-lg
            dark:border-white/10
            dark:bg-white/10
            dark:text-cyan-300
          "
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          <div
            className="
              text-[15px] xl:text-[16px]
                font-black leading-6
                tracking-normal
                text-slate-100
                transition-colors
              group-hover:text-cyan-700
              dark:text-white
              dark:group-hover:text-cyan-300
            "
          >
            {title}
          </div>
        </div>
      </div>
    </SharedSecondaryButton>
  );
}

export function SubscribersServicesDashboard({
  session,
  onOpen,
}: Props) {
  const { t } = useTranslation();

  const [summary, setSummary] =
    useState<Summary>({
      customers: 0,
      customerServices: 0,
      services: 0,
      packages: 0,
    });

  const [recentCustomers, setRecentCustomers] =
    useState<RecentCustomer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          customers,
          customerServices,
          services,
          packages,
        ] = await Promise.all([
          fetchers.customers(
            session,
            "?page=1&page_size=6&ordering=-created_at",
          ),
          fetchers.customerServices(
            session,
            "?page=1&page_size=1",
          ),
          fetchers.services(
            session,
            "?status=active&page=1&page_size=1",
          ),
          fetchers.packages(
            session,
            "?available=1&page=1&page_size=1",
          ),
        ]);

        if (!alive) return;

        setSummary({
          customers:
            customers.count || 0,
          customerServices:
            customerServices.count || 0,
          services:
            services.count || 0,
          packages:
            packages.count || 0,
        });

        setRecentCustomers(
          (customers.results || []).slice(0, 6),
        );
      } catch (err) {
        if (!alive) return;

        setError(
          err instanceof Error
            ? err.message
            : t.common.noRecords,
        );
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [session, t]);

  const statCards = [
    {
      value: summary.customers,
      label:
        t.customersServicesUi
          .summaryCustomers,
      icon: Users,
    },
    {
      value: summary.customerServices,
      label:
        t.customersServicesUi
          .summaryCustomerServices,
      icon: Activity,
    },
    {
      value: summary.services,
      label:
        t.customersServicesUi
          .summaryServices,
      icon: RadioTower,
    },
    {
      value: summary.packages,
      label:
        t.customersServicesUi
          .summaryPackages,
      icon: Package,
    },
  ];

  return (
    <div
      className="
        space-y-5
        animate-in fade-in
        duration-300
      "
    >
      <section
        className="
          rounded-[1.1rem]
          border border-slate-200/80
          bg-white/65
          p-[10px]
          shadow-sm
          backdrop-blur-xl
          dark:border-white/10
          dark:bg-white/5
        "
      >
        <div
          className="
            flex items-center
            justify-between gap-2
          "
        >
          <div>
            <h1
              className="
                text-[18px] lg:text-[19px] font-black leading-5
                text-slate-100
                dark:text-white
              "
            >
              {t.common.subscribersServices}
            </h1>

            <p
              className="
                mt-0 text-[10px] leading-3
                text-slate-500
                dark:text-slate-400
              "
            >
              {
                t.customersServicesUi
                  .subscribersServicesDashboardDesc
              }
            </p>
          </div>

          <div
            className="
              grid h-[30px] w-[30px]
              place-items-center
              rounded-xl
              border border-indigo-200/70
              bg-indigo-50
              text-indigo-700
              shadow
              dark:border-indigo-400/20
              dark:bg-indigo-400/10
              dark:text-indigo-300
            "
          >
            <Users className="h-4 w-4" />
          </div>
        </div>
      </section>

<section className="space-y-3">
        <h2
          className="
            px-1 text-sm
            font-black
            text-slate-200
            dark:text-slate-100
          "
        >
          {
            t.customersServicesUi
              .subscriberSummary
          }
        </h2>

        <div
          className="
            subscribers-summary-grid
              grid gap-3
              sm:grid-cols-2
              xl:grid-cols-4
          "
        >
          {statCards.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="
                  subscriber-summary-card
                    min-h-[112px]
                  rounded-2xl
                  border border-slate-200/70
                  bg-white/55
                  p-5
                  shadow-[0_8px_24px_rgba(15,23,42,0.08),0_5px_0_rgba(148,163,184,0.22)]
                  backdrop-blur-xl
                  dark:border-white/10
                  dark:bg-white/5
                "
              >
                <div
                  className="
                    flex h-full
                    items-center
                    justify-between
                    gap-4
                  "
                >
                  <div>
                    <div
                      className="
                        text-2xl
                        font-black
                        text-slate-100
                        dark:text-white
                      "
                    >
                      {loading
                        ? "…"
                        : item.value}
                    </div>

                    <div
                      className="
                        mt-2 text-xs
                        font-bold
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      {item.label}
                    </div>
                  </div>

                  <div
                    className="
                      grid h-11 w-11
                      place-items-center
                      rounded-2xl
                      bg-white/80
                      text-indigo-600
                      shadow-lg
                      dark:bg-white/10
                      dark:text-indigo-300
                    "
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2
          className="
            px-1 text-sm
            font-black
            text-slate-200
            dark:text-slate-100
          "
        >
          {
            t.customersServicesUi
              .subscriberOperations
          }
        </h2>

        <div
          className="
            subscribers-operations-grid
              grid gap-3
              md:grid-cols-2
              xl:grid-cols-4
          "
        >
          <ActionCard
            icon={Users}
            title={t.uiTabs.customers}
            description={
              t.customersServicesUi
                .manageSubscribersDesc
            }
            onClick={() =>
              onOpen("customers")
            }
          />

          <ActionCard
            icon={UserPlus}
            title={
              t.customersServicesUi
                .registerSubscriber
            }
            description={
              t.customersServicesUi
                .registerSubscriberDesc
            }
            onClick={() =>
              onOpen("customers")
            }
          />

          <ActionCard
            icon={Zap}
            title={
              t.customersServicesUi
                .subscriberActivation
            }
            description={
              t.customersServicesUi
                .subscriberActivationDesc
            }
            onClick={() =>
              onOpen("activations")
            }
          />
          <ActionCard
            icon={Zap}
            title={
              t.customersServicesUi
                .installationWorkOrders
            }
            description={
              t.customersServicesUi
                .installationWorkOrdersDesc
            }
            onClick={() =>
              onOpen("work-orders")
            }
          />
          <ActionCard
            icon={Zap}
            title={
              t.customersServicesUi
                .provisioningJobs
            }
            description={
              t.customersServicesUi
                .provisioningJobsDesc
            }
            onClick={() =>
              onOpen("provisioning-jobs")
            }
          />
          <ActionCard
            icon={Zap}
            title={
              t.customersServicesUi
                .ipAssignments
            }
            description={
              t.customersServicesUi
                .ipAssignmentsDesc
            }
            onClick={() =>
              onOpen("ip-assignments")
            }
          />
          <ActionCard
            icon={Zap}
            title={
              t.customersServicesUi
                .radiusAccounts
            }
            description={
              t.customersServicesUi
                .radiusAccountsDesc
            }
            onClick={() =>
              onOpen("radius-accounts")
            }
          />
          <ActionCard
            icon={Zap}
            title={
              t.customersServicesUi
                .tabTestResults
            }
            description={
              t.customersServicesUi
                .technicalTestsDesc
            }
            onClick={() =>
              onOpen("technical-tests")
            }
          />

          <ActionCard
            icon={Truck}
            title={
              t.customersServicesUi
                .tabFieldVisits
            }
            description={
              t.customersServicesUi
                .fieldVisitsDesc
            }
            onClick={() =>
              onOpen("field-visits")
            }
          />

      <ActionCard
        icon={ClipboardCheck}
        title={
          t.customersServicesUi
            .tabFaults
        }
        description={
          t.customersServicesUi
            .tabFaults
        }
        onClick={() =>
          onOpen("trouble-tickets")
        }
      />

      <ActionCard
        icon={Package}
        title={
          t.customersServicesUi
            .tabDecommission
        }
        description={
          t.customersServicesUi
            .tabDecommission
        }
        onClick={() =>
          onOpen(
            "decommission-records",
          )
        }
      />

      <ActionCard
        icon={Package}
        title={
          t.customersServicesUi
            .tabEquipment
        }
        description={
          t.customersServicesUi
            .tabEquipment
        }
        onClick={() =>
          onOpen(
            "customer-equipment",
          )
        }
      />

      <ActionCard
        icon={Package}
        title={
          t.customersServicesUi
            .tabAttachments
        }
        description={
          t.customersServicesUi
            .tabAttachments
        }
        onClick={() =>
          onOpen(
            "service-attachments",
          )
        }
      />

      <ActionCard
        icon={Package}
        title={
          t.customersServicesUi
            .agencyHistory
        }
        description={
          t.customersServicesUi
            .agencyHistory
        }
        onClick={() =>
          onOpen(
            "agency-history",
          )
        }
      />

          <ActionCard
            icon={ClipboardCheck}
            title={
              t.customersServicesUi
                .activationRenewalRequests
            }
            description={
              t.customersServicesUi
                .activationRenewalRequestsDesc
            }
            onClick={() =>
              onOpen("change-requests")
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2
          className="
            px-1 text-sm
            font-black
            text-slate-200
            dark:text-slate-100
          "
        >
          {
            t.customersServicesUi
              .servicesPackagesSection
          }
        </h2>

        <div
          className="
            grid gap-3
            md:grid-cols-2
          "
        >
          <ActionCard
            icon={Boxes}
            title={
              t.customersServicesUi
                .servicesAndPackages
            }
            description={
              t.customersServicesUi
                .servicesAndPackagesDesc
            }
            onClick={() =>
              onOpen("services")
            }
          />

          <ActionCard
            icon={ArrowLeftRight}
            title={
              t.customersServicesUi
                .enterSubscribers
            }
            description={
              t.customersServicesUi
                .enterSubscribersDesc
            }
            onClick={() =>
              onOpen("customers")
            }
          />
        </div>
      </section>

      <section
        className="
          overflow-hidden
          rounded-2xl
          border border-slate-200/80
          bg-white/55
          shadow-sm
          backdrop-blur-xl
          dark:border-white/10
          dark:bg-white/5
        "
      >
        <div
          className="
            flex items-center
            justify-between
            border-b
            border-slate-200/70
            px-5 py-4
            dark:border-white/10
          "
        >
          <div
            className="
              text-sm font-black
              text-slate-200
              dark:text-white
            "
          >
            {
              t.customersServicesUi
                .recentSubscribers
            }
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={() =>
              onOpen("customers")
            }
            className="
              rounded-xl
              border border-cyan-500/20
              bg-cyan-500/5
              px-3 py-2
              text-xs font-bold
              text-cyan-700
              transition
              hover:bg-cyan-500/10
              dark:text-cyan-300
            "
          >
            {
              t.customersServicesUi
                .viewAll
            }
          </SharedPrimaryButton>
        </div>

        {error ? (
          <div
            className="
              p-5 text-sm
              text-rose-600
              dark:text-rose-300
            "
          >
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <SharedDataTable native
              className="
                w-full
                min-w-[680px]
                text-xs
              "
            >
              <thead>
                <tr
                  className="
                    bg-slate-50/80
                    text-slate-500
                    dark:bg-white/5
                    dark:text-slate-400
                  "
                >
                  <th className="px-5 py-3 text-start">
                    {
                      t.customersServicesUi
                        .customerCode
                    }
                  </th>

                  <th className="px-5 py-3 text-start">
                    {
                      t.customersServicesUi
                        .displayName
                    }
                  </th>

                  <th className="px-5 py-3 text-start">
                    {
                      t.customersServicesUi
                        .phone
                    }
                  </th>

                  <th className="px-5 py-3 text-start">
                    {
                      t.customersServicesUi
                        .branch
                    }
                  </th>

                  <th className="px-5 py-3 text-start">
                    {
                      t.customersServicesUi
                        .status
                    }
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentCustomers.map(
                  (customer) => (
                    <tr
                      key={customer.id}
                      className="
                        border-t
                        border-slate-200/60
                        text-slate-700
                        dark:border-white/5
                        dark:text-slate-300
                      "
                    >
                      <td className="px-5 py-3 font-mono">
                        {customer.customer_code ||
                          customer.code ||
                          "—"}
                      </td>

                      <td className="px-5 py-3 font-bold">
                        {customer.display_name ||
                          "—"}
                      </td>

                      <td className="px-5 py-3">
                        {customer.phone ||
                          "—"}
                      </td>

                      <td className="px-5 py-3">
                        {customer.branch_name ||
                          "—"}
                      </td>

                      <td className="px-5 py-3">
                        {customer.status ||
                          "—"}
                      </td>
                    </tr>
                  ),
                )}

                {!loading &&
                  recentCustomers.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="
                          px-5 py-10
                          text-center
                          text-slate-500
                        "
                      >
                        {t.common.noRecords}
                      </td>
                    </tr>
                  )}
              </tbody>
            </SharedDataTable>
          </div>
        )}
      </section>
    </div>
  );
}
