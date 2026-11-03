import { SecondaryButton as SharedSecondaryButton, DetailField as Detail } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
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

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type InvoiceItem = {
  id: string;
  line_no: number;
  item_type: string;
  description_snapshot: string;
  quantity: string;
  unit_price: string;
  line_total: string;
};

type Invoice = {
  id: string;
  company: string;
  company_name: string;
  branch: string | null;
  branch_name: string | null;
  agency: string | null;
  agency_name: string | null;
  customer: string;
  customer_name: string;
  customer_service: string | null;
  sale: string;
  sale_number: string;
  invoice_number: string;
  status:
    | "issued"
    | "partial"
    | "paid"
    | "void";
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: string;
  discount_amount: string;
  total: string;
  issued_at: string;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
};

export function InvoiceList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<Invoice[]>([]);

  const [selected, setSelected] =
    useState<Invoice | null>(null);

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
        await fetchers.invoices(
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
    Column<Invoice>[] = [
    {
      header: t.finance.invoice,
      accessor: "invoice_number",
      className:
        "font-bold text-white",
      sortable: true,
    },

    {
      header: "Sale",
      accessor: "sale_number",
      className:
        "font-mono text-cyan-400",
    },

    {
      header: t.sales.date,
      accessor: (row) =>
        row.issue_date ||
        "—",
      sortKey: "issue_date",
      sortable: true,
    },

    {
      header: t.finance.customer,
      accessor: "customer_name",
      sortKey:
        "customer__display_name",
      sortable: true,
    },

    {
      header: t.sales.total,
      accessor: (row) =>
        `${row.total} ${row.currency}`,
      className:
        "font-mono text-end text-white",
      sortable: true,
      sortKey: "total",
    },

    {
      header: "Items",
      accessor: (row) =>
        String(
          row.items?.length || 0,
        ),
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
    <>
      <div className="space-y-6">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <ReceiptText className="h-5 w-5 text-cyan-300" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">
              Invoices
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Read-only invoices generated automatically when a sale is posted
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
          Invoice creation and editing are intentionally disabled. Source of truth: Posted Sale.
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
          actions={(row) => (
            <SharedSecondaryButton
              type="button"
              onClick={() =>
                setSelected(row)
              }
              className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400"
            >
              <Eye className="h-4 w-4" />
            </SharedSecondaryButton>
          )}
        />
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">

          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6">

            <div className="mb-6 flex items-center justify-between">

              <div>
                <h3 className="text-lg font-black text-white">
                  Invoice {selected.invoice_number}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Read-only billing document
                </p>
              </div>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              <Detail
                label="Sale"
                value={selected.sale_number}
              />

              <Detail
                label="Customer"
                value={selected.customer_name}
              />

              <Detail
                label="Status"
                value={selected.status}
              />

              <Detail
                label="Issue Date"
                value={selected.issue_date}
              />

              <Detail
                label="Due Date"
                value={
                  selected.due_date ||
                  "—"
                }
              />

              <Detail
                label="Subtotal"
                value={`${selected.subtotal} ${selected.currency}`}
              />

              <Detail
                label="Discount"
                value={`${selected.discount_amount} ${selected.currency}`}
              />

              <Detail
                label="Total"
                value={`${selected.total} ${selected.currency}`}
              />
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">

              <SharedDataTable native className="w-full text-sm">

                <thead className="bg-white/[0.04] text-slate-400">
                  <tr>
                    <th className="p-3 text-start">#</th>
                    <th className="p-3 text-start">Type</th>
                    <th className="p-3 text-start">Description</th>
                    <th className="p-3 text-end">Qty</th>
                    <th className="p-3 text-end">Unit Price</th>
                    <th className="p-3 text-end">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {selected.items?.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-t border-white/5"
                      >
                        <td className="p-3">
                          {item.line_no}
                        </td>

                        <td className="p-3 capitalize">
                          {item.item_type}
                        </td>

                        <td className="p-3 text-white">
                          {item.description_snapshot}
                        </td>

                        <td className="p-3 text-end font-mono">
                          {item.quantity}
                        </td>

                        <td className="p-3 text-end font-mono">
                          {item.unit_price}
                        </td>

                        <td className="p-3 text-end font-mono font-bold text-cyan-300">
                          {item.line_total}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </SharedDataTable>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


