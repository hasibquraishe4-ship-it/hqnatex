import { type ReactNode, useState, useEffect } from "react";
import { 
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  MoreHorizontal, Download, Eye, Edit, Trash2, ShieldX,
  FileSpreadsheet, FileText, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { useTranslation } from "../lib/i18n";

export type Column<T> = {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
  sortable?: boolean;
  sortKey?: string;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  totalCount?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (term: string) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  title?: string;
  actions?: (row: T) => ReactNode;
  emptyMessage?: string;
  error?: string;
  noPermission?: boolean;
  filters?: ReactNode;
  className?: string;
};

export function DataTable<T>({ 
  columns, data, loading, totalCount = 0, pageSize = 10, onPageSizeChange,
  currentPage = 1, onPageChange, onSearch, onSort, title, actions,
  emptyMessage, error, noPermission, filters, className
}: Props<T>) {
  const { t, rtl } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchTerm);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const actualEmptyMessage = emptyMessage || t.common.noRecords;

  if (noPermission) {
    return (
      <div className="hq-data-table hq-table-denied glass-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <ShieldX className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{t.common.accessDenied}</h3>
        <p className="text-slate-500 max-w-sm">{t.common.accessDeniedDescription}</p>
      </div>
    );
  }

  return (
    <div className={`hq-data-table space-y-4 ${className ?? ""}`}>
      <div className="hq-table-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {title && <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>}
        
        <div className="hq-table-controls flex items-center gap-2">
          {onSearch && (
            <form onSubmit={handleSearch} className="relative group">
              <Search className={`absolute ${rtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors`} />
              <input
                type="text"
                placeholder={t.common.search}
                className={`glass-input ${rtl ? 'pr-10' : 'pl-10'} w-full sm:w-64 text-sm`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
          )}
          
          {filters && (
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`hq-table-filter-toggle p-2.5 rounded-xl border transition-all ${
                showFilters ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400" : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
          )}

          <div className="relative group/export">
            <button className="hq-table-export-toggle p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <Download className="h-4 w-4" />
            </button>
            <div className={`hq-table-export-menu absolute top-full ${rtl ? 'left-0' : 'right-0'} mt-2 w-48 glass-panel rounded-xl border border-white/10 py-1 opacity-0 pointer-events-none group-hover/export:opacity-100 group-hover/export:pointer-events-auto transition-all z-30 shadow-2xl`}>
              <button className="w-full px-4 py-2 text-start text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                {t.common.exportToExcel}
              </button>
              <button className="w-full px-4 py-2 text-start text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-rose-400" />
                {t.common.exportToPdf}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFilters && filters && (
        <div className="hq-table-filters glass-panel rounded-2xl p-4 border border-cyan-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
          {filters}
        </div>
      )}

      <div className="hq-table-panel glass-panel rounded-[1.25rem] overflow-hidden border border-[rgba(110,160,210,0.18)] shadow-2xl relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className={`w-full ${rtl ? 'text-right' : 'text-left'} border-collapse`}>
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/70">
                {columns.map((col, idx) => (
                  <th key={idx} className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${col.className}`}>
                    <div className={`flex items-center gap-2 ${rtl ? 'justify-start flex-row-reverse' : 'justify-start'}`}>
                      {col.sortable ? (
                        <button 
                          onClick={() => handleSort((col.sortKey || col.accessor) as string)}
                          className="flex items-center gap-2 hover:text-white transition-colors"
                        >
                          {col.header}
                          <ArrowUpDown className={`h-3 w-3 ${sortConfig?.key === (col.sortKey || col.accessor) ? 'text-cyan-400 opacity-100' : 'opacity-30'}`} />
                        </button>
                      ) : (
                        col.header
                      )}
                    </div>
                  </th>
                ))}
                {actions && <th className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${rtl ? 'text-start' : 'text-end'}`}>{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hq-table-loading animate-pulse">
                    {columns.map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 bg-white/5 rounded-full w-full"></div>
                      </td>
                    ))}
                    {actions && <td className="px-5 py-3.5"><div className={`h-4 bg-white/5 rounded-full w-8 ${rtl ? 'mr-0 ml-auto' : 'ml-auto mr-0'}`}></div></td>}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="hq-table-error px-5 py-12 text-center text-rose-400 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 opacity-50 mb-2" />
                      {error}
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="hq-table-empty px-5 py-12 text-center text-slate-500 font-medium italic">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                         <Search className="h-6 w-6 opacity-20" />
                      </div>
                      {actualEmptyMessage}
                      <p className="text-[10px] not-italic opacity-50 uppercase tracking-tighter mt-1">{t.common.tryAdjusting}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="group hover:bg-cyan-500/[0.035] transition-colors">
                    {columns.map((col, cidx) => (
                      <td key={cidx} className={`px-5 py-3.5 text-[13px] font-medium text-slate-200 ${col.className}`}>
                        {typeof col.accessor === "function" ? col.accessor(row) : (row[col.accessor] as ReactNode)}
                      </td>
                    ))}
                    {actions && (
                      <td className={`px-5 py-3.5 ${rtl ? 'text-start' : 'text-end'}`}>
                        <div className={`flex ${rtl ? 'justify-start' : 'justify-end'} gap-2`}>
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(totalCount > pageSize || totalCount > 0) && (
          <div className="hq-table-pagination px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
            <div className="flex items-center gap-4">
              <p className="text-xs text-slate-500 font-medium">
                {t.common.showing} <span className="text-white">{(currentPage - 1) * pageSize + 1}</span> {t.common.paginationTo} <span className="text-white">{Math.min(currentPage * pageSize, totalCount)}</span> {t.common.paginationOf} <span className="text-white">{totalCount}</span> {t.common.recordsLabel}
              </p>
              
              {onPageSizeChange && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>{t.common.showLabel}</span>
                  <select 
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="bg-transparent border-none outline-none text-white cursor-pointer hover:text-cyan-400 transition-colors"
                  >
                    {[10, 25, 50, 100].map(size => (
                      <option key={size} value={size} className="bg-slate-900">{size}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => onPageChange?.(currentPage - 1)}
                  className={`p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 transition-all ${rtl ? 'rotate-180' : ''}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1 px-2">
                   {/* Simplified pagination for now, can be expanded to handle many pages */}
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={i}
                        onClick={() => onPageChange?.(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          currentPage === p ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => onPageChange?.(currentPage + 1)}
                  className={`p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 transition-all ${rtl ? 'rotate-180' : ''}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export function StatusBadge({ status, type = 'default' }: { status: string, type?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const { t } = useTranslation();

  const localizedStatus = ({
    active: t.common.active,
    inactive: t.common.inactive,
    draft: t.common.draft,
    pending: t.common.pending,
    suspended: t.common.suspended,
    terminated: t.common.terminated,
    blocked: t.common.blocked,
    requested: t.common.requested,
    approved: t.common.approved,
    rejected: t.common.rejected,
    applied: t.common.applied,
    cancelled: t.common.cancelled,
    complete: t.common.complete,
    paid: t.common.paid,
    partial: t.common.partial,
    open: t.common.open,
    posted: t.common.posted,
    void: t.common.void,
  } as Record<string, string>)[status.toLowerCase()] ?? status;

  const autoType = (): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    if (type !== 'default') return type;
    const s = status.toLowerCase();
    if (['active', 'approved', 'complete', 'paid', 'posted', 'successful', 'success'].includes(s)) return 'success';
    if (['pending', 'requested', 'applied', 'partial', 'warning'].includes(s)) return 'warning';
    if (['inactive', 'rejected', 'cancelled', 'terminated', 'blocked', 'void', 'danger', 'failed'].includes(s)) return 'danger';
    if (['open', 'draft', 'info'].includes(s)) return 'info';
    return 'default';
  };

  const finalType = autoType();

  const configs = {
    default: "bg-slate-500/10 text-slate-300 border-slate-500/25",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-[0_0_10px_rgba(244,63,94,0.1)]",
    info: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25 shadow-[0_0_10px_rgba(34,211,238,0.1)]",
  };

  const getIcon = () => {
    switch (finalType) {
      case 'success': return <CheckCircle2 className="h-3 w-3" />;
      case 'danger': return <XCircle className="h-3 w-3" />;
      case 'warning': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${configs[finalType]}`}>
      {getIcon()}
      {localizedStatus}
    </span>
  );
}



