import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  badge?: string;
  breadcrumb?: string;
};

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  badge,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="hq-page-header glass-panel rounded-[1.25rem] p-4 lg:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-center gap-3.5 relative z-10">
        {Icon && (
          <div className="hq-header-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.12)]">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          {breadcrumb && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              {breadcrumb}
            </p>
          )}
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              {title}
            </h1>
            {badge && (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 relative z-10">
          {actions}
        </div>
      )}
    </div>
  );
}
