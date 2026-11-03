import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { SecondaryButton as SharedSecondaryButton, Select as SharedSelect, FormField as Field } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Eye,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  createTechnology,
  fetchers,
  type Session,
  updateTechnology,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type Technology = {
  id: string;
  code: string;
  name_english: string;
  name_dari?: string;
  name_pashto?: string;
  description?: string;
  status: "active" | "inactive";
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

type FormState = {
  code: string;
  name_english: string;
  name_dari: string;
  name_pashto: string;
  description: string;
  status: "active" | "inactive";
  metadata: string;
};

const emptyForm: FormState = {
  code: "",
  name_english: "",
  name_dari: "",
  name_pashto: "",
  description: "",
  status: "active",
  metadata: "{}",
};

export function TechnologyList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [rows, setRows] =
    useState<Technology[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [selected, setSelected] =
    useState<Technology | null>(null);

  const [mode, setMode] =
    useState<
      "view" | "create" | "edit" | null
    >(null);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);

    try {
      const response =
        await fetchers.technologies(
          session,
          "?page_size=500",
        );

      setRows(response.results || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t.technologyUi.operationFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [session]);

  const filtered = useMemo(() => {
    const q =
      search.trim().toLowerCase();

    if (!q) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.code,
        row.name_english,
        row.name_dari || "",
        row.name_pashto || "",
        row.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setMode("create");
    setMessage("");
  };

  const openView = (
    row: Technology,
  ) => {
    setSelected(row);
    setMode("view");
    setMessage("");
  };

  const openEdit = (
    row: Technology,
  ) => {
    setSelected(row);

    setForm({
      code: row.code,
      name_english: row.name_english,
      name_dari: row.name_dari || "",
      name_pashto:
        row.name_pashto || "",
      description:
        row.description || "",
      status: row.status,
      metadata: JSON.stringify(
        row.metadata || {},
        null,
        2,
      ),
    });

    setMode("edit");
    setMessage("");
  };

  const close = () => {
    if (saving) {
      return;
    }

    setMode(null);
    setSelected(null);
  };

  const save = async () => {
    if (
      !form.code.trim() ||
      !form.name_english.trim()
    ) {
      setMessage(
        t.technologyUi.codeEnglishRequired,
      );
      return;
    }

    let metadata:
      Record<string, unknown>;

    try {
      const parsed =
        JSON.parse(
          form.metadata || "{}",
        );

      if (
        parsed === null ||
        Array.isArray(parsed) ||
        typeof parsed !== "object"
      ) {
        throw new Error();
      }

      metadata =
        parsed as Record<string, unknown>;
    } catch {
      setMessage(
        t.technologyUi.metadataInvalid,
      );
      return;
    }

    const payload = {
      code: form.code.trim(),
      name_english:
        form.name_english.trim(),
      name_dari:
        form.name_dari.trim(),
      name_pashto:
        form.name_pashto.trim(),
      description:
        form.description.trim(),
      status: form.status,
      metadata,
    };

    setSaving(true);
    setMessage("");

    try {
      if (
        mode === "edit" &&
        selected
      ) {
        await updateTechnology(
          session,
          selected.id,
          payload,
        );

        setMessage(
          t.technologyUi.updatedSuccessfully,
        );
      } else {
        await createTechnology(
          session,
          payload,
        );

        setMessage(
          t.technologyUi.createdSuccessfully,
        );
      }

      await load();

      setMode(null);
      setSelected(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t.technologyUi.operationFailed,
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (
    row: Technology,
  ) => {
    const status =
      row.status === "active"
        ? "inactive"
        : "active";

    setMessage("");

    try {
      await updateTechnology(
        session,
        row.id,
        { status },
      );

      setMessage(
        status === "active"
          ? t.technologyUi.activatedSuccessfully
          : t.technologyUi.deactivatedSuccessfully,
      );

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t.technologyUi.operationFailed,
      );
    }
  };

  return (
    <div className="space-y-5">
      <section className="hq-visual-panel rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
        <SharedPageHeader native as="div" className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">
              {t.technologyUi.title}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {t.technologyUi.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SharedSecondaryButton
              type="button"
              onClick={() => void load()}
              className={secondaryButton}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />

              {t.technologyUi.refresh}
            </SharedSecondaryButton>

            <SharedSecondaryButton
              type="button"
              onClick={openCreate}
              className={primaryButton}
            >
              <Plus className="h-4 w-4" />
              {t.technologyUi.newTechnology}
            </SharedSecondaryButton>
          </div>
        </SharedPageHeader>

        <div className="relative mt-5">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder={
              t.technologyUi.search
            }
            className={`${inputClass} ps-10`}
          />
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-200">
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <SharedDataTable native className="min-w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase text-slate-400">
              <tr>
                <th className="p-4 text-start">
                  {t.technologyUi.code}
                </th>

                <th className="p-4 text-start">
                  {
                    t.technologyUi
                      .englishName
                  }
                </th>

                <th className="p-4 text-start">
                  {t.technologyUi.dariName}
                </th>

                <th className="p-4 text-start">
                  {
                    t.technologyUi
                      .pashtoName
                  }
                </th>

                <th className="p-4 text-start">
                  {t.technologyUi.status}
                </th>

                <th className="p-4 text-start">
                  {t.technologyUi.actions}
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.06] hover:bg-white/[0.03]"
                >
                  <td className="p-4 font-mono text-cyan-300">
                    {row.code}
                  </td>

                  <td className="p-4 font-semibold text-white">
                    {row.name_english}
                  </td>

                  <td className="p-4 text-slate-300">
                    {row.name_dari || "—"}
                  </td>

                  <td className="p-4 text-slate-300">
                    {row.name_pashto || "—"}
                  </td>

                  <td className="p-4">
                    <span
                      className={
                        row.status ===
                        "active"
                          ? activeBadge
                          : inactiveBadge
                      }
                    >
                      {row.status ===
                      "active"
                        ? t.technologyUi.active
                        : t.technologyUi.inactive}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex gap-2">
                      <IconButton
                        title={
                          t.technologyUi.view
                        }
                        onClick={() =>
                          openView(row)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </IconButton>

                      <IconButton
                        title={
                          t.technologyUi.edit
                        }
                        onClick={() =>
                          openEdit(row)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>

                      <IconButton
                        title={
                          row.status ===
                          "active"
                            ? t.technologyUi.deactivate
                            : t.technologyUi.activate
                        }
                        onClick={() =>
                          void toggleStatus(
                            row,
                          )
                        }
                      >
                        {row.status ===
                        "active" ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading &&
                filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-slate-500"
                    >
                      {
                        t.technologyUi
                          .noRecords
                      }
                    </td>
                  </tr>
                )}
            </tbody>
          </SharedDataTable>
        </div>
      </section>

      {mode && (
        <Modal
          title={
            mode === "create"
              ? t.technologyUi.newTechnology
              : mode === "edit"
                ? t.technologyUi.editTechnology
                : t.technologyUi.technologyDetails
          }
          onClose={close}
        >
          {mode === "view" &&
          selected ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Detail
                label={t.technologyUi.code}
                value={selected.code}
              />

              <Detail
                label={
                  t.technologyUi.status
                }
                value={
                  selected.status ===
                  "active"
                    ? t.technologyUi.active
                    : t.technologyUi.inactive
                }
              />

              <Detail
                label={
                  t.technologyUi
                    .englishName
                }
                value={
                  selected.name_english
                }
              />

              <Detail
                label={
                  t.technologyUi.dariName
                }
                value={
                  selected.name_dari ||
                  "—"
                }
              />

              <Detail
                label={
                  t.technologyUi
                    .pashtoName
                }
                value={
                  selected.name_pashto ||
                  "—"
                }
              />

              <Detail
                label={
                  t.technologyUi
                    .technologyId
                }
                value={selected.id}
              />

              <div className="md:col-span-2">
                <Detail
                  label={
                    t.technologyUi
                      .description
                  }
                  value={
                    selected.description ||
                    "—"
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Detail
                  label={
                    t.technologyUi.metadata
                  }
                  value={JSON.stringify(
                    selected.metadata || {},
                    null,
                    2,
                  )}
                  pre
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <SharedSecondaryButton
                  type="button"
                  onClick={() =>
                    openEdit(selected)
                  }
                  className={primaryButton}
                >
                  <Pencil className="h-4 w-4" />

                  {t.technologyUi.edit}
                </SharedSecondaryButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={
                    t.technologyUi.code
                  }
                  required
                >
                  <input
                    value={form.code}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        code:
                          event.target
                            .value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field
                  label={
                    t.technologyUi.status
                  }
                >
                  <SharedSelect
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status:
                          event.target
                            .value as
                            | "active"
                            | "inactive",
                      })
                    }
                    className={inputClass}
                  >
                    <option value="active">
                      {t.technologyUi.active}
                    </option>

                    <option value="inactive">
                      {t.technologyUi.inactive}
                    </option>
                  </SharedSelect>
                </Field>

                <Field
                  label={
                    t.technologyUi
                      .englishName
                  }
                  required
                >
                  <input
                    value={
                      form.name_english
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name_english:
                          event.target
                            .value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field
                  label={
                    t.technologyUi.dariName
                  }
                >
                  <input
                    value={form.name_dari}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name_dari:
                          event.target
                            .value,
                      })
                    }
                    dir="rtl"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label={
                    t.technologyUi
                      .pashtoName
                  }
                >
                  <input
                    value={
                      form.name_pashto
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name_pashto:
                          event.target
                            .value,
                      })
                    }
                    dir="rtl"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field
                label={
                  t.technologyUi.description
                }
              >
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  rows={4}
                  className={inputClass}
                />
              </Field>

              <Field
                label={
                  t.technologyUi.metadataJson
                }
              >
                <textarea
                  value={form.metadata}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      metadata:
                        event.target.value,
                    })
                  }
                  rows={7}
                  dir="ltr"
                  className={`${inputClass} font-mono text-xs`}
                />
              </Field>

              <div className="flex justify-end gap-2">
                <SharedSecondaryButton
                  type="button"
                  onClick={close}
                  className={
                    secondaryButton
                  }
                >
                  {t.technologyUi.cancel}
                </SharedSecondaryButton>

                <SharedSecondaryButton
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void save()
                  }
                  className={
                    primaryButton
                  }
                >
                  {saving
                    ? t.technologyUi.saving
                    : mode === "create"
                      ? t.technologyUi.create
                      : t.technologyUi.save}
                </SharedSecondaryButton>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <SharedSecondaryButton
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
    >
      {children}
    </SharedSecondaryButton>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="hq-visual-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="hq-visual-dialog max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-5 py-4">
          <h3 className="text-lg font-black text-white">
            {title}
          </h3>

          <SharedSecondaryButton
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </SharedSecondaryButton>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}



function Detail({
  label,
  value,
  pre,
}: {
  label: string;
  value: string;
  pre?: boolean;
}) {
  return (
    <div className="hq-visual-panel rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 text-xs font-bold text-slate-500">
        {label}
      </div>

      {pre ? (
        <pre className="whitespace-pre-wrap break-all text-sm text-slate-200">
          {value}
        </pre>
      ) : (
        <div className="break-all text-sm font-semibold text-slate-200">
          {value}
        </div>
      )}
    </div>
  );
}

const activeBadge =
  "inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300";

const inactiveBadge =
  "inline-flex rounded-full border border-slate-400/20 bg-slate-400/10 px-3 py-1 text-xs font-bold text-slate-400";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/40";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10";
