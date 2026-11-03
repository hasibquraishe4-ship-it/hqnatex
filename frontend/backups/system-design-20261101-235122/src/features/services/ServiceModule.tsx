import { useState } from "react";
import {
  ArrowLeft,
  Cpu,
  Link2,
  List,
  Package,
  RadioTower,
  Tags,
} from "lucide-react";

import {
  ModuleHub,
  type ModuleHubCard,
} from "../../components/ModuleHub";

import { ServiceCategoryList } from "./ServiceCategoryList";
import { ServiceList } from "./ServiceList";
import { PackageList } from "./PackageList";
import { TechnicalFieldList } from "./TechnicalFieldList";
import { TechnologyList } from "./TechnologyList";
import { ServiceTechnologyList } from "./ServiceTechnologyList";

import type { Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type ServiceView =
  | "hub"
  | "categories"
  | "services"
  | "packages"
  | "technical-fields"
  | "technologies"
  | "service-technologies";

export function ServiceModule({ session }: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<ServiceView>("hub");

  const cards: ModuleHubCard[] = [
    {
      id: "categories",
      title: t.serviceCatalog.categories,
      description: t.serviceCatalog.categoriesDesc,
      icon: Tags,
    },
    {
      id: "services",
      title: t.serviceCatalog.services,
      description: t.serviceCatalog.servicesDesc,
      icon: RadioTower,
    },
    {
      id: "packages",
      title: t.serviceCatalog.packages,
      description: t.serviceCatalog.packagesDesc,
      icon: Package,
    },
    {
      id: "technical-fields",
      title: t.serviceCatalog.technicalFields,
      description: t.serviceCatalog.technicalFieldsDesc,
      icon: List,
    },
    {
      id: "technologies",
      title: t.serviceCatalog.technologies,
      description: t.serviceCatalog.technologiesDesc,
      icon: Cpu,
    },
    {
      id: "service-technologies",
      title: t.serviceCatalog.serviceTechnologies,
      description: t.serviceCatalog.serviceTechnologiesDesc,
      icon: Link2,
    },
  ];

  if (view === "hub") {
    return (
      <ModuleHub
        title={t.serviceCatalog.title}
        subtitle={t.serviceCatalog.subtitle}
        cards={cards}
        onOpen={(id) => setView(id as ServiceView)}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button
        type="button"
        onClick={() => setView("hub")}
        className="
          inline-flex items-center gap-2
          rounded-xl
          border border-white/10
          bg-white/5
          px-4 py-2
          text-xs font-bold
          text-slate-400
          transition-all
          hover:border-cyan-400/20
          hover:bg-cyan-400/5
          hover:text-cyan-400
        "
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t.serviceCatalog.backToCatalog}
      </button>

      {view === "categories" && (
        <ServiceCategoryList session={session} />
      )}

      {view === "services" && (
        <ServiceList session={session} />
      )}

      {view === "packages" && (
        <PackageList session={session} />
      )}

      {view === "technical-fields" && (
        <TechnicalFieldList session={session} />
      )}

      {view === "technologies" && (
        <TechnologyList session={session} />
      )}

      {view === "service-technologies" && (
        <ServiceTechnologyList session={session} />
      )}
    </div>
  );
}
