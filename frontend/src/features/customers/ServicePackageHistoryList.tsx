import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Package } from "lucide-react";

import {
  DataTable,
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

type PackageHistory = {
  id: string;
  tenant: string;
  company: string;
  customer_service: string;
  old_package: string | null;
  new_package: string | null;
  reason: string;
  created_at: string;
  updated_at: string;
};

type CustomerServiceOption = {
  id: string;
  customer_name: string;
  service_name: string;
  identifier: string;
  username: string;
};

type PackageOption = {
  id: string;
  code: string;
  name_english: string;
};

export function ServicePackageHistoryList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<PackageHistory[]>([]);

  const [services, setServices] =
    useState<CustomerServiceOption[]>([]);

  const [packages, setPackages] =
    useState<PackageOption[]>([]);

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

      const [
        historyRes,
        serviceRes,
        packageRes,
      ] = await Promise.all([
        fetchers.customerServicePackageHistory(
          session,
          params,
        ),

        fetchers.customerServices(
          session,
          "?ordering=name_english",
        ),

        fetchers.allPackages(
          session,
          "?page_size=100",
        ),
      ]);

      setData(historyRes.results);
      setTotalCount(historyRes.count);

      setServices(
        serviceRes.results,
      );

      setPackages(
        packageRes.results,
      );
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

  const serviceLabel = (
    id: string,
  ) => {
    const item =
      services.find(
        (service) =>
          service.id === id,
      );

    if (!item) {
      return id;
    }

    const ref =
      item.identifier ||
      item.username ||
      item.id.slice(0, 8);

    return `${item.customer_name} — ${item.service_name} — ${ref}`;
  };

  const packageLabel = (
    id: string | null,
  ) => {
    if (!id) {
      return t.customersServicesUi.noPackage;
    }

    const item =
      packages.find(
        (pkg) =>
          pkg.id === id,
      );

    return item
      ? `${item.code} — ${item.name_english}`
      : id;
  };

  const columns:
    Column<PackageHistory>[] = [
    {
      header: t.customersServicesUi.customerService,
      accessor: (row) =>
        serviceLabel(
          row.customer_service,
        ),
    },

    {
      header: t.customersServicesUi.oldPackage,
      accessor: (row) =>
        packageLabel(
          row.old_package,
        ),
    },

    {
      header: t.customersServicesUi.newPackage,
      accessor: (row) =>
        packageLabel(
          row.new_package,
        ),
    },

    {
      header: t.customersServicesUi.reason,
      accessor: (row) =>
        row.reason || "—",
    },

    {
      header: t.customersServicesUi.changedAt,
      accessor: (row) =>
        row.created_at
          ? new Date(
              row.created_at,
            ).toLocaleString("en-GB-u-ca-gregory")
          : "—",
      sortable: true,
      sortKey: "created_at",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 subscriber-workspace-page">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
          <Package className="h-5 w-5 text-cyan-300" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">
            {t.customersServicesUi.servicePackageHistory}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {t.customersServicesUi.servicePackageHistoryDesc}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-400/10 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
        {t.customersServicesUi.servicePackageHistoryReadOnlyNotice}
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
