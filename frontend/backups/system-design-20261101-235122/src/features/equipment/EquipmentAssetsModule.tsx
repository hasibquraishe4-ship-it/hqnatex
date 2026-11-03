// HQNATEX_EQUIPMENT_ASSETS_REAL_DATA_V1_BEGIN

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeftRight,
  Barcode,
  Boxes,
  CheckCircle2,
  Database,
  Loader2,
  PackageSearch,
  RefreshCcw,
  Search,
  Users,
} from "lucide-react";

import {
  api,
  type Paginated,
  type Session,
} from "../../lib/api";

type EquipmentAssetsModuleProps = {
  session: Session;
};

type Lang = "en" | "fa" | "ps";

type AnyRow = Record<string, unknown>;

type SourceKey =
  | "items"
  | "serials"
  | "stocks"
  | "assignments"
  | "movements";

type SourceState = {
  ok: boolean | null;
  page: Paginated<AnyRow> | null;
  error: string;
};

type SourcesState = Record<
  SourceKey,
  SourceState
>;

type Tab = {
  key: SourceKey;
  icon: typeof Boxes;
};

type Column = {
  label: string;
  keys: string[];
};

const SOURCE_ENDPOINTS: Array<
  [SourceKey, string]
> = [
  [
    "items",
    "/api/v1/warehouse/inventory-items/",
  ],
  [
    "serials",
    "/api/v1/warehouse/inventory-serials/",
  ],
  [
    "stocks",
    "/api/v1/warehouse/warehouse-stocks/",
  ],
  [
    "assignments",
    "/api/v1/customer-equipment-assignments/",
  ],
  [
    "movements",
    "/api/v1/warehouse/stock-movements/",
  ],
];

const TABS: Tab[] = [
  {
    key: "items",
    icon: PackageSearch,
  },
  {
    key: "serials",
    icon: Barcode,
  },
  {
    key: "stocks",
    icon: Boxes,
  },
  {
    key: "assignments",
    icon: Users,
  },
  {
    key: "movements",
    icon: ArrowLeftRight,
  },
];

function emptySources(): SourcesState {
  return {
    items: {
      ok: null,
      page: null,
      error: "",
    },
    serials: {
      ok: null,
      page: null,
      error: "",
    },
    stocks: {
      ok: null,
      page: null,
      error: "",
    },
    assignments: {
      ok: null,
      page: null,
      error: "",
    },
    movements: {
      ok: null,
      page: null,
      error: "",
    },
  };
}

const COPY = {
  en: {
    title: "Equipment & Assets",
    subtitle:
      "Real equipment lifecycle visibility from Warehouse, serial inventory and customer assignments.",
    connected: "Connected",
    partial: "Partial connection",
    unavailable: "Unavailable",
    loading: "Loading",
    realBackend: "Real Backend",
    refresh: "Refresh",
    search: "Search equipment, serial or assignment...",
    items: "Item Catalog",
    serials: "Serialized Assets",
    stocks: "Warehouse Stock",
    assignments: "Customer Assignments",
    movements: "Stock Movements",
    noRecords: "No real records",
    noRecordsDesc:
      "No records are currently stored in the backend for this section.",
    failedEndpoint:
      "This data source did not respond successfully.",
    item: "Item",
    code: "Code / SKU",
    category: "Category",
    serial: "Serial",
    warehouse: "Warehouse",
    quantity: "Quantity",
    status: "Status",
    customer: "Customer / Service",
    equipmentType: "Equipment Type",
    assignmentType: "Assignment",
    movement: "Movement",
    from: "From",
    to: "To",
    date: "Date",
    connectedSources: "Connected Sources",
    canonicalNote:
      "Warehouse stock and serial inventory remain the canonical equipment source. Customer assignment data is linked from the Subscribers & Services domain.",
  },

  fa: {
    title: "تجهیزات و دارایی‌ها",
    subtitle:
      "نمایش واقعی چرخه تجهیزات بر اساس گدام، موجودی سریال‌دار و تخصیص تجهیزات مشترکین.",
    connected: "متصل",
    partial: "اتصال ناقص",
    unavailable: "در دسترس نیست",
    loading: "در حال دریافت",
    realBackend: "داده واقعی Backend",
    refresh: "تازه‌سازی",
    search:
      "جستجوی تجهیزات، سریال یا تخصیص...",
    items: "فهرست تجهیزات",
    serials: "دارایی‌های سریال‌دار",
    stocks: "موجودی گدام",
    assignments: "تخصیص به مشترکین",
    movements: "حرکات موجودی",
    noRecords: "رکورد واقعی موجود نیست",
    noRecordsDesc:
      "برای این بخش هنوز رکوردی در Backend ثبت نشده است.",
    failedEndpoint:
      "منبع داده این بخش پاسخ موفق برنگرداند.",
    item: "تجهیز / قلم",
    code: "کد / SKU",
    category: "دسته‌بندی",
    serial: "شماره سریال",
    warehouse: "گدام",
    quantity: "تعداد",
    status: "وضعیت",
    customer: "مشترک / سرویس",
    equipmentType: "نوع تجهیزات",
    assignmentType: "نوع تخصیص",
    movement: "حرکت",
    from: "از",
    to: "به",
    date: "تاریخ",
    connectedSources: "منابع متصل",
    canonicalNote:
      "موجودی و سریال‌های گدام منبع اصلی تجهیزات است و تخصیص مشترکین از بخش مشترکین و خدمات خوانده می‌شود.",
  },

  ps: {
    title: "وسایل او شتمنۍ",
    subtitle:
      "د ګودام، سریالي موجودي او د پېرېدونکو تخصیصونو پر بنسټ د وسایلو حقیقي معلومات.",
    connected: "نښلول شوی",
    partial: "نیمګړې اړیکه",
    unavailable: "نه شته",
    loading: "معلومات ترلاسه کېږي",
    realBackend: "حقیقي Backend معلومات",
    refresh: "تازه کول",
    search:
      "وسایل، سریال یا تخصیص ولټوئ...",
    items: "د وسایلو فهرست",
    serials: "سریالي شتمنۍ",
    stocks: "د ګودام موجودي",
    assignments: "د پېرېدونکو تخصیص",
    movements: "د موجودي حرکتونه",
    noRecords: "حقیقي ریکارډ نشته",
    noRecordsDesc:
      "د دې برخې لپاره په Backend کې لا ریکارډ نشته.",
    failedEndpoint:
      "د دې برخې د معلوماتو سرچینې بریالی ځواب ورنه کړ.",
    item: "وسیله / قلم",
    code: "کوډ / SKU",
    category: "کټګوري",
    serial: "سریال",
    warehouse: "ګودام",
    quantity: "شمېر",
    status: "حالت",
    customer: "پېرېدونکی / خدمت",
    equipmentType: "د وسیلې ډول",
    assignmentType: "تخصیص",
    movement: "حرکت",
    from: "له",
    to: "تر",
    date: "نېټه",
    connectedSources: "نښلول شوې سرچینې",
    canonicalNote:
      "د ګودام موجودي او سریالونه د وسایلو اصلي سرچینه ده؛ د پېرېدونکو تخصیصونه د Subscribers & Services برخې څخه لوستل کېږي.",
  },
} as const;

function getDocumentLanguage(): Lang {
  if (typeof document === "undefined") {
    return "fa";
  }

  const value =
    (
      document.documentElement.lang ||
      ""
    ).toLowerCase();

  if (value.startsWith("en")) {
    return "en";
  }

  if (value.startsWith("ps")) {
    return "ps";
  }

  return "fa";
}

function useDocumentLanguage(): Lang {
  const [language, setLanguage] =
    useState<Lang>(
      getDocumentLanguage,
    );

  useEffect(() => {
    if (
      typeof document === "undefined" ||
      typeof MutationObserver === "undefined"
    ) {
      return;
    }

    const observer =
      new MutationObserver(() => {
        setLanguage(
          getDocumentLanguage(),
        );
      });

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "lang",
          "dir",
        ],
      },
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  return language;
}

function printable(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (
    typeof value === "object"
  ) {
    const object =
      value as Record<string, unknown>;

    for (const key of [
      "name",
      "title",
      "code",
      "label",
      "full_name",
      "legal_name",
    ]) {
      const nested =
        object[key];

      if (
        nested !== undefined &&
        nested !== null &&
        nested !== ""
      ) {
        return String(nested);
      }
    }
  }

  return "—";
}

function pick(
  row: AnyRow,
  keys: string[],
): string {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      return printable(value);
    }
  }

  return "—";
}

function columnsFor(
  key: SourceKey,
  c: typeof COPY.en,
): Column[] {
  if (key === "items") {
    return [
      {
        label: c.item,
        keys: [
          "name",
          "item_name",
          "title",
        ],
      },
      {
        label: c.code,
        keys: [
          "sku",
          "item_code",
          "code",
        ],
      },
      {
        label: c.category,
        keys: [
          "category_name",
          "category",
          "item_type",
        ],
      },
      {
        label: c.status,
        keys: [
          "status",
          "is_active",
        ],
      },
    ];
  }

  if (key === "serials") {
    return [
      {
        label: c.serial,
        keys: [
          "serial_number",
          "serial",
          "asset_tag",
        ],
      },
      {
        label: c.item,
        keys: [
          "inventory_item_name",
          "item_name",
          "name",
          "inventory_item",
        ],
      },
      {
        label: c.warehouse,
        keys: [
          "warehouse_name",
          "warehouse",
        ],
      },
      {
        label: c.status,
        keys: [
          "status",
          "condition",
        ],
      },
    ];
  }

  if (key === "stocks") {
    return [
      {
        label: c.item,
        keys: [
          "inventory_item_name",
          "item_name",
          "name",
          "inventory_item",
        ],
      },
      {
        label: c.warehouse,
        keys: [
          "warehouse_name",
          "warehouse",
        ],
      },
      {
        label: c.quantity,
        keys: [
          "quantity",
          "on_hand",
          "on_hand_quantity",
          "available_quantity",
          "qty",
        ],
      },
      {
        label: c.status,
        keys: [
          "status",
        ],
      },
    ];
  }

  if (key === "assignments") {
    return [
      {
        label: c.equipmentType,
        keys: [
          "equipment_type",
          "type",
        ],
      },
      {
        label: c.serial,
        keys: [
          "serial_number",
          "serial",
          "mac_address",
          "imei",
        ],
      },
      {
        label: c.customer,
        keys: [
          "customer_name",
          "service_name",
          "customer_service_name",
          "customer",
          "customer_service",
        ],
      },
      {
        label: c.assignmentType,
        keys: [
          "assignment_type",
          "ownership_type",
          "mode",
        ],
      },
      {
        label: c.status,
        keys: [
          "status",
          "is_active",
        ],
      },
    ];
  }

  return [
    {
      label: c.movement,
      keys: [
        "movement_type",
        "type",
      ],
    },
    {
      label: c.item,
      keys: [
        "inventory_item_name",
        "item_name",
        "inventory_item",
      ],
    },
    {
      label: c.quantity,
      keys: [
        "quantity",
        "qty",
      ],
    },
    {
      label: c.from,
      keys: [
        "from_warehouse_name",
        "from_warehouse",
      ],
    },
    {
      label: c.to,
      keys: [
        "to_warehouse_name",
        "to_warehouse",
      ],
    },
    {
      label: c.date,
      keys: [
        "movement_date",
        "created_at",
        "date",
      ],
    },
  ];
}

export function EquipmentAssetsModule({
  session,
}: EquipmentAssetsModuleProps) {
  const language =
    useDocumentLanguage();

  const c =
    COPY[language] as typeof COPY.en;

  const rtl =
    language !== "en";

  const [sources, setSources] =
    useState<SourcesState>(
      emptySources,
    );

  const [loading, setLoading] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState<SourceKey>("serials");

  const [search, setSearch] =
    useState("");

  const load = useCallback(
    async () => {
      setLoading(true);

      setSources(
        emptySources(),
      );

      const tasks =
        SOURCE_ENDPOINTS.map(
          ([key, path]) =>
            api<
              Paginated<AnyRow>
            >(
              path,
              {},
              session,
            ).then((page) => ({
              key,
              page,
            })),
        );

      const results =
        await Promise.allSettled(
          tasks,
        );

      const next =
        emptySources();

      results.forEach(
        (
          result,
          index,
        ) => {
          const key =
            SOURCE_ENDPOINTS[
              index
            ][0];

          if (
            result.status ===
            "fulfilled"
          ) {
            next[key] = {
              ok: true,
              page:
                result.value.page,
              error: "",
            };
          } else {
            next[key] = {
              ok: false,
              page: null,
              error:
                result.reason instanceof
                Error
                  ? result.reason
                      .message
                  : String(
                      result.reason,
                    ),
            };
          }
        },
      );

      setSources(next);
      setLoading(false);
    },
    [
      session.access,
      session.tenantId,
      session.companyId,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const successCount =
    useMemo(
      () =>
        Object.values(
          sources,
        ).filter(
          (source) =>
            source.ok === true,
        ).length,
      [sources],
    );

  const connectionState =
    loading
      ? "loading"
      : successCount ===
          SOURCE_ENDPOINTS.length
        ? "connected"
        : successCount > 0
          ? "partial"
          : "unavailable";

  const connectionLabel =
    connectionState ===
    "loading"
      ? c.loading
      : connectionState ===
          "connected"
        ? c.connected
        : connectionState ===
            "partial"
          ? c.partial
          : c.unavailable;

  const source =
    sources[activeTab];

  const rawRows =
    source.page?.results ??
    [];

  const normalizedSearch =
    search.trim().toLowerCase();

  const rows =
    useMemo(() => {
      if (!normalizedSearch) {
        return rawRows;
      }

      return rawRows.filter(
        (row) =>
          JSON.stringify(row)
            .toLowerCase()
            .includes(
              normalizedSearch,
            ),
      );
    }, [
      rawRows,
      normalizedSearch,
    ]);

  const columns =
    columnsFor(
      activeTab,
      c,
    );

  const tabLabel = (
    key: SourceKey,
  ) => c[key];

  const kpis = [
    {
      key: "items" as const,
      icon: PackageSearch,
    },
    {
      key: "serials" as const,
      icon: Barcode,
    },
    {
      key: "stocks" as const,
      icon: Boxes,
    },
    {
      key:
        "assignments" as const,
      icon: Users,
    },
    {
      key:
        "movements" as const,
      icon: ArrowLeftRight,
    },
  ];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="space-y-4 pb-8"
    >
      <section className="glass-panel rounded-[1.75rem] border border-white/10 p-5 shadow-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-cyan-400">
              <Database className="h-5 w-5" />

              <span className="text-xs font-black uppercase tracking-widest">
                {c.realBackend}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {c.title}
            </h1>

            <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
              {c.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                connectionState ===
                "connected"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-500"
                  : connectionState ===
                      "partial"
                    ? "border-amber-400/30 bg-amber-500/10 text-amber-500"
                    : connectionState ===
                        "loading"
                      ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-500"
                      : "border-rose-400/30 bg-rose-500/10 text-rose-500"
              }`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : successCount >
                0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}

              {connectionLabel}
            </div>

            <button
              type="button"
              onClick={() =>
                void load()
              }
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-500 transition hover:bg-cyan-500/15 disabled:opacity-50"
            >
              <RefreshCcw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />

              {c.refresh}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.06] px-4 py-3 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">
          {c.canonicalNote}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(
          ({
            key,
            icon: Icon,
          }) => {
            const item =
              sources[key];

            return (
              <button
                type="button"
                key={key}
                onClick={() =>
                  setActiveTab(key)
                }
                className={`glass-panel rounded-2xl border p-4 text-start transition ${
                  activeTab === key
                    ? "border-cyan-400/40 bg-cyan-500/10"
                    : "border-white/10 hover:border-cyan-400/20"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <Icon className="h-5 w-5 text-cyan-500" />

                  {item.ok ===
                  false ? (
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  ) : item.ok ===
                    true ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                  )}
                </div>

                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {item.page
                    ?.count ?? "—"}
                </div>

                <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tabLabel(key)}
                </div>
              </button>
            );
          },
        )}

        <div className="glass-panel rounded-2xl border border-white/10 p-4">
          <Database className="mb-3 h-5 w-5 text-cyan-500" />

          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {successCount}/
            {SOURCE_ENDPOINTS.length}
          </div>

          <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {c.connectedSources}
          </div>
        </div>
      </section>

      <section className="glass-panel overflow-hidden rounded-[1.75rem] border border-white/10">
        <div className="border-b border-white/10 px-4 pt-3">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {TABS.map(
              ({
                key,
                icon: Icon,
              }) => {
                const active =
                  activeTab === key;

                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() =>
                      setActiveTab(
                        key,
                      )
                    }
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      active
                        ? "bg-cyan-500/15 text-cyan-500"
                        : "text-slate-500 hover:bg-white/5 hover:text-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />

                    {tabLabel(key)}

                    <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] dark:bg-white/5">
                      {sources[key]
                        .page
                        ?.count ??
                        "—"}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-black text-slate-900 dark:text-white">
                {tabLabel(
                  activeTab,
                )}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {source.ok === true
                  ? c.realBackend
                  : source.ok ===
                      false
                    ? c.failedEndpoint
                    : c.loading}
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${
                  rtl
                    ? "right-3"
                    : "left-3"
                }`}
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder={
                  c.search
                }
                className={`w-full rounded-xl border border-white/10 bg-black/[0.04] py-2 text-xs font-medium outline-none transition focus:border-cyan-400/40 dark:bg-white/[0.04] ${
                  rtl
                    ? "pr-9 pl-3"
                    : "pl-9 pr-3"
                }`}
              />
            </div>
          </div>

          {source.ok ===
          false ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-5">
              <div className="flex items-center gap-2 font-bold text-rose-500">
                <AlertTriangle className="h-5 w-5" />

                {c.failedEndpoint}
              </div>

              {source.error && (
                <div className="mt-2 break-all text-xs text-rose-400/80">
                  {source.error}
                </div>
              )}
            </div>
          ) : loading &&
            source.ok ===
              null ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-cyan-500" />
            </div>
          ) : rows.length ===
            0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <Database className="mb-3 h-9 w-9 text-slate-400/50" />

              <div className="font-black text-slate-700 dark:text-slate-300">
                {c.noRecords}
              </div>

              <div className="mt-1 max-w-md text-xs text-slate-500">
                {c.noRecordsDesc}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    {columns.map(
                      (
                        column,
                      ) => (
                        <th
                          key={
                            column.label
                          }
                          className="border-b border-white/10 px-3 py-3 text-start font-black text-slate-500"
                        >
                          {
                            column.label
                          }
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (
                      row,
                      index,
                    ) => (
                      <tr
                        key={String(
                          row.id ??
                            index,
                        )}
                        className="transition hover:bg-cyan-500/[0.04]"
                      >
                        {columns.map(
                          (
                            column,
                          ) => (
                            <td
                              key={
                                column.label
                              }
                              className="border-b border-white/[0.06] px-3 py-3 font-medium text-slate-700 dark:text-slate-300"
                            >
                              {pick(
                                row,
                                column.keys,
                              )}
                            </td>
                          ),
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default EquipmentAssetsModule;

// HQNATEX_EQUIPMENT_ASSETS_REAL_DATA_V1_END
