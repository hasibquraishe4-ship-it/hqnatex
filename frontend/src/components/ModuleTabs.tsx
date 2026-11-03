import { useState, type ReactNode } from "react";

export type ModuleTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type Props = {
  tabs: ModuleTab[];
};

export function ModuleTabs({ tabs }: Props) {
  const [active, setActive] = useState(
    tabs[0]?.id ?? ""
  );

  const current =
    tabs.find((tab) => tab.id === active) ??
    tabs[0];

  return (
    <div className="hq-module-tabs space-y-6">
      <div
        role="tablist"
        className="hq-module-tablist glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-fit max-w-full"
      >
        {tabs.map((tab) => {
          const selected = tab.id === current?.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.id)}
              className={`hq-module-tab px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                selected
                  ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {current?.content}
      </div>
    </div>
  );
}
