import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchers,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

type Props = {
  session: Session;
};

type AgencyHistoryRow = {
  id: string;
  customer_service: string;
  customer_name?: string;
  service_identifier?: string;

  from_agency?: string | null;
  from_agency_name?: string;

  to_agency?: string | null;
  to_agency_name?: string;

  from_branch?: string | null;
  from_branch_name?: string;

  to_branch?: string | null;
  to_branch_name?: string;

  reason?: string;
  effective_date?: string | null;
  approved_by?: string;
  user_name?: string;
  notes?: string;

  created_at?: string;
  updated_at?: string;
};

type Notice = {
  type: "error";
  message: string;
};

const PAGE_SIZE = 25;

const COPY = {
  en: {
    title: "Agency History",
    subtitle:
      "Read-only history of customer service transfers between agencies and branches.",
    search:
      "Search customer, service, agency, branch, reason or user...",
    customer: "Customer",
    service: "Service",
    fromAgency: "From Agency",
    toAgency: "To Agency",
    fromBranch: "From Branch",
    toBranch: "To Branch",
    reason: "Reason",
    effectiveDate: "Effective Date",
    approvedBy: "Approved By",
    userName: "User",
    notes: "Notes",
    createdAt: "Recorded At",
    updatedAt: "Updated At",
    actions: "Actions",
    view: "View",
    details: "Agency Transfer Details",
    close: "Close",
    noRecords:
      "No agency transfer history found.",
    loading: "Loading...",
    loadFailed:
      "Unable to load agency history.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    records: "records",
    readOnly: "Read-only audit history",
  },

  fa: {
    title: "تاریخچه نمایندگی",
    subtitle:
      "تاریخچه فقط‌خواندنی انتقال خدمات مشترکین میان نمایندگی‌ها و شعبات.",
    search:
      "جستجو بر اساس مشترک، خدمت، نمایندگی، شعبه، دلیل یا کاربر...",
    customer: "مشترک",
    service: "خدمت",
    fromAgency: "نمایندگی قبلی",
    toAgency: "نمایندگی جدید",
    fromBranch: "شعبه قبلی",
    toBranch: "شعبه جدید",
    reason: "دلیل",
    effectiveDate: "تاریخ مؤثر",
    approvedBy: "تأییدکننده",
    userName: "کاربر",
    notes: "یادداشت",
    createdAt: "زمان ثبت",
    updatedAt: "زمان آخرین تغییر",
    actions: "عملیات",
    view: "مشاهده",
    details: "جزئیات انتقال نمایندگی",
    close: "بستن",
    noRecords:
      "هیچ تاریخچه انتقال نمایندگی موجود نیست.",
    loading: "در حال بارگذاری...",
    loadFailed:
      "تاریخچه نمایندگی بارگذاری نشد.",
    previous: "قبلی",
    next: "بعدی",
    page: "صفحه",
    records: "رکورد",
    readOnly: "تاریخچه ممیزی فقط‌خواندنی",
  },

  ps: {
    title: "د نمایندګۍ تاریخچه",
    subtitle:
      "د پېرودونکو د خدمتونو د نمایندګیو او څانګو ترمنځ د لېږد یوازې-لوستلو تاریخچه.",
    search:
      "د پېرودونکي، خدمت، نمایندګۍ، څانګې، دلیل یا کارن له مخې لټون...",
    customer: "پېرودونکی",
    service: "خدمت",
    fromAgency: "پخوانۍ نمایندګي",
    toAgency: "نوې نمایندګي",
    fromBranch: "پخوانۍ څانګه",
    toBranch: "نوې څانګه",
    reason: "دلیل",
    effectiveDate: "د اغېز نېټه",
    approvedBy: "تأییدوونکی",
    userName: "کارن",
    notes: "یادښت",
    createdAt: "د ثبت وخت",
    updatedAt: "د وروستي بدلون وخت",
    actions: "عملیات",
    view: "کتل",
    details: "د نمایندګۍ د لېږد جزئیات",
    close: "تړل",
    noRecords:
      "د نمایندګۍ د لېږد تاریخچه نشته.",
    loading: "بارېږي...",
    loadFailed:
      "د نمایندګۍ تاریخچه بار نه شوه.",
    previous: "مخکینی",
    next: "بل",
    page: "پاڼه",
    records: "ریکارډونه",
    readOnly:
      "یوازې-لوستلو د پلټنې تاریخچه",
  },
} as const;

function displayDateTime(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value;
  }

  return parsed.toLocaleString();
}

function valueOrDash(
  value?: string | null,
) {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : "—";
}

export function ServiceAgencyHistoryList({
  session,
}: Props) {
  const {
    t,
    language,
  } = useTranslation();

  const lang =
    language === "fa"
      ? "fa"
      : language === "ps"
        ? "ps"
        : "en";

  const c = COPY[lang];

  const [
    rows,
    setRows,
  ] = useState<
    AgencyHistoryRow[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    count,
    setCount,
  ] = useState(0);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selected,
    setSelected,
  ] = useState<
    AgencyHistoryRow | null
  >(null);

  const [
    notice,
    setNotice,
  ] = useState<
    Notice | null
  >(null);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        count / PAGE_SIZE,
      ),
    );

  const loadRows =
    async () => {
      setLoading(true);

      try {
        const data =
          await fetchers
            .customerServiceAgencyHistory(
              session,
              `?page=${page}&page_size=${PAGE_SIZE}`,
            );

        setRows(
          data.results ?? [],
        );

        setCount(
          data.count ?? 0,
        );

        setNotice(null);
      } catch (error) {
        setNotice({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : c.loadFailed,
        });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadRows();
  }, [page]);

  const filteredRows =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.customer_name,
            row.service_identifier,
            row.from_agency_name,
            row.to_agency_name,
            row.from_branch_name,
            row.to_branch_name,
            row.reason,
            row.approved_by,
            row.user_name,
            row.notes,
            row.effective_date,
            row.created_at,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(q),
            ),
      );
    }, [
      rows,
      search,
    ]);

  const fieldClass =
    "w-full rounded-2xl border border-slate-700/60 bg-white/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100";

  const detailRows =
    selected
      ? [
          [
            c.customer,
            selected.customer_name,
          ],
          [
            c.service,
            selected.service_identifier,
          ],
          [
            c.fromAgency,
            selected.from_agency_name,
          ],
          [
            c.toAgency,
            selected.to_agency_name,
          ],
          [
            c.fromBranch,
            selected.from_branch_name,
          ],
          [
            c.toBranch,
            selected.to_branch_name,
          ],
          [
            c.reason,
            selected.reason,
          ],
          [
            c.effectiveDate,
            selected.effective_date,
          ],
          [
            c.approvedBy,
            selected.approved_by,
          ],
          [
            c.userName,
            selected.user_name,
          ],
          [
            c.notes,
            selected.notes,
          ],
          [
            c.createdAt,
            displayDateTime(
              selected.created_at,
            ),
          ],
          [
            c.updatedAt,
            displayDateTime(
              selected.updated_at,
            ),
          ],
        ]
      : [];

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
              {
                t.customersServicesUi
                  .agencyHistory
              }
            </div>

            <h2 className="mt-1 text-2xl font-black text-slate-100 dark:text-white">
              {c.title}
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              {c.subtitle}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-50/80 px-4 py-3 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-400">
            {c.readOnly}
          </div>
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-700 dark:text-rose-300">
          {notice.message}
        </div>
      )}

      <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        <input
          value={search}
          onChange={(
            event,
          ) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder={c.search}
          className={fieldClass}
        />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/70 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-700/60 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-start">
                  {c.customer}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.service}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.fromAgency}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.toAgency}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.fromBranch}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.toBranch}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.effectiveDate}
                </th>

                <th className="px-4 py-3 text-start">
                  {c.actions}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    {c.loading}
                  </td>
                </tr>
              ) : filteredRows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    {c.noRecords}
                  </td>
                </tr>
              ) : (
                filteredRows.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-800/70 text-slate-700 last:border-0 hover:bg-cyan-50/30 dark:border-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-3">
                        {
                          valueOrDash(
                            row.customer_name,
                          )
                        }
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        {
                          valueOrDash(
                            row.service_identifier,
                          )
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          valueOrDash(
                            row.from_agency_name,
                          )
                        }
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {
                          valueOrDash(
                            row.to_agency_name,
                          )
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          valueOrDash(
                            row.from_branch_name,
                          )
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          valueOrDash(
                            row.to_branch_name,
                          )
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          valueOrDash(
                            row.effective_date,
                          )
                        }
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setSelected(
                              row,
                            )
                          }
                          className="rounded-xl border border-slate-700/60 px-3 py-1.5 text-xs font-bold transition hover:border-cyan-400/50 hover:text-cyan-700 dark:border-white/10 dark:hover:text-cyan-300"
                        >
                          {c.view}
                        </button>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-700/60 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <div>
            {c.page} {page}
            {" / "}
            {totalPages}
            {" · "}
            {count} {c.records}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage(
                  (
                    current,
                  ) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
              className="rounded-xl border border-slate-700/60 px-3 py-2 disabled:opacity-40 dark:border-white/10"
            >
              {c.previous}
            </button>

            <button
              type="button"
              disabled={
                page >= totalPages
              }
              onClick={() =>
                setPage(
                  (
                    current,
                  ) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                )
              }
              className="rounded-xl border border-slate-700/60 px-3 py-2 disabled:opacity-40 dark:border-white/10"
            >
              {c.next}
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/40 p-6 shadow-2xl dark:bg-slate-950">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
                  {c.readOnly}
                </div>

                <h3 className="mt-1 text-xl font-black text-slate-100 dark:text-white">
                  {c.details}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="rounded-xl border border-slate-700/60 px-3 py-2 text-slate-500 dark:border-white/10 dark:text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {detailRows.map(
                (
                  [
                    label,
                    value,
                  ],
                ) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-700/60 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.035]"
                  >
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {label}
                    </div>

                    <div className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-100 dark:text-slate-100">
                      {
                        valueOrDash(
                          value,
                        )
                      }
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-700/60 pt-5 dark:border-white/10">
              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-white dark:text-slate-950"
              >
                {c.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
