import { getTranslation as getUiTranslation } from "../../i18n";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
// HQNATEX_WAREHOUSE_REAL_DATA_UI_V1F3L_BEGIN

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  PackageSearch,
  ShoppingCart,
  Truck,
  UsersRound,
  WalletCards,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import {
  warehouseApi,
  type Session,
  type WarehousePurchaseOrderRecord,
  type WarehousePurchaseRequestRecord,
  type WarehouseStockMovementRecord,
  type WarehouseStockRecord,
} from "../../lib/api";

type Language =
  | "en"
  | "fa"
  | "ps";

type WorkspaceTab =
  | "inventory"
  | "requests"
  | "orders"
  | "movements";

type SourceKey =
  | "inventory"
  | "stocks"
  | "suppliers"
  | "requests"
  | "orders"
  | "receipts"
  | "movements";

type SourceAvailability =
  Record<
    SourceKey,
    boolean | null
  >;

type MetricId =
  | "inventory"
  | "low-stock"
  | "requests"
  | "orders"
  | "suppliers"
  | "receipts"
  | "movements"
  | "value";

type MetricModel = {
  id: MetricId;
  title: string;
  value: string;
  status: string;
  icon: LucideIcon;
};

type WarehouseState = {
  inventoryCount: number | null;
  supplierCount: number | null;
  requestCount: number | null;
  orderCount: number | null;
  receiptCount: number | null;
  movementCount: number | null;

  stocks: WarehouseStockRecord[];
  requests: WarehousePurchaseRequestRecord[];
  orders: WarehousePurchaseOrderRecord[];
  movements: WarehouseStockMovementRecord[];
};

const EMPTY_STATE: WarehouseState = {
  inventoryCount: null,
  supplierCount: null,
  requestCount: null,
  orderCount: null,
  receiptCount: null,
  movementCount: null,

  stocks: [],
  requests: [],
  orders: [],
  movements: [],
};

const EMPTY_AVAILABILITY: SourceAvailability = {
  inventory: null,
  stocks: null,
  suppliers: null,
  requests: null,
  orders: null,
  receipts: null,
  movements: null,
};

const COPY = { en: getUiTranslation("en").featureCopy.warehouse_WarehouseProcurementModule.COPY, fa: getUiTranslation("fa").featureCopy.warehouse_WarehouseProcurementModule.COPY, ps: getUiTranslation("ps").featureCopy.warehouse_WarehouseProcurementModule.COPY };

function currentLanguage(): Language {
  const raw =
    document.documentElement.lang ||
    navigator.language ||
    "en";

  const value =
    raw.toLowerCase();

  if (
    value.startsWith("fa") ||
    value.startsWith("prs")
  ) {
    return "fa";
  }

  if (
    value.startsWith("ps")
  ) {
    return "ps";
  }

  return "en";
}

function displayValue(
  value:
    | string
    | number
    | null
    | undefined,
  fallback = "—",
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(
    value,
  );
}

function dateValue(
  value:
    | string
    | null
    | undefined,
  language: Language,
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  const locale =
    language === "fa"
      ? "fa-AF"
      : language === "ps"
        ? "ps-AF"
        : "en-US";

  return date.toLocaleDateString(
    locale,
  );
}

function countValue(
  value: number | null,
  available:
    | boolean
    | null,
  loading: boolean,
): string {
  if (loading) {
    return "…";
  }

  if (
    available !== true ||
    value === null
  ) {
    return "—";
  }

  return String(value);
}

type MetricCardProps = {
  metric: MetricModel;
};

function MetricCard({
  metric,
}: MetricCardProps) {
  const Icon =
    metric.icon;

  return (
    <article className="hq-kpi-card glass-panel rounded-2xl border border-white/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {metric.title}
          </p>

          <p className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">
            {metric.value}
          </p>

          <p className="mt-1 text-[9px] font-semibold text-slate-400">
            {metric.status}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
          <Icon className="h-4 w-4 text-cyan-500" />
        </div>
      </div>
    </article>
  );
}

type RealTableProps = {
  columns: string[];
  rows: ReactNode[][];
  loading: boolean;
  available: boolean | null;
  noRecords: string;
  noRecordsDesc: string;
  unavailableText: string;
};

function RealTable({
  columns,
  rows,
  loading,
  available,
  noRecords,
  noRecordsDesc,
  unavailableText,
}: RealTableProps) {
  return (
    <div className="overflow-x-auto">
      <SharedDataTable native className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map(
              (column) => (
                <th
                  key={column}
                  className="px-3 py-2.5 text-start text-[10px] font-black text-slate-500 dark:text-slate-400"
                >
                  {column}
                </th>
              ),
            )}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-xs font-bold text-slate-400"
              >
                …
              </td>
            </tr>
          ) : available === false ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center"
              >
                <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
                  <AlertTriangle className="h-7 w-7 text-amber-500" />

                  <p className="text-xs font-bold text-amber-500">
                    {unavailableText}
                  </p>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center"
              >
                <div className="mx-auto flex max-w-lg flex-col items-center gap-2">
                  <PackageSearch className="h-7 w-7 text-cyan-500/70" />

                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                    {noRecords}
                  </p>

                  <p className="text-xs font-semibold text-slate-400">
                    {noRecordsDesc}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map(
              (
                row,
                rowIndex,
              ) => (
                <tr
                  key={rowIndex}
                  className="border-b border-white/[0.06] last:border-b-0"
                >
                  {row.map(
                    (
                      cell,
                      cellIndex,
                    ) => (
                      <td
                        key={cellIndex}
                        className="px-3 py-2.5 text-start text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ),
            )
          )}
        </tbody>
      </SharedDataTable>
    </div>
  );
}

type Props = {
  session: Session;
};

export function WarehouseProcurementModule({
  session,
}: Props) {
  const language =
    currentLanguage();

  const copy =
    COPY[language];

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<WorkspaceTab>(
      "inventory",
    );

  const [
    state,
    setState,
  ] =
    useState<WarehouseState>(
      EMPTY_STATE,
    );

  const [
    availability,
    setAvailability,
  ] =
    useState<SourceAvailability>(
      EMPTY_AVAILABILITY,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        setLoading(true);

        if (
          !session.tenantId ||
          !session.companyId
        ) {
          if (!cancelled) {
            setState(
              EMPTY_STATE,
            );

            setAvailability(
              {
                inventory: false,
                stocks: false,
                suppliers: false,
                requests: false,
                orders: false,
                receipts: false,
                movements: false,
              },
            );

            setLoading(false);
          }

          return;
        }

        const query =
          "?page=1&page_size=50";

        const results =
          await Promise.allSettled(
            [
              warehouseApi.inventoryItems(
                session,
                query,
              ),
              warehouseApi.warehouseStocks(
                session,
                query,
              ),
              warehouseApi.suppliers(
                session,
                query,
              ),
              warehouseApi.purchaseRequests(
                session,
                query,
              ),
              warehouseApi.purchaseOrders(
                session,
                query,
              ),
              warehouseApi.goodsReceipts(
                session,
                query,
              ),
              warehouseApi.stockMovements(
                session,
                query,
              ),
            ],
          );

        if (cancelled) {
          return;
        }

        const [
          inventory,
          stocks,
          suppliers,
          requests,
          orders,
          receipts,
          movements,
        ] = results;

        setAvailability(
          {
            inventory:
              inventory.status ===
              "fulfilled",

            stocks:
              stocks.status ===
              "fulfilled",

            suppliers:
              suppliers.status ===
              "fulfilled",

            requests:
              requests.status ===
              "fulfilled",

            orders:
              orders.status ===
              "fulfilled",

            receipts:
              receipts.status ===
              "fulfilled",

            movements:
              movements.status ===
              "fulfilled",
          },
        );

        setState(
          {
            inventoryCount:
              inventory.status ===
              "fulfilled"
                ? inventory.value.count
                : null,

            supplierCount:
              suppliers.status ===
              "fulfilled"
                ? suppliers.value.count
                : null,

            requestCount:
              requests.status ===
              "fulfilled"
                ? requests.value.count
                : null,

            orderCount:
              orders.status ===
              "fulfilled"
                ? orders.value.count
                : null,

            receiptCount:
              receipts.status ===
              "fulfilled"
                ? receipts.value.count
                : null,

            movementCount:
              movements.status ===
              "fulfilled"
                ? movements.value.count
                : null,

            stocks:
              stocks.status ===
              "fulfilled"
                ? stocks.value.results
                : [],

            requests:
              requests.status ===
              "fulfilled"
                ? requests.value.results
                : [],

            orders:
              orders.status ===
              "fulfilled"
                ? orders.value.results
                : [],

            movements:
              movements.status ===
              "fulfilled"
                ? movements.value.results
                : [],
          },
        );

        setLoading(false);
      }

      void load();

      return () => {
        cancelled = true;
      };
    },
    [
      session.access,
      session.tenantId,
      session.companyId,
    ],
  );

  const successCount =
    Object.values(
      availability,
    ).filter(
      (value) =>
        value === true,
    ).length;

  const connectionState =
    loading
      ? "loading"
      : successCount === 7
        ? "connected"
        : successCount === 0
          ? "unavailable"
          : "partial";

  const connectionLabel =
    connectionState === "connected"
      ? copy.connected
      : connectionState === "partial"
        ? copy.partial
        : connectionState === "loading"
          ? copy.loading
          : copy.unavailable;

  const connectionMessage =
    connectionState === "connected"
      ? copy.connectedMessage
      : connectionState === "partial"
        ? copy.partialMessage
        : connectionState === "loading"
          ? copy.loading
          : copy.unavailableMessage;

  const badgeClass =
    connectionState === "connected"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
      : connectionState === "partial"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-500"
        : connectionState === "loading"
          ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-500"
          : "border-rose-500/20 bg-rose-500/10 text-rose-500";

  const badgeDotClass =
    connectionState === "connected"
      ? "bg-emerald-400"
      : connectionState === "partial"
        ? "bg-amber-400"
        : connectionState === "loading"
          ? "bg-cyan-400"
          : "bg-rose-400";

  const metricStatus = (
    available:
      | boolean
      | null,
  ) => {
    if (loading) {
      return copy.loading;
    }

    return available === true
      ? copy.realData
      : copy.unavailable;
  };

  /*
   * HQNATEX_LOW_STOCK_RULE_NOT_CERTIFIED
   * quantity and minimum_stock exist,
   * but no low-stock formula is applied.
   *
   * HQNATEX_INVENTORY_VALUE_RULE_NOT_CERTIFIED
   * quantity and average_unit_cost exist,
   * but no inventory valuation formula is applied.
   */

  const metrics: MetricModel[] = [
    {
      id: "inventory",
      title: copy.inventory,
      value:
        countValue(
          state.inventoryCount,
          availability.inventory,
          loading,
        ),
      status:
        metricStatus(
          availability.inventory,
        ),
      icon:
        PackageSearch,
    },
    {
      id: "low-stock",
      title: copy.lowStock,
      value: "—",
      status:
        copy.rulePending,
      icon:
        AlertTriangle,
    },
    {
      id: "requests",
      title: copy.requests,
      value:
        countValue(
          state.requestCount,
          availability.requests,
          loading,
        ),
      status:
        metricStatus(
          availability.requests,
        ),
      icon:
        ClipboardList,
    },
    {
      id: "orders",
      title: copy.orders,
      value:
        countValue(
          state.orderCount,
          availability.orders,
          loading,
        ),
      status:
        metricStatus(
          availability.orders,
        ),
      icon:
        ShoppingCart,
    },
    {
      id: "suppliers",
      title: copy.suppliers,
      value:
        countValue(
          state.supplierCount,
          availability.suppliers,
          loading,
        ),
      status:
        metricStatus(
          availability.suppliers,
        ),
      icon:
        UsersRound,
    },
    {
      id: "receipts",
      title: copy.receipts,
      value:
        countValue(
          state.receiptCount,
          availability.receipts,
          loading,
        ),
      status:
        metricStatus(
          availability.receipts,
        ),
      icon:
        Truck,
    },
    {
      id: "movements",
      title: copy.movements,
      value:
        countValue(
          state.movementCount,
          availability.movements,
          loading,
        ),
      status:
        metricStatus(
          availability.movements,
        ),
      icon:
        ArrowLeftRight,
    },
    {
      id: "value",
      title: copy.value,
      value: "—",
      status:
        copy.rulePending,
      icon:
        WalletCards,
    },
  ];

  const tabs: Array<{
    id: WorkspaceTab;
    label: string;
  }> = [
    {
      id: "inventory",
      label:
        copy.inventoryTab,
    },
    {
      id: "requests",
      label:
        copy.requestsTab,
    },
    {
      id: "orders",
      label:
        copy.ordersTab,
    },
    {
      id: "movements",
      label:
        copy.movementsTab,
    },
  ];

  let columns: string[] =
    [];

  let rows: ReactNode[][] =
    [];

  let tableAvailable:
    | boolean
    | null =
    null;

  if (
    activeTab ===
    "inventory"
  ) {
    columns = [
      copy.item,
      copy.sku,
      copy.warehouse,
      copy.qty,
      copy.reserved,
      copy.avgCost,
    ];

    tableAvailable =
      availability.stocks;

    rows =
      state.stocks.map(
        (row) => [
          displayValue(
            row.item_name,
          ),
          displayValue(
            row.item_sku,
          ),
          displayValue(
            row.warehouse_name,
          ),
          displayValue(
            row.quantity,
          ),
          displayValue(
            row.reserved_quantity,
          ),
          displayValue(
            row.average_unit_cost,
          ),
        ],
      );
  } else if (
    activeTab ===
    "requests"
  ) {
    columns = [
      copy.request,
      copy.warehouse,
      copy.date,
      copy.status,
    ];

    tableAvailable =
      availability.requests;

    rows =
      state.requests.map(
        (row) => [
          displayValue(
            row.request_number,
          ),
          displayValue(
            row.warehouse_name,
          ),
          dateValue(
            row.request_date,
            language,
          ),
          displayValue(
            row.status,
          ),
        ],
      );
  } else if (
    activeTab ===
    "orders"
  ) {
    columns = [
      copy.order,
      copy.supplier,
      copy.date,
      copy.total,
      copy.status,
    ];

    tableAvailable =
      availability.orders;

    rows =
      state.orders.map(
        (row) => [
          displayValue(
            row.order_number,
          ),
          displayValue(
            row.supplier_name,
          ),
          dateValue(
            row.order_date,
            language,
          ),
          `${displayValue(
            row.total_amount,
          )} ${displayValue(
            row.currency,
            "",
          )}`.trim(),
          displayValue(
            row.status,
          ),
        ],
      );
  } else {
    columns = [
      copy.movement,
      copy.item,
      copy.fromTo,
      copy.qty,
      copy.reference,
      copy.date,
    ];

    tableAvailable =
      availability.movements;

    rows =
      state.movements.map(
        (row) => [
          displayValue(
            row.movement_type,
          ),
          displayValue(
            row.item_name,
          ),
          `${displayValue(
            row.from_warehouse_name,
          )} → ${displayValue(
            row.to_warehouse_name,
          )}`,
          displayValue(
            row.quantity,
          ),
          [
            row.reference_type,
            row.reference_id,
          ]
            .filter(Boolean)
            .join(" / ") ||
            copy.unknown,
          dateValue(
            row.occurred_at,
            language,
          ),
        ],
      );
  }

  return (
    <div
      className="warehouse-procurement-workspace space-y-4 pb-10"
      data-warehouse-mode="real-backend"
      data-warehouse-v1f3l="true"
    >
      <section className="glass-panel rounded-[1.6rem] border border-white/10 p-4 lg:p-5">
        <SharedPageHeader native as="div" className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
              <Warehouse className="h-5 w-5 text-cyan-500" />
            </div>

            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white lg:text-2xl">
                {copy.title}
              </h1>

              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black ${badgeClass}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${badgeDotClass}`}
            />

            {connectionLabel}
          </span>
        </SharedPageHeader>

        <div
          className={`mt-3 flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
            connectionState === "connected"
              ? "border-emerald-500/15 bg-emerald-500/[0.055]"
              : connectionState === "unavailable"
                ? "border-rose-500/15 bg-rose-500/[0.055]"
                : "border-amber-500/15 bg-amber-500/[0.055]"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

          <p className="text-[11px] font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {connectionMessage}
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          (metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
            />
          ),
        )}
      </section>

      <section className="glass-panel rounded-[1.5rem] border border-white/10 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(
            (tab) => (
              <SharedSecondaryButton
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.id,
                  )
                }
                className={`min-w-max rounded-xl border px-4 py-2 text-xs font-black transition ${
                  activeTab === tab.id
                    ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-500"
                    : "border-white/10 bg-white/[0.035] text-slate-500 hover:bg-white/[0.07] dark:text-slate-300"
                }`}
              >
                {tab.label}
              </SharedSecondaryButton>
            ),
          )}
        </div>
      </section>

      <section className="glass-panel overflow-hidden rounded-[1.5rem] border border-white/10">
        <RealTable
          columns={columns}
          rows={rows}
          loading={loading}
          available={tableAvailable}
          noRecords={copy.noRecords}
          noRecordsDesc={copy.noRecordsDesc}
          unavailableText={copy.tableUnavailable}
        />
      </section>
    </div>
  );
}

export default WarehouseProcurementModule;

// HQNATEX_WAREHOUSE_REAL_DATA_UI_V1F3L_END
