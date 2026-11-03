import { useEffect, useState, useCallback } from "react";
import { Network, Plus, Eye, Edit } from "lucide-react";
import { DataTable, type Column, StatusBadge } from "../../components/DataTable";
import { fetchers, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

export function ResourceList({ session }: Props) {
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
      
      const res = await fetchers.noc(session, params);
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
      header: t.noc.code, 
      accessor: "code", 
      className: "font-mono text-cyan-400",
      sortable: true 
    },
    { 
      header: t.noc.name, 
      accessor: "name", 
      className: "text-white font-bold",
      sortable: true 
    },
    { 
      header: t.noc.type, 
      accessor: "resource_type",
      sortable: true
    },
    { header: t.settings.legalName, accessor: "company_name" },
    { 
      header: "Capacity", 
      accessor: (row) => `${row.capacity || '-'} ${row.unit || ''}`,
      className: "font-mono",
    },
    { 
      header: t.noc.status, 
      accessor: (row) => (
        <StatusBadge 
          status={t.common[row.status as keyof typeof t.common] || row.status} 
          type={row.status === 'active' ? 'success' : 'default'} 
        />
      ),
      sortable: true
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{t.noc.title}</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">{t.noc.subtitle}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
          <Plus className="h-4 w-4" />
          {t.common.saveChanges}
        </button>
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
        actions={(row) => (
          <>
            <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <Eye className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <Edit className="h-4 w-4" />
            </button>
          </>
        )}
      />
    </div>
  );
}
