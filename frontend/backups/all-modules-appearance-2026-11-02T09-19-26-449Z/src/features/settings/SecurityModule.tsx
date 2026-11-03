import { SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import { useState } from "react";
import { ArrowLeft, Settings, ShieldCheck, Users } from "lucide-react";

import {
  ModuleHub,
  type ModuleHubCard,
} from "../../components/ModuleHub";

import { UserList } from "./UserList";
import { RoleList } from "./RoleList";
import { PermissionList } from "./PermissionList";

import type { Session } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type View = "hub" | "users" | "roles" | "permissions";

export function SecurityModule({ session }: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<View>("hub");

  const cards: ModuleHubCard[] = [
    {
      id: "users",
      title: t.securityModule.users,
      description: t.securityModule.usersDesc,
      icon: Users,
    },
    {
      id: "roles",
      title: t.securityModule.roles,
      description: t.securityModule.rolesDesc,
      icon: ShieldCheck,
    },
    {
      id: "permissions",
      title: t.securityModule.permissions,
      description: t.securityModule.permissionsDesc,
      icon: Settings,
    },
  ];

  if (view === "hub") {
    return (
      <ModuleHub
        title={t.securityModule.title}
        subtitle={t.securityModule.subtitle}
        cards={cards}
        onOpen={(id) => setView(id as View)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SharedSecondaryButton
        type="button"
        onClick={() => setView("hub")}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-400 transition-all hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-400"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t.securityModule.back}
      </SharedSecondaryButton>

      {view === "users" && <UserList session={session} />}
      {view === "roles" && <RoleList session={session} />}
      {view === "permissions" && <PermissionList session={session} />}
    </div>
  );
}
