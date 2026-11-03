import { useEffect, useState, useCallback } from "react";
import { Key } from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { fetchers, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

export function PermissionList({ session }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let params = `?page=${page}&page_size=${pageSize}`;
      if (searchTerm) params += `&search=${encodeURIComponent(searchTerm)}`;
      if (sort) params += `&ordering=${sort.direction === 'desc' ? '-' : ''}${sort.key}`;
      
      const res = await fetchers.permissions(session, params);
      setData(res.results);
      setTotalCount(res.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.noRecords);
    } finally {
      setLoading(false);
    }
  }, [session, page, pageSize, searchTerm, sort, t]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<any>[] = [
    { 
      header: "Key", 
      accessor: "key",
      className: "text-white font-mono text-[11px]",
      sortable: true
    },
    { 
      header: "Name", 
      accessor: "name",
      className: "text-white font-bold",
      sortable: true
    },
    { 
      header: "Description", 
      accessor: "description",
      className: "text-slate-400 text-xs"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Canonical Permissions</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">System-wide atomic permission registry.</p>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        loading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={setSearchTerm}
        onSort={(key, direction) => setSort({ key, direction })}
        error={error}
      />
    </div>
  );
}
