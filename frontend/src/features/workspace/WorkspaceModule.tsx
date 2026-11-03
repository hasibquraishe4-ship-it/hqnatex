import { getTranslation as getUiTranslation } from "../../i18n";
import { Select as SharedSelect, Pagination as SharedPagination, SecondaryButton as SharedSecondaryButton, PrimaryButton as SharedPrimaryButton, FilterBar as SharedFilterBar } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { LayoutDashboard, FolderKanban, ClipboardList, FileText, BriefcaseBusiness, Mail, Archive, ChartNoAxesColumnIncreasing, Activity } from "lucide-react";

import {
  useEffect, useRef, useState, type FormEvent,
} from "react";
import {
  api, workspaceFileBlob, type Paginated, type Session,
} from "../../lib/api";
import { useTranslation } from "../../lib/i18n";
import { ProjectsModule } from "./ProjectsModule";
import { WorkspaceExtraModule, type ExtraTab } from "./WorkspaceExtraModule";

type Row = Record<string, unknown> & { id: string };
type Tr = (key: string) => string;
type Kind = "tasks" | "documents";
type Form = Record<string, string>;

const baseCss = "\n      .wp-projects{color:#183a54}\n      .wp-projects .wp-card,.wp-projects dialog{\n        border:1px solid #ffffff88;border-radius:20px;\n        background:rgba(235,247,255,.72);backdrop-filter:blur(22px);\n        box-shadow:0 12px 40px #072c4b18;padding:20px\n      }\n      .wp-projects button{border:1px solid #91bddb66;border-radius:10px;padding:10px 14px;\n        background:rgba(255,255,255,.5);font:inherit}\n      .wp-projects button:disabled{opacity:.5}\n      .wp-projects .wp-primary{background:#167deb;color:white}\n      .wp-projects :is(input,select,textarea){box-sizing:border-box;width:100%;min-width:0;\n        border:1px solid #91bddb88;border-radius:10px;padding:10px 12px;\n        background:rgba(255,255,255,.48);color:inherit;font:inherit;font-size:16px}\n      .wp-projects label>span{display:block;margin-bottom:7px;font-weight:700}\n      .wp-projects .wp-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}\n      .wp-projects .wp-bar input{flex:1 1 200px;width:auto}\n      .wp-projects .wp-bar select{width:auto;max-width:100%}\n      .wp-projects table{width:100%;min-width:720px;border-collapse:collapse;text-align:start}\n      .wp-projects :is(th,td){padding:12px;border-bottom:1px solid #91bddb44;text-align:start}\n      .wp-projects dialog{position:fixed;inset:0;margin:auto;padding:0;\n        width:min(960px,calc(100vw - 24px));max-width:calc(100vw - 24px);\n        max-height:calc(100dvh - 24px);color:inherit;overflow:hidden}\n      .wp-projects dialog::backdrop{background:#05142666;backdrop-filter:blur(4px)}\n      .wp-projects dialog form{display:flex;flex-direction:column;max-height:calc(100dvh - 26px)}\n      .wp-projects dialog header,.wp-projects dialog footer{display:flex;align-items:center;\n        justify-content:space-between;gap:12px;padding:16px 20px;flex-shrink:0}\n      .wp-projects .wp-body{overflow-y:auto;min-height:0;padding:20px}\n      .wp-projects .wp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));\n        gap:18px;min-width:0;border:0;padding:0;margin:0}\n      .wp-projects .wp-wide{grid-column:1/-1}\n      .wp-projects .wp-picker-pages{display:flex;align-items:center;gap:8px;margin-top:8px}\n      .wp-projects [role=alert]{color:#b4233a;white-space:pre-wrap;overflow-wrap:anywhere}\n      .hq-shell[data-theme=dark] .wp-projects{color:#e7f4ff}\n      .hq-shell[data-theme=dark] .wp-projects :is(.wp-card,dialog){background:rgba(13,39,61,.82)}\n      .hq-shell[data-theme=dark] .wp-projects :is(input,select,textarea,button){background-color:#163c5988}\n      .hq-shell[data-theme=dark] .wp-projects option{background:#12334d;color:#e7f4ff}\n      .hq-shell[data-theme=light] .wp-projects option{background:#eff8ff;color:#183a54}\n      @media(max-width:639px){.wp-projects .wp-grid{grid-template-columns:minmax(0,1fr)}\n        .wp-projects .wp-card{padding:14px}.wp-projects .wp-body{padding:14px}}\n\n      /* PROJECT_FORM_READABILITY_V1 */\n      .wp-projects dialog {\n        --wp-text:#183a54;\n        --wp-label:#294e69;\n        --wp-muted:#526c80;\n        color:var(--wp-text)!important;\n      }\n      .hq-shell[data-theme=dark] .wp-projects dialog {\n        --wp-text:#edf7ff;\n        --wp-label:#d4e8f7;\n        --wp-muted:#abc7dc;\n      }\n      .wp-projects dialog label,\n      .wp-projects dialog label>span {\n        color:var(--wp-label)!important;\n        opacity:1!important;\n        -webkit-text-fill-color:currentColor;\n      }\n      .wp-projects dialog label>span {\n        font-size:14px;\n        line-height:1.6;\n        font-weight:700;\n      }\n      .wp-projects dialog :is(input,select,textarea) {\n        color:var(--wp-text)!important;\n        -webkit-text-fill-color:currentColor;\n        opacity:1;\n      }\n      .wp-projects dialog input::placeholder,\n      .wp-projects dialog textarea::placeholder {\n        color:var(--wp-muted)!important;\n        opacity:1;\n      }\n      .wp-projects dialog :is(header,footer,h3),\n      .wp-projects dialog button:not(.wp-primary),\n      .wp-projects dialog .wp-picker-pages {\n        color:var(--wp-text)!important;\n      }\n      .wp-projects dialog .wp-primary {\n        color:#fff!important;\n      }\n      .wp-projects dialog input:is([type=date],[type=number]) {\n        direction:ltr;\n      }\n      .wp-projects dialog input[type=date] {\n        color-scheme:light;\n      }\n      .hq-shell[data-theme=dark] .wp-projects dialog input[type=date] {\n        color-scheme:dark;\n      }\n\n      /* PROJECT_MODAL_CONTENT_SIZE_V1 */\n      .hq-shell {\n        --wp-modal-sidebar:0px;\n      }\n      @media(min-width:1024px) {\n        .hq-shell[data-sidebar-hidden=\"false\"] {\n          --wp-modal-sidebar:var(--hq-sidebar-width-compact-lg,236px);\n        }\n      }\n      @media(min-width:1280px) {\n        .hq-shell[data-sidebar-hidden=\"false\"] {\n          --wp-modal-sidebar:var(--hq-sidebar-width-compact-xl,248px);\n        }\n      }\n      @media(min-width:1440px) {\n        .hq-shell[data-sidebar-hidden=\"false\"] {\n          --wp-modal-sidebar:var(--hq-sidebar-width-compact-2xl,252px);\n        }\n      }\n      .hq-shell .wp-projects dialog[open] {\n        position:fixed!important;\n        inset:12px!important;\n        inset-inline-start:calc(var(--wp-modal-sidebar) + 12px)!important;\n        margin:0!important;\n        width:auto!important;\n        max-width:none!important;\n        height:calc(100dvh - 24px)!important;\n        max-height:calc(100dvh - 24px)!important;\n        box-sizing:border-box;\n        overflow:hidden!important;\n      }\n      .hq-shell .wp-projects dialog[open] > form {\n        display:flex;\n        flex-direction:column;\n        height:100%!important;\n        max-height:100%!important;\n        min-height:0;\n        margin:0;\n        overflow:hidden;\n      }\n      .hq-shell .wp-projects dialog > form > :is(header,footer) {\n        flex:0 0 auto;\n      }\n      .hq-shell .wp-projects dialog > form > .wp-body {\n        flex:1 1 0%;\n        min-height:0;\n        overflow-y:auto;\n        overflow-x:hidden;\n        overscroll-behavior:contain;\n      }\n      .hq-shell .wp-projects dialog .wp-grid > * {\n        min-width:0;\n      }\n      @media(max-width:639px) {\n        .hq-shell .wp-projects dialog[open] {\n          inset:8px!important;\n          height:calc(100dvh - 16px)!important;\n          max-height:calc(100dvh - 16px)!important;\n          border-radius:16px;\n        }\n      }\n\n      /* PROJECT_SELECT_TEXT_V1 */\n      .hq-shell .wp-projects dialog select {\n        height:48px!important;\n        min-height:48px!important;\n        padding-block:6px!important;\n        padding-inline-start:14px!important;\n        padding-inline-end:36px!important;\n        font-family:inherit!important;\n        font-size:16px!important;\n        font-weight:500!important;\n        line-height:normal!important;\n        text-align:start!important;\n        text-indent:0!important;\n        white-space:nowrap!important;\n        opacity:1!important;\n        appearance:auto!important;\n        background-image:none!important;\n        -webkit-text-fill-color:currentColor!important;\n      }\n      .hq-shell .wp-projects dialog select option {\n        font-size:16px!important;\n        font-family:inherit!important;\n      }\n\n      /* PROJECT_FILTER_TEXT_V1 */\n      .hq-shell .wp-projects .wp-card > .wp-bar > select {\n        height:44px!important;\n        min-height:44px!important;\n        min-width:170px;\n        max-width:100%;\n        padding-block:6px!important;\n        padding-inline-start:14px!important;\n        padding-inline-end:36px!important;\n        font-family:inherit!important;\n        font-size:16px!important;\n        font-weight:500!important;\n        line-height:normal!important;\n        text-align:start!important;\n        text-indent:0!important;\n        white-space:nowrap!important;\n        appearance:auto!important;\n        background-image:none!important;\n        color:inherit!important;\n        -webkit-text-fill-color:currentColor!important;\n        opacity:1!important;\n      }\n      .hq-shell .wp-projects .wp-card > .wp-bar > select option {\n        font-family:inherit!important;\n        font-size:16px!important;\n      }\n      @media(max-width:639px) {\n        .hq-shell .wp-projects .wp-card > .wp-bar > select {\n          min-width:0;\n          flex:1 1 170px;\n        }\n      }\n    ";
const base = "/api/v1/workspace/";
const words: Record<string, [string, string, string]> = { "projects": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["projects"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["projects"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["projects"]], "tasks": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["tasks"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["tasks"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["tasks"]], "documents": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["documents"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["documents"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["documents"]], "new": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["new"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["new"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["new"]], "edit": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["edit"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["edit"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["edit"]], "title": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["title"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["title"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["title"]], "description": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["description"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["description"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["description"]], "project": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["project"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["project"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["project"]], "assigned_to": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["assigned_to"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["assigned_to"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["assigned_to"]], "status": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["status"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["status"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["status"]], "priority": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["priority"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["priority"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["priority"]], "due_on": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["due_on"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["due_on"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["due_on"]], "completed_at": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["completed_at"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["completed_at"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["completed_at"]], "reference_number": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["reference_number"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["reference_number"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["reference_number"]], "category": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["category"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["category"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["category"]], "issued_on": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["issued_on"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["issued_on"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["issued_on"]], "expires_on": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["expires_on"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["expires_on"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["expires_on"]], "todo": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["todo"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["todo"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["todo"]], "in_progress": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["in_progress"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["in_progress"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["in_progress"]], "blocked": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["blocked"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["blocked"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["blocked"]], "done": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["done"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["done"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["done"]], "cancelled": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["cancelled"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["cancelled"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["cancelled"]], "low": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["low"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["low"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["low"]], "normal": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["normal"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["normal"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["normal"]], "high": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["high"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["high"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["high"]], "urgent": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["urgent"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["urgent"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["urgent"]], "active": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["active"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["active"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["active"]], "archived": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["archived"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["archived"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["archived"]], "contract": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["contract"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["contract"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["contract"]], "license": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["license"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["license"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["license"]], "letter": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["letter"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["letter"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["letter"]], "technical": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["technical"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["technical"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["technical"]], "financial": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["financial"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["financial"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["financial"]], "other": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["other"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["other"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["other"]], "search": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["search"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["search"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["search"]], "refresh": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["refresh"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["refresh"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["refresh"]], "all": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["all"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["all"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["all"]], "save": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["save"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["save"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["save"]], "saving": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["saving"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["saving"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["saving"]], "cancel": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["cancel"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["cancel"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["cancel"]], "close": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["close"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["close"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["close"]], "previous": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["previous"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["previous"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["previous"]], "next": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["next"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["next"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["next"]], "loading": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["loading"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["loading"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["loading"]], "empty": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["empty"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["empty"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["empty"]], "unassigned": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["unassigned"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["unassigned"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["unassigned"]], "current": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["current"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["current"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["current"]], "optional": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["optional"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["optional"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["optional"]], "file": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["file"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["file"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["file"]], "download": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["download"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["download"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["download"]], "nofile": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["nofile"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["nofile"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["nofile"]], "filehint": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["filehint"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["filehint"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["filehint"]], "badfile": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["badfile"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["badfile"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["badfile"]], "archivedhint": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["archivedhint"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["archivedhint"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["archivedhint"]], "partial": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["partial"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["partial"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["partial"]], "saved": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["saved"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["saved"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["saved"]], "page": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["page"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["page"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["page"]], "count": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["count"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["count"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["count"]], "actions": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["actions"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["actions"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["actions"]], "requiredproject": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["requiredproject"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["requiredproject"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["requiredproject"]], "dashboard": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["dashboard"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["dashboard"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["dashboard"]], "contracts": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["contracts"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["contracts"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["contracts"]], "correspondence": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["correspondence"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["correspondence"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["correspondence"]], "archive": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["archive"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["archive"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["archive"]], "reports": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["reports"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["reports"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["reports"]], "activity": [getUiTranslation("en").featureCopy.workspace_WorkspaceModule.words["activity"], getUiTranslation("fa").featureCopy.workspace_WorkspaceModule.words["activity"], getUiTranslation("ps").featureCopy.workspace_WorkspaceModule.words["activity"]] };
const states = {
  tasks:["todo","in_progress","blocked","done","cancelled"],
  documents:["active","archived"],
};
const priorities = ["low","normal","high","urgent"];
const categories = ["contract","license","letter","technical","financial","other"];
function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}
function rowsOf(data: Row[] | Paginated<Row>): Row[] {
  return Array.isArray(data) ? data : data.results;
}
function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
function initial(kind: Kind): Form {
  return kind === "tasks"
    ? {title:"",description:"",project:"",assigned_to:"",status:"todo",
       priority:"normal",due_on:""}
    : {title:"",description:"",project:"",reference_number:"",
       category:"other",status:"active",issued_on:"",expires_on:""};
}
function rowLabel(row: Row) {
  return [str(row.code), str(row.title || row.name || row.email)]
    .filter(Boolean).join(" — ") || row.id;
}

function RelationPicker({session,path,value,label,onChange,disabled,tr,required=false}:{
  session:Session;path:string;value:string;label:string;
  onChange:(id:string)=>void;disabled:boolean;tr:Tr;required?:boolean;
}) {
  const [page,setPage]=useState(1);
  const [rows,setRows]=useState<Row[]>([]);
  const [next,setNext]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    let active=true;
    setBusy(true);setError("");setRows([]);
    api<Row[]|Paginated<Row>>(
      `${base}${path}?page=${page}`,{signal:controller.signal},session,
    ).then(data=>{
      if(!active)return;
      setRows(rowsOf(data));setNext(!Array.isArray(data)&&Boolean(data.next));
    }).catch(error=>{if(active)setError(message(error));})
      .finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;controller.abort();};
  },[path,page,session.access,session.tenantId,session.companyId]);
  return <div>
    <SharedSelect aria-label={label} value={value} required={required}
      disabled={disabled||busy} onChange={e=>onChange(e.target.value)}>
      <option value="">{busy?tr("loading"):tr("unassigned")}</option>
      {value&&!rows.some(row=>row.id===value)&&
        <option value={value}>{label||tr("current")}</option>}
      {rows.map(row=><option key={row.id} value={row.id}>{rowLabel(row)}</option>)}
    </SharedSelect>
    {(page>1||next)&&<SharedPagination className="wp-picker-pages">
      <SharedSecondaryButton type="button" disabled={disabled||busy||page===1}
        onClick={()=>setPage(p=>p-1)}>{tr("previous")}</SharedSecondaryButton>
      <span>{page}</span>
      <SharedSecondaryButton type="button" disabled={disabled||busy||!next}
        onClick={()=>setPage(p=>p+1)}>{tr("next")}</SharedSecondaryButton>
    </SharedPagination>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}

function Records({session,kind,tr,refreshToken}:{
  session:Session;kind:Kind;tr:Tr;refreshToken:number;
}) {
  const [rows,setRows]=useState<Row[]>([]);
  const [page,setPage]=useState(1);
  const [count,setCount]=useState(0);
  const [next,setNext]=useState(false);
  const [term,setTerm]=useState("");
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("");
  const [extra,setExtra]=useState("");
  const [version,setVersion]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [editing,setEditing]=useState(false);
  const [selected,setSelected]=useState<Row|null>(null);
  const [form,setForm]=useState<Form>(initial(kind));
  const [file,setFile]=useState<File|null>(null);
  const [saveError,setSaveError]=useState("");
  const [saving,setSaving]=useState(false);
  const [downloading,setDownloading]=useState("");
  const dialog=useRef<HTMLDialogElement>(null);
  const saveLock=useRef(false);
  const savedId=useRef("");
  const alive=useRef(true);
  const actionController=useRef<AbortController|null>(null);
  const extraKey=kind==="tasks"?"priority":"category";
  const choices=kind==="tasks"?priorities:categories;
  const path=`${base}${kind}/`;

  useEffect(()=>{
    alive.current=true;
    return()=>{
      alive.current=false;
      actionController.current?.abort();
    };
  },[,refreshToken]);
  useEffect(()=>{
    const controller=new AbortController();
    let active=true;
    setBusy(true);setError("");setRows([]);
    const query=new URLSearchParams({
      page:String(page),search,status,[extraKey]:extra,
    });
    api<Row[]|Paginated<Row>>(`${path}?${query}`,
      {signal:controller.signal},session,
    ).then(data=>{
      if(!active)return;
      setRows(rowsOf(data));
      setCount(Array.isArray(data)?data.length:data.count);
      setNext(!Array.isArray(data)&&Boolean(data.next));
    }).catch(error=>{if(active)setError(message(error));})
      .finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;controller.abort();};
  },[path,page,search,status,extra,extraKey,version,
     session.access,session.tenantId,session.companyId]);

  useEffect(()=>{
    if(!editing||!dialog.current)return;
    const panel=dialog.current;
    const previous=document.activeElement as HTMLElement|null;
    if(!panel.open)panel.showModal();
    return()=>{
      if(panel.open)panel.close();
      if(previous?.isConnected)previous.focus();
    };
  },[editing]);

  function open(row:Row|null) {
    const values=initial(kind);
    if(row)for(const key of Object.keys(values))values[key]=str(row[key]);
    setSelected(row);setForm(values);setFile(null);
    setSaveError("");setNotice("");savedId.current=row?.id||"";
    setEditing(true);
  }
  function change(key:string,value:string) {
    setForm(previous=>({...previous,[key]:value}));
  }
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(saveLock.current)return;
    setSaveError("");
    if(kind==="tasks"&&!form.project){
      setSaveError(tr("requiredproject"));return;
    }
    if(file&&(
      file.size===0||file.size>10*1024*1024||
      !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)
    )){
      setSaveError(tr("badfile"));return;
    }
    if(file&&form.status==="archived"){
      setSaveError(tr("archivedhint"));return;
    }
    saveLock.current=true;setSaving(true);
    const controller=new AbortController();
    actionController.current=controller;
    let metadataSaved=false;
    try{
      const payload:Record<string,string|null>={...form};
      for(const key of ["project","assigned_to","due_on","issued_on","expires_on"]){
        if(key in payload&&!payload[key])payload[key]=null;
      }
      const id=savedId.current;
      const result=await api<Row>(
        id?`${path}${encodeURIComponent(id)}/`:path,
        {method:id?"PATCH":"POST",body:JSON.stringify(payload),
         signal:controller.signal},session,
      );
      metadataSaved=true;
      savedId.current=result.id;
      if(!alive.current)return;
      setSelected(result);
      if(kind==="documents"&&file){
        const body=new FormData();
        body.append("file",file,file.name);
        await api<Row>(`${path}${encodeURIComponent(result.id)}/upload/`,
          {method:"POST",body,signal:controller.signal},session);
      }
      if(!alive.current)return;
      setEditing(false);setPage(1);setVersion(v=>v+1);
      setNotice(tr("saved"));
    }catch(error){
      if(alive.current){
        setSaveError(
          (metadataSaved&&file?tr("partial")+"\n":"")+message(error),
        );
        if(metadataSaved)setVersion(v=>v+1);
      }
    }finally{
      saveLock.current=false;
      if(alive.current)setSaving(false);
    }
  }
  async function download(row:Row) {
    if(downloading)return;
    setDownloading(row.id);setError("");
    const controller=new AbortController();
    actionController.current=controller;
    try{
      const blob=await workspaceFileBlob(row.id,session,controller.signal);
      if(!alive.current)return;
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;
      link.download=str(row.original_name)||"document";
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){if(alive.current)setError(message(error));}
    finally{if(alive.current)setDownloading("");}
  }
  function input(key:string,type="text",required=false,maxLength?:number) {
    return <label key={key}><span>{tr(key)}{required?" *":""}</span>
      <input type={type} value={form[key]||""} required={required}
        maxLength={maxLength}
        min={key==="expires_on"?form.issued_on||undefined:undefined}
        onChange={e=>change(key,e.target.value)}/>
    </label>;
  }
  function select(key:string,values:string[]) {
    return <label key={key}><span>{tr(key)}</span>
      <SharedSelect value={form[key]} onChange={e=>change(key,e.target.value)}>
        {values.map(value=><option key={value} value={value}>{tr(value)}</option>)}
      </SharedSelect></label>;
  }
  const columns=kind==="tasks"
    ? ["title","project","assigned_to","status","priority","due_on","completed_at"]
    : ["title","reference_number","project","category","status","expires_on","file"];

  return <section className="wp-projects">
    <div className="wp-card">
      <header className="wp-bar">
        <h2 className="text-lg font-bold">{tr(kind)}</h2>
        <SharedPrimaryButton type="button" className="wp-primary"
          onClick={()=>open(null)}>{tr("new")}</SharedPrimaryButton>
      </header>
      <SharedFilterBar as="form" className="wp-bar" onSubmit={e=>{
        e.preventDefault();setPage(1);setSearch(term);
      }}>
        <input aria-label={tr("search")} placeholder={tr("search")}
          value={term} onChange={e=>setTerm(e.target.value)}/>
        <SharedSelect aria-label={tr("status")} value={status}
          onChange={e=>{setStatus(e.target.value);setPage(1);}}>
          <option value="">{tr("all")} — {tr("status")}</option>
          {states[kind].map(value=>
            <option key={value} value={value}>{tr(value)}</option>)}
        </SharedSelect>
        <SharedSelect aria-label={tr(extraKey)} value={extra}
          onChange={e=>{setExtra(e.target.value);setPage(1);}}>
          <option value="">{tr("all")} — {tr(extraKey)}</option>
          {choices.map(value=>
            <option key={value} value={value}>{tr(value)}</option>)}
        </SharedSelect>
        <SharedSecondaryButton type="submit">{tr("search")}</SharedSecondaryButton>
        
      </SharedFilterBar>
      {notice&&<p role="status">{notice}</p>}
      {error&&<p role="alert">{error}</p>}
      {busy?<p role="status">{tr("loading")}</p>:
        <div className="ws-table-scroll"><SharedDataTable native>
          <thead><tr>{columns.map(key=><th key={key}>{tr(key)}</th>)}
            <th>{tr("actions")}</th></tr></thead>
          <tbody>{rows.map(row=><tr key={row.id}>
            {columns.map(key=>{
              let value:unknown=row[key];
              if(key==="project")value=row.project_title;
              if(key==="assigned_to")value=row.assigned_name;
              if(["status","priority","category"].includes(key))value=tr(str(value));
              if(key==="completed_at"&&value){
                const date=new Date(str(value));
                value=Number.isNaN(date.getTime())?str(value):date.toLocaleString(
                  document.documentElement.lang||"en",
                );
              }
              if(key==="file")return <td key={key}>
                {row.has_file?<SharedSecondaryButton type="button" disabled={Boolean(downloading)}
                  onClick={()=>void download(row)}>
                  {downloading===row.id?tr("loading"):tr("download")}
                </SharedSecondaryButton>:tr("nofile")}
                {Boolean(row.original_name)&&
                  <small className="ws-filename">{str(row.original_name)}</small>}
              </td>;
              return <td key={key}>{str(value)||"—"}</td>;
            })}
            <td><SharedSecondaryButton type="button" onClick={()=>open(row)}>{tr("edit")}</SharedSecondaryButton></td>
          </tr>)}
          {!rows.length&&<tr><td colSpan={columns.length+1}>{tr("empty")}</td></tr>}
          </tbody>
        </SharedDataTable></div>}
      <footer className="wp-bar">
        <SharedSecondaryButton type="button" disabled={busy||page===1}
          onClick={()=>setPage(p=>p-1)}>{tr("previous")}</SharedSecondaryButton>
        <span>{tr("page")} {page} · {tr("count")}: {count}</span>
        <SharedSecondaryButton type="button" disabled={busy||!next}
          onClick={()=>setPage(p=>p+1)}>{tr("next")}</SharedSecondaryButton>
      </footer>
    </div>
    {editing&&<dialog ref={dialog} aria-labelledby={`ws-${kind}-title`}
      onCancel={e=>{e.preventDefault();if(!saveLock.current)setEditing(false);}}>
      <form onSubmit={e=>void save(e)}>
        <header><h3 id={`ws-${kind}-title`}>
          {tr(selected?"edit":"new")} — {tr(kind)}
        </h3><SharedSecondaryButton type="button" disabled={saving} aria-label={tr("close")}
          onClick={()=>setEditing(false)}>×</SharedSecondaryButton></header>
        <div className="wp-body">
          <fieldset className="wp-grid" disabled={saving}>
            {input("title","text",true,200)}
            <div><label><span>{tr("project")}{kind==="tasks"?" *":
              ` (${tr("optional")})`}</span></label>
              <RelationPicker session={session} path="projects/"
                value={form.project} label={str(selected?.project_title)||tr("project")}
                required={kind==="tasks"} disabled={saving} tr={tr}
                onChange={id=>change("project",id)}/>
            </div>
            {select("status",states[kind])}
            {kind==="tasks"?<>
              {select("priority",priorities)}
              <div><label><span>{tr("assigned_to")}</span></label>
                <RelationPicker session={session} path="projects/assignees/"
                  value={form.assigned_to}
                  label={str(selected?.assigned_name)||tr("assigned_to")}
                  disabled={saving} tr={tr}
                  onChange={id=>change("assigned_to",id)}/>
              </div>
              {input("due_on","date")}
            </>:<>
              {select("category",categories)}
              {input("reference_number","text",false,120)}
              {input("issued_on","date")}
              {input("expires_on","date")}
              <label className="wp-wide"><span>{tr("file")} ({tr("optional")})</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={form.status==="archived"}
                  onChange={e=>setFile(e.target.files?.[0]||null)}/>
                <small>{tr("filehint")}</small>
                {Boolean(selected?.original_name)&&
                  <p className="ws-filename">{str(selected?.original_name)}</p>}
                {form.status==="archived"&&<p>{tr("archivedhint")}</p>}
              </label>
            </>}
            <label className="wp-wide"><span>{tr("description")}</span>
              <textarea rows={4} value={form.description}
                onChange={e=>change("description",e.target.value)}/>
            </label>
          </fieldset>
          {saveError&&<p role="alert">{saveError}</p>}
        </div>
        <footer><SharedPrimaryButton type="submit" className="wp-primary" disabled={saving}>
          {tr(saving?"saving":"save")}
        </SharedPrimaryButton><SharedSecondaryButton type="button" disabled={saving}
          onClick={()=>setEditing(false)}>{tr("cancel")}</SharedSecondaryButton></footer>
      </form>
    </dialog>}
  </section>;
}

export function WorkspaceModule({session}:{session:Session}) {
  const {language}=useTranslation();
  const [tab,setTab]=useState<"dashboard"|"projects"|Kind|ExtraTab>("projects");
  const [showModuleMenu,setShowModuleMenu]=useState(true);
  const [refreshToken,setRefreshToken]=useState(0);
  const tr:Tr=key=>{
    const value=words[key];
    return value?value[language==="fa"?1:language==="ps"?2:0]:key;
  };
  return <div className="wp-projects">
    <style>{baseCss+`
      
      .ws-tabs{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:14px!important;
        margin:0 0 20px!important;
      }
      .wp-projects .ws-tabs .ws-tab-card{
        display:flex!important;align-items:center;gap:12px;
        min-width:0;min-height:82px;padding:16px!important;
        border:1px solid rgba(111,184,231,.35)!important;
        border-radius:18px!important;
        color:#234760!important;
        background:rgba(255,255,255,.48)!important;
        box-shadow:0 8px 24px rgba(26,87,128,.08);
        backdrop-filter:blur(16px);
        text-align:start;white-space:normal;
        transition:transform .18s ease,box-shadow .18s ease,background .18s ease;
      }
      .wp-projects .ws-tabs .ws-tab-card:hover{
        transform:translateY(-2px);
        box-shadow:0 12px 28px rgba(26,87,128,.15);
      }
      .wp-projects .ws-tabs .ws-tab-icon{
        display:grid;place-items:center;flex:0 0 42px;
        width:42px;height:42px;border-radius:13px;
        color:#1685d7;background:rgba(38,151,226,.12);
      }
      .wp-projects .ws-tabs .ws-tab-label{
        min-width:0;font-size:15px;font-weight:800;line-height:1.5;
      }
      .wp-projects .ws-tabs .ws-tab-card[aria-selected=true]{
        color:#fff!important;
        background:linear-gradient(135deg,#147ee0,#21b3d7)!important;
        border-color:rgba(255,255,255,.55)!important;
        box-shadow:0 12px 30px rgba(20,126,224,.28);
      }
      .wp-projects .ws-tabs .ws-tab-card[aria-selected=true] .ws-tab-icon{
        color:#fff;background:rgba(255,255,255,.2);
      }
      .hq-shell[data-theme=dark] .wp-projects .ws-tabs .ws-tab-card{
        color:#e7f4ff!important;background:rgba(16,48,72,.68)!important;
      }
      .hq-shell[data-theme=dark] .wp-projects .ws-tabs .ws-tab-card[aria-selected=true]{
        background:linear-gradient(135deg,#147ee0,#168eaf)!important;
      }
      @media(max-width:1023px){
        .ws-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
      }
      @media(max-width:639px){
        .ws-tabs{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px!important}
        .wp-projects .ws-tabs .ws-tab-card{min-height:70px;padding:12px!important}
        .wp-projects .ws-tabs .ws-tab-icon{flex-basis:36px;width:36px;height:36px}
        .wp-projects .ws-tabs .ws-tab-label{font-size:14px}
      }
      @media(max-width:360px){
        .ws-tabs{grid-template-columns:minmax(0,1fr)}
      }

      .wp-projects .ws-tabs button[aria-selected=true]{
        background:#167deb!important;color:#fff!important;
      }
      .ws-table-scroll{overflow-x:auto;max-width:100%}
      .ws-table-scroll td{overflow-wrap:anywhere;max-width:260px}
      .ws-filename{display:block;overflow-wrap:anywhere;margin-top:6px}
      .wp-projects dialog .wp-grid{align-items:start}
      .wp-projects dialog h3{font-size:18px;font-weight:700}
        .wp-projects dialog{
          width:min(1160px,calc(100vw - 220px))!important;
          max-width:calc(100vw - 220px)!important;
          height:min(680px,calc(100dvh - 32px))!important;
          max-height:calc(100dvh - 32px)!important
        }
        @media(max-width:900px){
          .wp-projects dialog{
            width:calc(100vw - 24px)!important;
            max-width:calc(100vw - 24px)!important;
            height:calc(100dvh - 24px)!important;
            max-height:calc(100dvh - 24px)!important
          }
        }

      .wp-projects dialog select{
        height:48px!important;min-height:48px!important;
        padding:6px 14px!important;font-size:16px!important;
        line-height:normal!important;
      }
      .wp-projects dialog input[type=file]{height:auto!important}
      .wp-projects dialog input[type=date]{direction:ltr}
      .wp-projects .wp-card>.wp-bar{margin-top:16px}
      .wp-projects .wp-card>.wp-bar>select{
        min-width:160px;height:44px!important;
        font-size:16px!important;line-height:normal!important;
      }
      .wp-projects [role=status]{color:#08764c;margin-block:12px}
      .hq-shell[data-theme=dark] .wp-projects [role=status]{color:#82e9bd}
      @media(max-width:639px){
        .wp-projects .wp-card>.wp-bar>select{min-width:0;flex:1 1 150px}
      }
    
        /* DOCUMENT_FORM_BIGGER_V2 */
        .wp-projects .wp-dialog[open],.wp-projects dialog[open]{
          box-sizing:border-box!important;width:min(1240px,calc(100vw - 80px))!important;
          min-width:min(1000px,calc(100vw - 80px))!important;
          max-width:calc(100vw - 80px)!important;
          height:min(740px,calc(100dvh - 24px))!important;
          max-height:calc(100dvh - 24px)!important
        }
        @media(max-width:900px){
          .wp-projects .wp-dialog[open],.wp-projects dialog[open]{
            width:calc(100vw - 16px)!important;min-width:0!important;
            max-width:calc(100vw - 16px)!important;
            height:calc(100dvh - 16px)!important;
            max-height:calc(100dvh - 16px)!important
          }
        }
`}</style>
    {showModuleMenu && <nav className="ws-tabs" role="tablist" aria-label={tr("projects")}>
      {([
        ["dashboard", LayoutDashboard],
        ["projects", FolderKanban],
        ["tasks", ClipboardList],
        ["documents", FileText],
        ["contracts", BriefcaseBusiness],
        ["correspondence", Mail],
        ["archive", Archive],
        ["reports", ChartNoAxesColumnIncreasing],
        ["activity", Activity],
      ] as const).map(([key, Icon])=>
        <SharedSecondaryButton key={key} id={`ws-tab-${key}`} type="button" role="tab"
          className="ws-tab-card"
          aria-controls="ws-panel" aria-selected={tab===key}
          onClick={()=>{setTab(key);setShowModuleMenu(false);}}>
          <span className="ws-tab-icon" aria-hidden="true"><Icon size={21}/></span>
          <span className="ws-tab-label">{tr(key)}</span>
        </SharedSecondaryButton>)}
    </nav>}
    {!showModuleMenu && <SharedPageHeader native as="header" className="wp-card flex items-center justify-between gap-3 mb-4">
      <h2 className="text-lg font-bold">{tr(tab)}</h2>
      <div className="flex items-center gap-2">
        <SharedSecondaryButton type="button" onClick={()=>setRefreshToken(value=>value+1)}>
          {tr("refresh")}
        </SharedSecondaryButton>
        <SharedSecondaryButton type="button" onClick={()=>setShowModuleMenu(true)}>
          {language==="fa"?"بازگشت":language==="ps"?"بېرته":"Back"}
        </SharedSecondaryButton>
      </div>
    </SharedPageHeader>}
    {!showModuleMenu && <div id="ws-panel" role="tabpanel" aria-label={tr(tab)}>
      {tab==="projects"?<ProjectsModule session={session} refreshToken={refreshToken}/>:
        tab==="tasks"||tab==="documents"?
          <Records key={`${session.tenantId}:${session.companyId}:${tab}`}
            session={session} kind={tab} tr={tr} refreshToken={refreshToken}/>:
          <WorkspaceExtraModule session={session} tab={tab} refreshToken={refreshToken}/>}
    </div>}
  </div>;
}
