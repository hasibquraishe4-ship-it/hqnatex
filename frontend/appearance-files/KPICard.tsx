import { useRef, type MouseEvent, type ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  subtitle?: string;
  loading?: boolean;
};

export function KPICard({
  title,
  value,
  icon,
  trend,
  subtitle,
  loading,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const rx = ((y / rect.height) - 0.5) * -12;
    const ry = ((x / rect.width) - 0.5) * 12;

    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;

    card.style.setProperty("--rx", `${rx}deg`);
    card.style.setProperty("--ry", `${ry}deg`);
    card.style.setProperty("--mx", `${px}%`);
    card.style.setProperty("--my", `${py}%`);
  };

  const handleLeave = () => {
    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");
  };

  return (
    <div className="hq-3d-scene">
      <div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="glass-card kpi-card-3d hq-real-3d-card rounded-[1.5rem] p-4 relative overflow-hidden group"
      >
        <div className="hq-3d-shine" />
        <div className="hq-3d-depth-bg" />

        <div className="flex items-start justify-between mb-3 relative z-10 hq-z-40">
          <div className="kpi-icon-3d hq-z-70 p-2.5 rounded-xl text-cyan-400">
            {icon}
          </div>

          {trend !== undefined && (
            <div
              className={`hq-z-50 flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border ${
                trend >= 0
                  ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                  : "text-rose-400 bg-rose-400/10 border-rose-400/20"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 relative z-10 hq-z-30">
            <div className="h-4 w-24 bg-white/10 rounded-full animate-pulse" />
            <div className="h-8 w-32 bg-white/15 rounded-full animate-pulse" />
          </div>
        ) : (
          <div className="relative z-10 hq-z-45">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              {title}
            </p>

            <div className="flex items-baseline gap-2">
              <h3 className="hq-z-80 text-xl font-black text-white tracking-tight">
                {value}
              </h3>
            </div>

            {subtitle && (
              <p className="mt-1 text-[10px] font-medium text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
