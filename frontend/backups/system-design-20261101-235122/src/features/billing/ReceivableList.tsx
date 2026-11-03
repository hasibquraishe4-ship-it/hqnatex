import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Receipt } from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  fetchers,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type Receivable = {
  id: string;
  invoice: string;
  invoice_number: string;
  customer: string;
  customer_name: string;
  original_amount: string;
  allocated_amount: string;
  outstanding_amount: string;
  currency: string;
  status:
    | "open"
    | "partial"
    | "paid"
    | "void";
  created_at: string;
  updated_at: string;
};

export function ReceivableList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<Receivable[]>([]);

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
        await fetchers.receivables(
          session,
          params,
        );

      setData(res.results);
      setTotalCount(res.count);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.common.noRecords,
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
    t,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const columns:
    Column<Receivable>[] = [
    {
      header: t.finance.customer,
      accessor: "customer_name",
      sortable: true,
      sortKey:
        "customer__display_name",
    },

    {
      header: t.finance.invoice,
      accessor: "invoice_number",
      className:
        "font-bold text-white",
    },

    {
      header: t.finance.original,
      accessor: (row) =>
        `${row.original_amount} ${row.currency}`,
      className:
        "font-mono text-end text-white",
    },

    {
      header: t.finance.allocated,
      accessor: (row) =>
        `${row.allocated_amount} ${row.currency}`,
      className:
        "font-mono text-end text-emerald-400",
    },

    {
      header: t.finance.outstanding,
      accessor: (row) =>
        `${row.outstanding_amount} ${row.currency}`,
      className:
        "font-mono text-end text-rose-400",
    },

    {
      header: t.finance.status,
      accessor: (row) => (
        <StatusBadge
          status={row.status}
          type={
            row.status === "paid"
              ? "success"
              : row.status ===
                  "partial"
                ? "warning"
                : row.status ===
                    "void"
                  ? "danger"
                  : "default"
          }
        />
      ),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
          <Receipt className="h-5 w-5 text-cyan-300" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">
            Receivables
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Read-only outstanding balances generated from posted sales
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
        Receivable status and balances are controlled automatically by posted payment allocations.
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={
          setPageSize
        }
        onSearch={setSearchTerm}
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
