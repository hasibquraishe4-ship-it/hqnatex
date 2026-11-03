import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  History,
} from "lucide-react";

import {
  DataTable,
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

export function RevenueAllocationList({
  session,
}: Props) {
  const [data, setData] =
    useState<RevenueAllocation[]>([]);

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
        await fetchers.revenueAllocations(
          session,
          params,
        );

      setData(res.results);
      setTotalCount(res.count);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load revenue allocations.",
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
    Column<RevenueAllocation>[] = [
    {
      header:
        "Revenue Transaction",
      accessor: (row) =>
        shortId(
          row.revenue_transaction,
        ),
      className:
        "font-mono text-cyan-400",
    },

    {
      header:
        "Allocation Type",
      accessor: (row) =>
        row.allocation_type.replaceAll(
          "_",
          " ",
        ),
      className:
        "font-bold capitalize text-white",
      sortable: true,
    },

    {
      header: "Percent",
      accessor: (row) =>
        row.percent === null
          ? "—"
          : `${row.percent}%`,
      className:
        "font-mono text-end",
    },

    {
      header: "Amount",
      accessor: (row) =>
        `${row.amount} ${row.currency}`,
      className:
        "font-mono font-bold text-end text-cyan-300",
      sortKey: "amount",
      sortable: true,
    },

    {
      header: "Share Rule",
      accessor: (row) =>
        row.share_rule
          ? shortId(
              row.share_rule,
            )
          : "—",
      className:
        "font-mono text-xs",
    },

    {
      header: "Created",
      accessor: (row) =>
        row.created_at
          ? new Date(
              row.created_at,
            ).toLocaleString()
          : "—",
      sortKey:
        "created_at",
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10">
          <History className="h-5 w-5 text-violet-300" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">
            Revenue Allocations
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Read-only allocation snapshots generated from effective share rules
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
        Allocation records are financial snapshots. Manual create, edit and delete actions are intentionally unavailable.
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
      />
    </div>
  );
}

function shortId(
  value: string,
) {
  if (!value) {
    return "—";
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(
    0,
    8,
  )}…${value.slice(-6)}`;
}
