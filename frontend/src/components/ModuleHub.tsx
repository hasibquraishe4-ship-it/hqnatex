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
    <div className="hq-module-hub hq-module-menu space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400 overflow-visible">
      <section className="module-hub-header wp-card relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 h-40 w-40 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h2 className="hq-hub-title text-2xl lg:text-3xl font-black tracking-tight text-[#183a54]">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-xs font-medium text-[#526c80] lg:text-sm">
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
                group module-hub-card flex min-h-[82px] items-center gap-4
                rounded-[18px] border border-[#91bddb66] bg-[rgba(235,247,255,.72)] p-4 text-start
                transition-all duration-300
                hover:-translate-y-1
                hover:border-[#167deb66]
                hover:shadow-[0_12px_40px_rgba(7,44,75,.10)]
                disabled:cursor-not-allowed disabled:opacity-40
                relative overflow-hidden
              "
            >
              <div className="flex items-start justify-between gap-3">
                <div className="
                  hq-hub-icon flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-xl border border-[#91bddb66]
                  bg-[#d9effc] text-[#167deb]
                  transition-transform duration-300 group-hover:scale-110
                  shadow-[0_0_15px_rgba(34,211,238,0.15)]
                ">
                  <Icon className="h-5 w-5" />
                </div>

                {card.badge && (
                  <span className="
                    rounded-full border border-[#91bddb66] bg-white/60
                    px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#526c80]
                  ">
                    {card.badge}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="hq-hub-card-title text-base font-black text-[#183a54] transition-colors group-hover:text-[#167deb]">
                    {card.title}
                  </h3>

                  {!card.disabled && (
                    rtl ? (
                      <ArrowLeft className="h-4 w-4 text-[#526c80] transition-all duration-300 group-hover:-translate-x-1 group-hover:text-[#167deb]" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-[#526c80] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#167deb]" />
                    )
                  )}
                </div>

                {card.description && (
                  <p className="mt-1.5 text-xs leading-5 text-[#526c80] line-clamp-2">
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
