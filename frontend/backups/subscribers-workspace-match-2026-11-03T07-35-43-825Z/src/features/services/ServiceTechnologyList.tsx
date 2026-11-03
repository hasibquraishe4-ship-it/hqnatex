import { SecondaryButton as SharedSecondaryButton, Select as SharedSelect } from "../../components/Interface";
import { DataTable as SharedDataTable } from "../../components/DataTable";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Link2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  createServiceTechnology,
  fetchers,
  type Session,
  updateServiceTechnology,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type Status = "active" | "inactive";

type Option = {
  id: string;
  code?: string;
  name_english: string;
};

type LinkRow = {
  id: string;
  service: string;
  service_name: string;
  technology: string;
  technology_name: string;
  is_default: boolean;
  status: Status;
  metadata?: Record<string, unknown>;
};

type FormState = {
  service: string;
  technology: string;
  is_default: boolean;
  status: Status;
  metadata: string;
};

const emptyForm: FormState = {
  service: "",
  technology: "",
  is_default: false,
  status: "active",
  metadata: "{}",
};

function rowsOf<T>(
  value: { results?: T[] } | T[],
): T[] {
  return Array.isArray(value)
    ? value
    : value.results || [];
}

export function ServiceTechnologyList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [rows, setRows] =
    useState<LinkRow[]>([]);

  const [services, setServices] =
    useState<Option[]>([]);

  const [technologies, setTechnologies] =
    useState<Option[]>([]);

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [mode, setMode] =
    useState<
      "view" | "create" | "edit" | null
    >(null);

  const [selected, setSelected] =
    useState<LinkRow | null>(null);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);

    try {
      const [
        links,
        serviceList,
        technologyList,
      ] = await Promise.all([
        fetchers.serviceTechnologies(
          session,
          "?page_size=500",
        ),
        fetchers.allServices(
          session,
          "?status=active&ordering=name_english",
        ),
        fetchers.technologies(
          session,
          "?page_size=500",
        ),
      ]);

      setRows(
        rowsOf<LinkRow>(links),
      );

      setServices(
        rowsOf<Option>(serviceList),
      );

      setTechnologies(
        rowsOf<Option>(technologyList),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t.serviceTechnologyUi.operationFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [session]);

  const filteredRows =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return rows;
      }

      return rows.filter((row) =>
        [
          row.service_name,
          row.technology_name,
          row.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }, [rows, search]);

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setMessage("");
    setMode("create");
  };

  const openView = (
    row: LinkRow,
  ) => {
    setSelected(row);
    setMessage("");
    setMode("view");
  };

  const openEdit = (
    row: LinkRow,
  ) => {
    setSelected(row);

    setForm({
      service: row.service,
      technology: row.technology,
      is_default: row.is_default,
      status: row.status,
      metadata: JSON.stringify(
        row.metadata || {},
        null,
        2,
      ),
    });

    setMessage("");
    setMode("edit");
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setMode(null);
    setSelected(null);
  };

  const save = async () => {
    if (
      !form.service ||
      !form.technology
    ) {
      setMessage(
        t.serviceTechnologyUi
          .serviceTechnologyRequired,
      );
      return;
    }

    if (
      form.is_default &&
      form.status !== "active"
    ) {
      setMessage(
        t.serviceTechnologyUi
          .defaultMustBeActive,
      );
      return;
    }

    const existingDefault =
      rows.some(
        (row) =>
          row.service ===
            form.service &&
          row.is_default &&
          row.status === "active" &&
          row.id !== selected?.id,
      );

    if (
      form.is_default &&
      existingDefault
    ) {
      setMessage(
        t.serviceTechnologyUi
          .onlyOneDefault,
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
        parsed as Record<
          string,
          unknown
        >;
    } catch {
      setMessage(
        t.serviceTechnologyUi
          .metadataInvalid,
      );
      return;
    }

    const payload = {
      service: form.service,
      technology:
        form.technology,
      is_default:
        form.is_default,
      status: form.status,
      metadata,
    };

    setSaving(true);

    try {
      if (
        mode === "edit" &&
        selected
      ) {
        await updateServiceTechnology(
          session,
          selected.id,
          payload,
        );

        setMessage(
          t.serviceTechnologyUi
            .updatedSuccessfully,
        );
      } else {
        await createServiceTechnology(
          session,
          payload,
        );

        setMessage(
          t.serviceTechnologyUi
            .createdSuccessfully,
        );
      }

      setMode(null);
      setSelected(null);
      setForm(emptyForm);

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t.serviceTechnologyUi
              .operationFailed,
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (
    row: LinkRow,
  ) => {
    const nextStatus: Status =
      row.status === "active"
        ? "inactive"
        : "active";

    try {
      await updateServiceTechnology(
        session,
        row.id,
        nextStatus === "inactive"
          ? {
              status: "inactive",
              is_default: false,
            }
          : {
              status: "active",
            },
      );

      setMessage(
        nextStatus === "active"
          ? t.serviceTechnologyUi
              .activatedSuccessfully
          : t.serviceTechnologyUi
              .deactivatedSuccessfully,
      );

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t.serviceTechnologyUi
              .operationFailed,
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="hq-visual-panel 
        rounded-2xl
        border border-white/10
        bg-slate-950/40
        p-5
      ">
        <div className="
          flex flex-col gap-4
          lg:flex-row
          lg:items-center
          lg:justify-between
        ">
          <div className="
            flex items-start gap-3
          ">
            <div className="
              rounded-xl
              bg-cyan-400/10
              p-3
              text-cyan-300
            ">
              <Link2
                className="h-5 w-5"
              />
            </div>

            <div>
              <h2 className="
                text-lg
                font-bold
                text-white
              ">
                {
                  t.serviceTechnologyUi
                    .title
                }
              </h2>

              <p className="
                mt-1
                text-sm
                text-slate-400
              ">
                {
                  t.serviceTechnologyUi
                    .subtitle
                }
              </p>
            </div>
          </div>

          <div className="
            flex flex-wrap gap-2
          ">
            <SharedSecondaryButton
              type="button"
              onClick={() =>
                void load()
              }
              className="
                rounded-xl
                border border-white/10
                px-3 py-2
                text-sm
                text-slate-300
              "
            >
              <RefreshCw
                className="
                  inline
                  h-4 w-4
                "
              />
              {" "}
              {
                t.serviceTechnologyUi
                  .refresh
              }
            </SharedSecondaryButton>

            <SharedSecondaryButton
              type="button"
              onClick={openCreate}
              className="
                rounded-xl
                bg-cyan-400/10
                px-3 py-2
                text-sm
                font-bold
                text-cyan-300
              "
            >
              <Plus
                className="
                  inline
                  h-4 w-4
                "
              />
              {" "}
              {
                t.serviceTechnologyUi
                  .newLink
              }
            </SharedSecondaryButton>
          </div>
        </div>

        {message && (
          <div className="hq-visual-panel 
            mt-4
            rounded-xl
            border border-white/10
            bg-white/5
            p-3
            text-sm
            text-slate-200
          ">
            {message}
          </div>
        )}

        <div className="
          mt-4
          flex items-center gap-2
          rounded-xl
          border border-white/10
          px-3
        ">
          <Search
            className="
              h-4 w-4
              text-slate-500
            "
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder={
              t.serviceTechnologyUi
                .search
            }
            className="hq-input 
              w-full
              bg-transparent
              py-3
              text-sm
              text-white
              outline-none
            "
          />
        </div>

        <div className="
          mt-4
          overflow-x-auto
          rounded-xl
          border border-white/10
        ">
          <SharedDataTable native className="
            min-w-full
            text-sm
          ">
            <thead className="
              bg-white/[0.04]
              text-slate-400
            ">
              <tr>
                <th className="
                  px-4 py-3
                  text-start
                ">
                  {
                    t.serviceTechnologyUi
                      .service
                  }
                </th>

                <th className="
                  px-4 py-3
                  text-start
                ">
                  {
                    t.serviceTechnologyUi
                      .technology
                  }
                </th>

                <th className="
                  px-4 py-3
                  text-start
                ">
                  {
                    t.serviceTechnologyUi
                      .defaultTechnology
                  }
                </th>

                <th className="
                  px-4 py-3
                  text-start
                ">
                  {
                    t.serviceTechnologyUi
                      .status
                  }
                </th>

                <th className="
                  px-4 py-3
                  text-start
                ">
                  {
                    t.serviceTechnologyUi
                      .actions
                  }
                </th>
              </tr>
            </thead>

            <tbody className="
              divide-y
              divide-white/10
            ">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="
                      px-4 py-8
                      text-center
                      text-slate-500
                    "
                  >
                    ...
                  </td>
                </tr>
              ) : filteredRows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="
                      px-4 py-8
                      text-center
                      text-slate-500
                    "
                  >
                    {
                      t.serviceTechnologyUi
                        .noRecords
                    }
                  </td>
                </tr>
              ) : (
                filteredRows.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="
                        text-slate-300
                      "
                    >
                      <td className="
                        px-4 py-3
                      ">
                        {
                          row.service_name
                        }
                      </td>

                      <td className="
                        px-4 py-3
                      ">
                        {
                          row.technology_name
                        }
                      </td>

                      <td className="
                        px-4 py-3
                      ">
                        {
                          row.is_default
                            ? t
                                .serviceTechnologyUi
                                .yes
                            : t
                                .serviceTechnologyUi
                                .no
                        }
                      </td>

                      <td className="
                        px-4 py-3
                      ">
                        {
                          row.status ===
                          "active"
                            ? t
                                .serviceTechnologyUi
                                .active
                            : t
                                .serviceTechnologyUi
                                .inactive
                        }
                      </td>

                      <td className="
                        px-4 py-3
                      ">
                        <div className="
                          flex gap-2
                        ">
                          <SharedSecondaryButton
                            type="button"
                            title={
                              t
                                .serviceTechnologyUi
                                .view
                            }
                            onClick={() =>
                              openView(
                                row,
                              )
                            }
                            className="
                              rounded-lg
                              border
                              border-white/10
                              p-2
                            "
                          >
                            <Eye
                              className="
                                h-4 w-4
                              "
                            />
                          </SharedSecondaryButton>

                          <SharedSecondaryButton
                            type="button"
                            title={
                              t
                                .serviceTechnologyUi
                                .edit
                            }
                            onClick={() =>
                              openEdit(
                                row,
                              )
                            }
                            className="
                              rounded-lg
                              border
                              border-white/10
                              p-2
                            "
                          >
                            <Pencil
                              className="
                                h-4 w-4
                              "
                            />
                          </SharedSecondaryButton>

                          <SharedSecondaryButton
                            type="button"
                            title={
                              row.status ===
                              "active"
                                ? t
                                    .serviceTechnologyUi
                                    .deactivate
                                : t
                                    .serviceTechnologyUi
                                    .activate
                            }
                            onClick={() =>
                              void toggleStatus(
                                row,
                              )
                            }
                            className="
                              rounded-lg
                              border
                              border-white/10
                              p-2
                            "
                          >
                            {
                              row.status ===
                              "active" ? (
                                <PowerOff
                                  className="
                                    h-4 w-4
                                  "
                                />
                              ) : (
                                <Power
                                  className="
                                    h-4 w-4
                                  "
                                />
                              )
                            }
                          </SharedSecondaryButton>
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </SharedDataTable>
        </div>
      </div>

      {mode && (
        <div className="
          fixed inset-0 z-50
          flex
          items-center
          justify-center
          bg-black/70
          p-4
        ">
          <div className="hq-visual-panel hq-visual-dialog 
            max-h-[90vh]
            w-full
            max-w-2xl
            overflow-y-auto
            rounded-2xl
            border border-white/10
            bg-slate-950
            p-5
          ">
            <div className="
              mb-5
              flex
              items-center
              justify-between
            ">
              <h3 className="
                text-lg
                font-bold
                text-white
              ">
                {
                  mode === "create"
                    ? t
                        .serviceTechnologyUi
                        .newLink
                    : mode === "edit"
                      ? t
                          .serviceTechnologyUi
                          .editLink
                      : t
                          .serviceTechnologyUi
                          .linkDetails
                }
              </h3>

              <SharedSecondaryButton
                type="button"
                onClick={closeModal}
                className="
                  rounded-lg
                  border
                  border-white/10
                  p-2
                  text-slate-400
                "
              >
                <X
                  className="
                    h-4 w-4
                  "
                />
              </SharedSecondaryButton>
            </div>

            {mode === "view" &&
            selected ? (
              <div className="
                space-y-3
                text-sm
                text-slate-300
              ">
                <div>
                  <b>
                    {
                      t
                        .serviceTechnologyUi
                        .service
                    }:
                  </b>{" "}
                  {
                    selected.service_name
                  }
                </div>

                <div>
                  <b>
                    {
                      t
                        .serviceTechnologyUi
                        .technology
                    }:
                  </b>{" "}
                  {
                    selected
                      .technology_name
                  }
                </div>

                <div>
                  <b>
                    {
                      t
                        .serviceTechnologyUi
                        .defaultTechnology
                    }:
                  </b>{" "}
                  {
                    selected.is_default
                      ? t
                          .serviceTechnologyUi
                          .yes
                      : t
                          .serviceTechnologyUi
                          .no
                  }
                </div>

                <div>
                  <b>
                    {
                      t
                        .serviceTechnologyUi
                        .status
                    }:
                  </b>{" "}
                  {
                    selected.status ===
                    "active"
                      ? t
                          .serviceTechnologyUi
                          .active
                      : t
                          .serviceTechnologyUi
                          .inactive
                  }
                </div>

                <div>
                  <b>
                    {
                      t
                        .serviceTechnologyUi
                        .metadata
                    }:
                  </b>
                </div>

                <pre className="
                  overflow-x-auto
                  rounded-xl
                  bg-black/20
                  p-3
                ">
                  {
                    JSON.stringify(
                      selected.metadata ||
                        {},
                      null,
                      2,
                    )
                  }
                </pre>

                <div className="
                  flex
                  justify-end
                ">
                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      openEdit(
                        selected,
                      )
                    }
                    className="
                      rounded-xl
                      bg-cyan-400/10
                      px-4 py-2
                      font-bold
                      text-cyan-300
                    "
                  >
                    {
                      t
                        .serviceTechnologyUi
                        .edit
                    }
                  </SharedSecondaryButton>
                </div>
              </div>
            ) : (
              <div className="
                space-y-4
              ">
                <div className="
                  grid gap-4
                  sm:grid-cols-2
                ">
                  <label className="
                    text-sm
                    text-slate-300
                  ">
                    {
                      t
                        .serviceTechnologyUi
                        .service
                    }

                    <SharedSelect
                      value={
                        form.service
                      }
                      disabled={
                        mode === "edit"
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm({
                          ...form,
                          service:
                            event
                              .target
                              .value,
                        })
                      }
                      className="
                        mt-2
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-slate-950
                        p-3
                      "
                    >
                      <option value="">
                        {
                          t
                            .serviceTechnologyUi
                            .selectService
                        }
                      </option>

                      {
                        services.map(
                          (item) => (
                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {
                                item.code
                                  ? `${item.code} — ${item.name_english}`
                                  : item.name_english
                              }
                            </option>
                          ),
                        )
                      }
                    </SharedSelect>
                  </label>

                  <label className="
                    text-sm
                    text-slate-300
                  ">
                    {
                      t
                        .serviceTechnologyUi
                        .technology
                    }

                    <SharedSelect
                      value={
                        form.technology
                      }
                      disabled={
                        mode === "edit"
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm({
                          ...form,
                          technology:
                            event
                              .target
                              .value,
                        })
                      }
                      className="
                        mt-2
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-slate-950
                        p-3
                      "
                    >
                      <option value="">
                        {
                          t
                            .serviceTechnologyUi
                            .selectTechnology
                        }
                      </option>

                      {
                        technologies.map(
                          (item) => (
                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {
                                item.code
                                  ? `${item.code} — ${item.name_english}`
                                  : item.name_english
                              }
                            </option>
                          ),
                        )
                      }
                    </SharedSelect>
                  </label>

                  <label className="
                    text-sm
                    text-slate-300
                  ">
                    {
                      t
                        .serviceTechnologyUi
                        .status
                    }

                    <SharedSelect
                      value={
                        form.status
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm({
                          ...form,
                          status:
                            event
                              .target
                              .value as Status,
                          is_default:
                            event
                              .target
                              .value ===
                            "inactive"
                              ? false
                              : form.is_default,
                        })
                      }
                      className="
                        mt-2
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-slate-950
                        p-3
                      "
                    >
                      <option value="active">
                        {
                          t
                            .serviceTechnologyUi
                            .active
                        }
                      </option>

                      <option value="inactive">
                        {
                          t
                            .serviceTechnologyUi
                            .inactive
                        }
                      </option>
                    </SharedSelect>
                  </label>

                  <label className="
                    mt-6
                    flex
                    items-center
                    gap-2
                    text-sm
                    text-slate-300
                  ">
                    <input
                      type="checkbox"
                      checked={
                        form.is_default
                      }
                      disabled={
                        form.status !==
                        "active"
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm({
                          ...form,
                          is_default:
                            event
                              .target
                              .checked,
                        })
                      }
                    />

                    {
                      t
                        .serviceTechnologyUi
                        .defaultTechnology
                    }
                  </label>
                </div>

                <label className="
                  block
                  text-sm
                  text-slate-300
                ">
                  {
                    t
                      .serviceTechnologyUi
                      .metadata
                  }

                  <textarea
                    value={
                      form.metadata
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm({
                        ...form,
                        metadata:
                          event
                            .target
                            .value,
                      })
                    }
                    rows={7}
                    className="hq-input 
                      mt-2
                      w-full
                      rounded-xl
                      border
                      border-white/10
                      bg-black/20
                      p-3
                      font-mono
                    "
                  />
                </label>

                <p className="
                  text-xs
                  text-slate-500
                ">
                  {
                    t
                      .serviceTechnologyUi
                      .onlyOneDefault
                  }
                </p>

                <div className="
                  flex
                  justify-end
                  gap-2
                ">
                  <SharedSecondaryButton
                    type="button"
                    onClick={
                      closeModal
                    }
                    className="
                      rounded-xl
                      border
                      border-white/10
                      px-4 py-2
                      text-slate-300
                    "
                  >
                    {
                      t
                        .serviceTechnologyUi
                        .cancel
                    }
                  </SharedSecondaryButton>

                  <SharedSecondaryButton
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void save()
                    }
                    className="
                      rounded-xl
                      bg-cyan-400/10
                      px-4 py-2
                      font-bold
                      text-cyan-300
                      disabled:opacity-50
                    "
                  >
                    {
                      saving
                        ? t
                            .serviceTechnologyUi
                            .saving
                        : mode ===
                            "create"
                          ? t
                              .serviceTechnologyUi
                              .create
                          : t
                              .serviceTechnologyUi
                              .save
                    }
                  </SharedSecondaryButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
