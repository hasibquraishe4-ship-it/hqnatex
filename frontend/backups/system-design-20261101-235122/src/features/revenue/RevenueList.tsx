import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Eye,
  ReceiptText,
  X,
} from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  fetchers,
  type Session,
} from "../../lib/api";

type Props = {
  session: Session;
};

type RevenueAllocation = {
  id: string;
  tenant: string;
  revenue_transaction: string;
  share_rule: string | null;
  allocation_type:
    | "partner"
    | "company_base"
    | "agency_gross"
    | "agency_tax"
    | "agency_net";
  percent: string | null;
  amount: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

type RevenueTransaction = {
  id: string;
  tenant: string;
  company: string;

  branch: string | null;

  agency: string | null;
  agency_name: string | null;

  sale: string;
  sale_number: string;

  sale_item: string;

  customer: string;
  customer_name: string;

  customer_service: string | null;

  service: string | null;
  service_name: string | null;

  share_rule: string | null;

  revenue_number: string;

  revenue_type:
    | "service"
    | "package"
    | "installation"
    | "rental"
    | "fee";

  recognition_date: string;
  gross_amount: string;
  currency: string;

  status:
    | "posted"
    | "reversed";

  share_status:
    | "allocated"
    | "not_applicable";

  allocations: RevenueAllocation[];

  created_at: string;
  updated_at: string;
};

export function RevenueList({
  session,
}: Props) {
  const [data, setData] =
    useState<RevenueTransaction[]>([]);

  const [selected, setSelected] =
    useState<RevenueTransaction | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [totalCount, setTotalCount] =
    useState(0);

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [error, setError] =
    useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let params =
        `?page=${page}&page_size=${pageSize}`;

      if (searchTerm) {
        params +=
          `&search=${encodeURIComponent(
            searchTerm,
          )}`;
      }

      if (sort) {
        params +=
          `&ordering=${
            sort.direction === "desc"
              ? "-"
              : ""
          }${sort.key}`;
      }

      const res =
        await fetchers.revenue(
          session,
          params,
        );

      setData(res.results);
      setTotalCount(res.count);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load revenue transactions.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    session,
    page,
    pageSize,
    searchTerm,
    sort,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const columns:
    Column<RevenueTransaction>[] = [
    {
      header: "Revenue Number",
      accessor:
        "revenue_number",
      sortable: true,
      className:
        "font-mono font-bold text-cyan-400",
    },

    {
      header: "Date",
      accessor: (row) =>
        row.recognition_date ||
        "—",
      sortKey:
        "recognition_date",
      sortable: true,
    },

    {
      header: "Customer",
      accessor:
        "customer_name",
      sortKey:
        "customer__display_name",
      sortable: true,
    },

    {
      header: "Sale",
      accessor:
        "sale_number",
      className:
        "font-mono text-xs",
    },

    {
      header: "Service",
      accessor: (row) =>
        row.service_name ||
        "—",
    },

    {
      header: "Agency",
      accessor: (row) =>
        row.agency_name ||
        "Central / No Agency",
    },

    {
      header: "Type",
      accessor: (row) => (
        <span className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold capitalize">
          {row.revenue_type}
        </span>
      ),
    },

    {
      header: "Gross Amount",
      accessor: (row) =>
        `${row.gross_amount} ${row.currency}`,
      className:
        "font-mono text-end text-white",
      sortKey:
        "gross_amount",
      sortable: true,
    },

    {
      header: "Revenue Status",
      accessor: (row) => (
        <StatusBadge
          status={row.status}
          type={
            row.status ===
            "posted"
              ? "success"
              : "danger"
          }
        />
      ),
      sortable: true,
    },

    {
      header: "Share Status",
      accessor: (row) => (
        <StatusBadge
          status={
            row.share_status
          }
          type={
            row.share_status ===
            "allocated"
              ? "success"
              : "default"
          }
        />
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <ReceiptText className="h-5 w-5 text-cyan-300" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">
              Revenue Transactions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Read-only financial revenue evidence generated from posted sales
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
          Revenue transactions and their allocation snapshots are generated by the backend. Manual create, edit and delete actions are intentionally unavailable.
        </div>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          totalCount={
            totalCount
          }
          currentPage={
            page
          }
          pageSize={
            pageSize
          }
          onPageChange={
            setPage
          }
          onPageSizeChange={
            setPageSize
          }
          onSearch={
            setSearchTerm
          }
          onSort={(
            key,
            direction,
          ) =>
            setSort({
              key,
              direction,
            })
          }
          error={error}
          actions={(row) => (
            <button
              type="button"
              onClick={() =>
                setSelected(row)
              }
              className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400 transition hover:text-white"
              title="View"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        />
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">

          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-black text-white">
                  Revenue {selected.revenue_number}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Read-only transaction and allocation snapshot
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              <Detail
                label="Revenue Number"
                value={
                  selected.revenue_number
                }
              />

              <Detail
                label="Sale Number"
                value={
                  selected.sale_number
                }
              />

              <Detail
                label="Customer"
                value={
                  selected.customer_name
                }
              />

              <Detail
                label="Service"
                value={
                  selected.service_name ||
                  "—"
                }
              />

              <Detail
                label="Agency"
                value={
                  selected.agency_name ||
                  "Central / No Agency"
                }
              />

              <Detail
                label="Revenue Type"
                value={
                  selected.revenue_type
                }
              />

              <Detail
                label="Recognition Date"
                value={
                  selected.recognition_date
                }
              />

              <Detail
                label="Gross Amount"
                value={`${selected.gross_amount} ${selected.currency}`}
              />

              <Detail
                label="Revenue Status"
                value={
                  selected.status
                }
              />

              <Detail
                label="Share Status"
                value={
                  selected.share_status
                }
              />

              <Detail
                label="Share Rule ID"
                value={
                  selected.share_rule ||
                  "—"
                }
              />

              <Detail
                label="Customer Service ID"
                value={
                  selected.customer_service ||
                  "—"
                }
              />
            </div>

            <div className="mt-6">

              <h4 className="mb-3 text-sm font-black text-white">
                Allocation Snapshot
              </h4>

              <div className="overflow-x-auto rounded-2xl border border-white/10">

                <table className="w-full text-sm">

                  <thead className="bg-white/[0.04] text-slate-400">
                    <tr>
                      <th className="p-3 text-start">
                        Type
                      </th>

                      <th className="p-3 text-end">
                        Percent
                      </th>

                      <th className="p-3 text-end">
                        Amount
                      </th>

                      <th className="p-3 text-start">
                        Rule
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {!selected.allocations ||
                    selected.allocations.length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-slate-500"
                        >
                          No allocation snapshot.
                        </td>
                      </tr>
                    ) : (
                      selected.allocations.map(
                        (allocation) => (
                          <tr
                            key={
                              allocation.id
                            }
                            className="border-t border-white/5"
                          >
                            <td className="p-3 font-bold capitalize text-white">
                              {allocation.allocation_type.replaceAll(
                                "_",
                                " ",
                              )}
                            </td>

                            <td className="p-3 text-end font-mono">
                              {allocation.percent ===
                              null
                                ? "—"
                                : `${allocation.percent}%`}
                            </td>

                            <td className="p-3 text-end font-mono font-bold text-cyan-300">
                              {allocation.amount}{" "}
                              {allocation.currency}
                            </td>

                            <td className="p-3 font-mono text-xs text-slate-500">
                              {allocation.share_rule ||
                                "—"}
                            </td>
                          </tr>
                        ),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-bold text-slate-100">
        {value}
      </p>
    </div>
  );
}
