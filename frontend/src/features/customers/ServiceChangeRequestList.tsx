import { WorkspaceModal } from "../../components/Modal";
import { PageHeader as SharedPageHeader } from "../../components/PageHeader";
import { PrimaryButton as SharedPrimaryButton, SecondaryButton as SharedSecondaryButton, Select as SharedSelect, FormField as Field, DetailField as Detail } from "../../components/Interface";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";

import {
  DataTable,
  StatusBadge,
  type Column,
} from "../../components/DataTable";

import {
  fetchers,
  serviceChangeRequestApi,
  type ServiceChangeRequestPayload,
  type Session,
} from "../../lib/api";

import { useTranslation } from "../../lib/i18n";

type Props = {
  session: Session;
};

type ChangeStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "applied"
  | "cancelled";

type ChangeRequest = {
  id: string;
  tenant: string;
  company: string;
  customer_service: string;
  change_type: string;
  requested_values: Record<string, unknown>;
  status: ChangeStatus;
  reason: string;
  created_at: string;
  updated_at: string;
};

type CustomerServiceOption = {
  id: string;
  customer_name: string;
  service_name: string;
  package_name: string | null;
  identifier: string;
  username: string;
  status: string;
};

type ModalMode =
  | "create"
  | "view"
  | "edit";

type Notice = {
  type: "success" | "error";
  message: string;
};

type FormState = {
  customer_service: string;
  change_type: string;
  requested_values: string;
  status: ChangeStatus;
  reason: string;
};

const EMPTY_FORM: FormState = {
  customer_service: "",
  change_type: "",
  requested_values: "{}",
  status: "requested",
  reason: "",
};

export function ServiceChangeRequestList({
  session,
}: Props) {
  const { t } = useTranslation();

  const [data, setData] =
    useState<ChangeRequest[]>([]);

  const [
    customerServices,
    setCustomerServices,
  ] =
    useState<CustomerServiceOption[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [totalCount, setTotalCount] =
    useState(0);

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [error, setError] =
    useState("");

  const [modalMode, setModalMode] =
    useState<ModalMode | null>(null);

  const [selected, setSelected] =
    useState<ChangeRequest | null>(null);

  const [form, setForm] =
    useState<FormState>({
      ...EMPTY_FORM,
    });

  const [saving, setSaving] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const load =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        let params =
          `?page=${page}&page_size=${pageSize}`;

        if (searchTerm) {
          params +=
            `&search=${encodeURIComponent(
              searchTerm,
            )}`;
        }

        if (sort) {
          params +=
            `&ordering=${
              sort.direction ===
              "desc"
                ? "-"
                : ""
            }${sort.key}`;
        }

        const [
          requestRes,
          serviceRes,
        ] =
          await Promise.all([
            fetchers.customerServiceChangeRequests(
              session,
              params,
            ),

            fetchers.customerServices(
              session,
              "?page_size=100",
            ),
          ]);

        setData(
          requestRes.results,
        );

        setTotalCount(
          requestRes.count,
        );

        setCustomerServices(
          serviceRes.results,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t.common.noRecords,
        );
      } finally {
        setLoading(false);
      }
    }, [
      session,
      page,
      pageSize,
      searchTerm,
      sort,
      t,
    ]);

  useEffect(() => {
    load();
  }, [load]);

  const serviceLabel = (
    id: string,
  ) => {
    const record =
      customerServices.find(
        (item) => item.id === id,
      );

    if (!record) {
      return id;
    }

    const reference =
      record.identifier ||
      record.username ||
      record.id.slice(0, 8);

    return `${record.customer_name} — ${record.service_name} — ${reference}`;
  };

  const updateField = <
    K extends keyof FormState
  >(
    key: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openCreate = () => {
    setSelected(null);
    setNotice(null);

    setForm({
      ...EMPTY_FORM,
    });

    setModalMode("create");
  };

  const openView = (
    row: ChangeRequest,
  ) => {
    setSelected(row);
    setNotice(null);
    setModalMode("view");
  };

  const openEdit = (
    row: ChangeRequest,
  ) => {
    setSelected(row);
    setNotice(null);

    setForm({
      customer_service:
        row.customer_service,

      change_type:
        row.change_type || "",

      requested_values:
        JSON.stringify(
          row.requested_values ||
            {},
          null,
          2,
        ),

      status:
        row.status,

      reason:
        row.reason || "",
    });

    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelected(null);

    setForm({
      ...EMPTY_FORM,
    });
  };

  const submitRequest = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !form.customer_service ||
      !form.change_type.trim()
    ) {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.customerServiceAndChangeTypeRequired,
      });

      return;
    }

    let requestedValues:
      Record<string, unknown>;

    try {
      const parsed =
        JSON.parse(
          form.requested_values.trim() ||
            "{}",
        );

      if (
        typeof parsed !==
          "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error();
      }

      requestedValues =
        parsed as Record<
          string,
          unknown
        >;
    } catch {
      setNotice({
        type: "error",
        message:
          t.customersServicesUi.requestedValuesInvalid,
      });

      return;
    }

    const payload:
      ServiceChangeRequestPayload = {
      customer_service:
        form.customer_service,

      change_type:
        form.change_type.trim(),

      requested_values:
        requestedValues,

      status:
        form.status,

      reason:
        form.reason.trim(),
    };

    try {
      setSaving(true);
      setNotice(null);

      if (
        modalMode === "create"
      ) {
        await serviceChangeRequestApi.create(
          session,
          payload,
        );
      } else if (
        modalMode === "edit" &&
        selected
      ) {
        await serviceChangeRequestApi.update(
          session,
          selected.id,
          payload,
        );
      }

      await load();

      setModalMode(null);
      setSelected(null);

      setForm({
        ...EMPTY_FORM,
      });

      setNotice({
        type: "success",
        message:
          modalMode === "create"
            ? t.customersServicesUi.changeRequestCreatedSuccessfully
            : t.customersServicesUi.changeRequestUpdatedSuccessfully,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : t.customersServicesUi.changeRequestOperationFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns:
    Column<ChangeRequest>[] = [
    {
      header:
        t.customersServicesUi.customerService,

      accessor: (row) =>
        serviceLabel(
          row.customer_service,
        ),
    },

    {
      header:
        t.customersServicesUi.changeType,

      accessor:
        "change_type",

      className:
        "font-mono text-cyan-400",

      sortable: true,
    },

    {
      header:
        t.customersServicesUi.status,

      accessor: (row) => (
        <StatusBadge
          status={row.status}
          type={
            row.status ===
              "approved" ||
            row.status ===
              "applied"
              ? "success"
              : row.status ===
                  "rejected"
                ? "danger"
                : row.status ===
                    "requested"
                  ? "warning"
                  : "default"
          }
        />
      ),

      sortable: true,
    },

    {
      header:
        t.customersServicesUi.reason,

      accessor: (row) =>
        row.reason || "—",
    },

    {
      header:
        t.customersServicesUi.created,

      accessor: (row) =>
        row.created_at
          ? new Date(
              row.created_at,
            ).toLocaleString()
          : "—",

      sortable: true,
      sortKey: "created_at",
    },
  ];

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">

        {notice && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.type ===
              "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-400/10 text-rose-300"
            }`}
          >
            {notice.message}
          </div>
        )}

        <SharedPageHeader native as="div" className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <ClipboardList className="h-5 w-5 text-cyan-300" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                {t.customersServicesUi.serviceChangeRequests}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {t.customersServicesUi.serviceChangeRequestsDesc}
              </p>
            </div>
          </div>

          <SharedPrimaryButton
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            {t.customersServicesUi.newChangeRequest}
          </SharedPrimaryButton>
        </SharedPageHeader>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          totalCount={
            totalCount
          }
          currentPage={
            page
          }
          pageSize={
            pageSize
          }
          onPageChange={
            setPage
          }
          onPageSizeChange={
            setPageSize
          }
          onSearch={
            setSearchTerm
          }
          onSort={(
            key,
            direction,
          ) =>
            setSort({
              key,
              direction,
            })
          }
          error={error}
          actions={(row) => (
            <div className="flex gap-2">

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  openView(row)
                }
                className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-400"
              >
                <Eye className="h-4 w-4" />
              </SharedSecondaryButton>

              <SharedSecondaryButton
                type="button"
                onClick={() =>
                  openEdit(row)
                }
                className="rounded-lg border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"
              >
                <Pencil className="h-4 w-4" />
              </SharedSecondaryButton>
            </div>
          )}
        />
      </div>

      {modalMode && (
        <WorkspaceModal header={<>

<div>
                <h3 className="text-lg font-black text-white">
                  {modalMode ===
                  "create"
                    ? t.customersServicesUi.newChangeRequest
                    : modalMode ===
                        "edit"
                      ? t.customersServicesUi.editChangeRequest
                      : t.customersServicesUi.changeRequestDetails}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {t.customersServicesUi.changeRequestWorkflowDesc}
                </p>
              </div>

<SharedSecondaryButton
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-white/10 p-2 text-slate-400"
              >
                <X className="h-5 w-5" />
              </SharedSecondaryButton>

</>} onClose={
                  closeModal
                } busy={
                  saving
                }>
{modalMode ===
              "view" &&
            selected ? (
              <div className="space-y-5">

                <div className="grid gap-4 md:grid-cols-2">

                  <Detail
                    label={t.customersServicesUi.customerService}
                    value={serviceLabel(
                      selected.customer_service,
                    )}
                  />

                  <Detail
                    label={t.customersServicesUi.changeType}
                    value={
                      selected.change_type
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.status}
                    value={
                      t.common[
                        selected.status as keyof typeof t.common
                      ] || selected.status
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.created}
                    value={
                      selected.created_at ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.updated}
                    value={
                      selected.updated_at ||
                      "—"
                    }
                  />

                  <Detail
                    label={t.customersServicesUi.requestId}
                    value={
                      selected.id
                    }
                    mono
                  />
                </div>

                <Detail
                  label={t.customersServicesUi.reason}
                  value={
                    selected.reason ||
                    "—"
                  }
                />

                <Detail
                  label={t.customersServicesUi.requestedValues}
                  value={JSON.stringify(
                    selected.requested_values ||
                      {},
                    null,
                    2,
                  )}
                  mono
                />

                <div className="flex justify-end border-t border-white/10 pt-5">

                  <SharedPrimaryButton
                    type="button"
                    onClick={() =>
                      openEdit(
                        selected,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950"
                  >
                    <Pencil className="h-4 w-4" />
                    {t.customersServicesUi.editChangeRequest}
                  </SharedPrimaryButton>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  submitRequest
                }
                className="subscriber-dialog-form"
              >
<div className="subscriber-form-fields ">

                <Field
                  label={t.customersServicesUi.customerService}
                  required
                >
                  <SharedSelect
                    value={
                      form.customer_service
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "customer_service",
                        event.target
                          .value,
                      )
                    }
                    className="change-request-input"
                  >
                    <option value="">
                      {t.customersServicesUi.selectCustomerService}
                    </option>

                    {customerServices.map(
                      (record) => (
                        <option
                          key={
                            record.id
                          }
                          value={
                            record.id
                          }
                        >
                          {
                            record.customer_name
                          }{" "}
                          —{" "}
                          {
                            record.service_name
                          }{" "}
                          —{" "}
                          {record.identifier ||
                            record.username ||
                            record.id.slice(
                              0,
                              8,
                            )}
                        </option>
                      ),
                    )}
                  </SharedSelect>
                </Field>

                <div className="grid gap-4 md:grid-cols-2">

                  <Field
                    label={t.customersServicesUi.changeType}
                    required
                  >
                    <input
                      maxLength={64}
                      value={
                        form.change_type
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "change_type",
                          event.target
                            .value,
                        )
                      }
                      placeholder={t.customersServicesUi.changeTypePlaceholder}
                      className="hq-input change-request-input"
                    />
                  </Field>

                  <Field
                    label={t.customersServicesUi.status}
                    required
                  >
                    <SharedSelect
                      value={
                        form.status
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "status",
                          event.target
                            .value as ChangeStatus,
                        )
                      }
                      className="change-request-input"
                    >
                      <option value="requested">
                        {t.common.requested}
                      </option>

                      <option value="approved">
                        {t.common.approved}
                      </option>

                      <option value="rejected">
                        {t.common.rejected}
                      </option>

                      <option value="applied">
                        {t.common.applied}
                      </option>

                      <option value="cancelled">
                        {t.common.cancelled}
                      </option>
                    </SharedSelect>
                  </Field>
                </div>

                <Field label={t.customersServicesUi.requestedValuesJson}>
                  <textarea
                    rows={8}
                    spellCheck={false}
                    value={
                      form.requested_values
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "requested_values",
                        event.target
                          .value,
                      )
                    }
                    placeholder='{"package": "...", "status": "active"}'
                    className="hq-input change-request-input resize-y font-mono text-xs"
                  />
                </Field>

                <Field label={t.customersServicesUi.reason}>
                  <textarea
                    rows={4}
                    value={
                      form.reason
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "reason",
                        event.target
                          .value,
                      )
                    }
                    className="hq-input change-request-input resize-y"
                  />
                </Field>

                {notice?.type ===
                  "error" && (
                  <div className="flex gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-300">

                    <AlertTriangle className="h-5 w-5 shrink-0" />

                    <span>
                      {
                        notice.message
                      }
                    </span>
                  </div>
                )}

                </div>
<div className="subscriber-form-footer">

                  <SharedSecondaryButton
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
                  >
                    {t.common.cancel}
                  </SharedSecondaryButton>

                  <SharedPrimaryButton
                    type="submit"
                    disabled={
                      saving
                    }
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.common.saving}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />

                        {modalMode ===
                        "create"
                          ? t.customersServicesUi.createRequest
                          : t.common.saveChanges}
                      </>
                    )}
                  </SharedPrimaryButton>
                </div>
              </form>
            )}

</WorkspaceModal>
      )}
    </>
  );
}




