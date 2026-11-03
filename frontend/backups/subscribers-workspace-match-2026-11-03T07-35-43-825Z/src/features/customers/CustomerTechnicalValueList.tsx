import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Wrench } from "lucide-react";

import {
  DataTable,
  type Column,
} from "../../components/DataTable";

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

type TechnicalValue = {
  id: string;
  tenant: string;
  company: string;

  customer_service: string;
  customer_name: string;

  service_identifier: string;
  service_code: string;
  service_name: string;

  technical_field: string;
  technical_field_key: string;
  technical_field_label_english: string;
  technical_field_label_dari: string;
  technical_field_label_pashto: string;
  field_type: string;
  required: boolean;

  key_snapshot: string;
  value: unknown;

  status: "active" | "inactive";

  created_at: string;
  updated_at: string;
};

function renderValue(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function CustomerTechnicalValueList({
  session,
}: Props) {
  const {
    t,
    language,
  } = useTranslation();

  const [data, setData] =
    useState<TechnicalValue[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | undefined>();

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(25);

  const [totalCount, setTotalCount] =
    useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result =
        await fetchers.customerServiceTechnicalValues(
          session,
          `?page=${page}&page_size=${pageSize}`,
        );

      setData(
        result.results as TechnicalValue[],
      );

      setTotalCount(
        result.count,
      );
    } catch (err) {
      setData([]);
      setTotalCount(0);

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
    t,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const technicalLabel = (
    row: TechnicalValue,
  ) => {
    if (
      language === "fa" &&
      row.technical_field_label_dari
    ) {
      return row.technical_field_label_dari;
    }

    if (
      language === "ps" &&
      row.technical_field_label_pashto
    ) {
      return row.technical_field_label_pashto;
    }

    return (
      row.technical_field_label_english ||
      row.key_snapshot
    );
  };

  const columns:
    Column<TechnicalValue>[] = [
    {
      header: t.customers.title,
      accessor: (row) =>
        row.customer_name || "—",
    },
    {
      header:
        t.customersServicesUi.customerService,
      accessor: (row) =>
        row.service_identifier || "—",
      className:
        "font-mono text-cyan-300",
    },
    {
      header: t.services.name,
      accessor: (row) =>
        row.service_name ||
        row.service_code ||
        "—",
    },
    {
      header:
        t.customersServicesUi.technicalField,
      accessor: technicalLabel,
    },
    {
      header:
        t.customersServicesUi.key,
      accessor: (row) =>
        row.key_snapshot || "—",
      className:
        "font-mono text-xs",
    },
    {
      header:
        t.customersServicesUi.fieldType,
      accessor: (row) =>
        row.field_type || "—",
    },
    {
      header:
        t.customersServicesUi.technicalValue,
      accessor: (row) =>
        renderValue(row.value),
      className:
        "font-mono text-cyan-200",
    },
    {
      header:
        t.customersServicesUi.status,
      accessor: (row) => (
        <span
          className={
            row.status === "active"
              ? "rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300"
              : "rounded-lg border border-slate-400/20 bg-slate-400/10 px-2.5 py-1 text-xs font-bold text-slate-400"
          }
        >
          {
            t.common[
              row.status as keyof typeof t.common
            ] || row.status
          }
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SharedPageHeader native as="div" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <Wrench className="h-5 w-5 text-cyan-300" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">
              {
                t.customersServicesUi
                  .customerTechnicalData
              }
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {
                t.customersServicesUi
                  .customerTechnicalDataDesc
              }
            </p>
          </div>
        </div>

        <div className="hq-visual-panel rounded-xl border border-white/10 bg-white/5 px-4 py-2">
          <span className="text-xs text-slate-500">
            {t.common.recordsLabel}
          </span>

          <span className="ms-2 font-mono text-sm font-black text-cyan-300">
            {totalCount}
          </span>
        </div>
      </SharedPageHeader>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
