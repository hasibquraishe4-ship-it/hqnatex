import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "../lib/i18n";

export type ModuleHubCard = {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
};

type ModuleHubProps = {
  title: string;
  subtitle?: string;
  cards: ModuleHubCard[];
  onOpen: (id: string) => void;
};

export function ModuleHub({
  title,
  subtitle,
  cards,
  onOpen,
}: ModuleHubProps) {
  const { rtl } = useTranslation();

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400 overflow-visible">
      <section className="module-hub-header glass-panel rounded-[1.6rem] p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1.5 text-xs lg:text-sm font-medium text-slate-400 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      </section>

      <section className="module-hub-grid grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 overflow-visible">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.id}
              type="button"
              disabled={card.disabled}
              onClick={() => !card.disabled && onOpen(card.id)}
              className="
                group glass-panel module-hub-card min-h-[148px]
                rounded-[1.4rem] p-4.5 text-start
                transition-all duration-300
                hover:-translate-y-1
                hover:border-cyan-400/30
                hover:shadow-[0_20px_60px_rgba(6,182,212,0.12)]
                disabled:cursor-not-allowed disabled:opacity-40
                flex flex-col justify-between gap-3.5 relative overflow-hidden
              "
            >
              <div className="flex items-start justify-between gap-3">
                <div className="
                  flex h-11 w-11 items-center justify-center
                  rounded-xl border border-cyan-400/20
                  bg-cyan-400/10 text-cyan-400
                  transition-transform duration-300 group-hover:scale-110
                  shadow-[0_0_15px_rgba(34,211,238,0.15)]
                ">
                  <Icon className="h-5 w-5" />
                </div>

                {card.badge && (
                  <span className="
                    rounded-full border border-cyan-400/20 bg-cyan-400/5
                    px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300
                  ">
                    {card.badge}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                    {card.title}
                  </h3>

                  {!card.disabled && (
                    rtl ? (
                      <ArrowLeft className="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:-translate-x-1 group-hover:text-cyan-400" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-400" />
                    )
                  )}
                </div>

                {card.description && (
                  <p className="mt-1.5 text-xs leading-5 text-slate-400 line-clamp-2">
                    {card.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
