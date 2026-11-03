import { SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Eye, Terminal } from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { fetchers, type Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

export function AuditLogList({ session }: Props) {
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
      
      const res = await fetchers.auditLogs(session, params);
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
      header: t.audit.timestamp, 
      accessor: (row) => new Date(row.created_at).toLocaleString(),
      sortKey: "created_at",
      sortable: true,
      className: "font-mono text-[10px] text-slate-400"
    },
    { 
      header: t.audit.actor, 
      accessor: "actor_email",
      sortKey: "actor__email",
      sortable: true,
      className: "font-bold text-white"
    },
    { 
      header: t.audit.action, 
      accessor: (row) => (
        <span className="capitalize px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-bold text-cyan-400">
          {row.action}
        </span>
      ),
      sortable: true
    },
    { 
      header: t.audit.objectType, 
      accessor: "object_type",
      sortable: true 
    },
    { 
      header: t.audit.objectId, 
      accessor: "object_id",
      className: "font-mono text-[10px] text-slate-500"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass-panel rounded-3xl p-6 border border-cyan-400/15">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{t.audit.title}</h1>
            <p className="mt-1 text-sm text-slate-400">{t.audit.subtitle}</p>
          </div>
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
        actions={(row) => (
          <SharedSecondaryButton type="submit" className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <Terminal className="h-4 w-4" />
          </SharedSecondaryButton>
        )}
      />
    </div>
  );
}
