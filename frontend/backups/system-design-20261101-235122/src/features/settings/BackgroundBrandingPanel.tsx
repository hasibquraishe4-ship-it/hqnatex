import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  MonitorUp,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";

import {
  brandingApi,
  type Session,
  type SystemBackgroundConfig,
  type SystemBackgroundOptions,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

import {
  BACKGROUND_CONTRACT,
} from "./backgroundContract";

import {
  BRANDING_UPDATED_EVENT,
} from "./GlobalBackgroundController";

const DEFAULT_BACKGROUND =
  "/branding/hqnatex-system-background.webp";

type Props = {
  session: Session;
};

type ImageDimensions = {
  width: number;
  height: number;
};

function formatBytes(
  bytes: number | null,
): string {
  if (
    bytes === null ||
    !Number.isFinite(bytes)
  ) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function readDimensions(
  file: File,
): Promise<ImageDimensions> {
  return new Promise(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(file);

      const image =
        new Image();

      image.onload = () => {
        const result = {
          width:
            image.naturalWidth,
          height:
            image.naturalHeight,
        };

        URL.revokeObjectURL(url);

        resolve(result);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);

        reject(
          new Error(
            "IMAGE_DIMENSION_READ_FAILED",
          ),
        );
      };

      image.src = url;
    },
  );
}

export function BackgroundBrandingPanel({
  session,
}: Props) {
  const { t } =
    useTranslation();

  const [
    config,
    setConfig,
  ] =
    useState<SystemBackgroundConfig | null>(
      null,
    );

  const [
    options,
    setOptions,
  ] =
    useState<SystemBackgroundOptions | null>(
      null,
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(null);

  const [
    dimensions,
    setDimensions,
  ] =
    useState<ImageDimensions | null>(
      null,
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState(DEFAULT_BACKGROUND);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const remoteObjectUrl =
    useRef<string | null>(null);

  const localObjectUrl =
    useRef<string | null>(null);

  const revokeRemote =
    useCallback(() => {
      if (
        remoteObjectUrl.current
      ) {
        URL.revokeObjectURL(
          remoteObjectUrl.current,
        );

        remoteObjectUrl.current =
          null;
      }
    }, []);

  const revokeLocal =
    useCallback(() => {
      if (
        localObjectUrl.current
      ) {
        URL.revokeObjectURL(
          localObjectUrl.current,
        );

        localObjectUrl.current =
          null;
      }
    }, []);

  const emitUpdated =
    useCallback(() => {
      window.dispatchEvent(
        new Event(
          BRANDING_UPDATED_EVENT,
        ),
      );
    }, []);

  const load =
    useCallback(async () => {
      setLoading(true);
      setError("");

      revokeRemote();

      try {
        const result =
          await brandingApi.get(
            session,
          );

        setConfig(result);

        setOptions({
          position:
            result.position,

          size:
            result.size,

          dark_overlay_opacity:
            result.dark_overlay_opacity,

          light_overlay_opacity:
            result.light_overlay_opacity,
        });

        if (
          result.mode === "custom" &&
          result.is_custom &&
          !result.uses_default
        ) {
          const blob =
            await brandingApi.fileBlob(
              session,
            );

          const url =
            URL.createObjectURL(blob);

          remoteObjectUrl.current =
            url;

          setPreviewUrl(url);
        } else {
          setPreviewUrl(
            result.background_url ||
              DEFAULT_BACKGROUND,
          );
        }
      } catch (loadError) {
        setPreviewUrl(
          DEFAULT_BACKGROUND,
        );

        setError(
          t.settings
            .backgroundLoadFailed,
        );

        console.error(
          "HQNATEX_BRANDING_UI_LOAD_FAILED",
          loadError,
        );
      } finally {
        setLoading(false);
      }
    }, [
      revokeRemote,
      session.access,
      session.tenantId,
      session.companyId,
      t,
    ]);

  useEffect(() => {
    revokeLocal();

    setSelectedFile(null);
    setDimensions(null);
    setSuccess("");

    void load();

    return () => {
      revokeRemote();
      revokeLocal();
    };
  }, [
    load,
    revokeLocal,
    revokeRemote,
    session.companyId,
    session.tenantId,
  ]);

  const validateFile =
    useCallback(
      async (
        file: File,
      ) => {
        const typeAllowed =
          BACKGROUND_CONTRACT
            .allowedContentTypes
            .some(
              (type) =>
                type === file.type,
            );

        if (!typeAllowed) {
          throw new Error(
            t.settings
              .invalidFileType,
          );
        }

        if (
          file.size >
          BACKGROUND_CONTRACT
            .maxBytes
        ) {
          throw new Error(
            t.settings.fileTooLarge
              .replace(
                "{size}",
                formatBytes(
                  BACKGROUND_CONTRACT
                    .maxBytes,
                ),
              ),
          );
        }

        const result =
          await readDimensions(
            file,
          );

        if (
          result.width >
            BACKGROUND_CONTRACT
              .maxWidth ||
          result.height >
            BACKGROUND_CONTRACT
              .maxHeight
        ) {
          throw new Error(
            t.settings
              .imageDimensionsInvalid,
          );
        }

        return result;
      },
      [t],
    );

  const chooseFile =
    useCallback(
      async (
        event:
          ChangeEvent<HTMLInputElement>,
      ) => {
        const file =
          event.target
            .files?.[0];

        event.target.value = "";

        if (!file) {
          return;
        }

        setError("");
        setSuccess("");

        try {
          const result =
            await validateFile(
              file,
            );

          revokeLocal();

          const url =
            URL.createObjectURL(
              file,
            );

          localObjectUrl.current =
            url;

          setSelectedFile(file);
          setDimensions(result);
          setPreviewUrl(url);
        } catch (
          validationError
        ) {
          setError(
            validationError
              instanceof Error
              ? validationError.message
              : t.settings
                  .backgroundUploadFailed,
          );
        }
      },
      [
        revokeLocal,
        t,
        validateFile,
      ],
    );

  const saveOptions =
    useCallback(async () => {
      if (!options) {
        return;
      }

      setBusy(true);
      setError("");
      setSuccess("");

      try {
        await brandingApi.update(
          session,
          options,
        );

        emitUpdated();

        await load();

        setSuccess(
          t.settings
            .appearanceSaved,
        );
      } catch (saveError) {
        console.error(
          "HQNATEX_BRANDING_SAVE_FAILED",
          saveError,
        );

        setError(
          t.settings
            .backgroundSaveFailed,
        );
      } finally {
        setBusy(false);
      }
    }, [
      emitUpdated,
      load,
      options,
      session,
      t,
    ]);

  const upload =
    useCallback(async () => {
      if (
        !selectedFile ||
        !options
      ) {
        return;
      }

      setBusy(true);
      setError("");
      setSuccess("");

      try {
        await brandingApi.upload(
          session,
          selectedFile,
          options,
        );

        revokeLocal();

        setSelectedFile(null);
        setDimensions(null);

        emitUpdated();

        await load();

        setSuccess(
          t.settings
            .backgroundUploaded,
        );
      } catch (uploadError) {
        console.error(
          "HQNATEX_BRANDING_UPLOAD_FAILED",
          uploadError,
        );

        setError(
          t.settings
            .backgroundUploadFailed,
        );
      } finally {
        setBusy(false);
      }
    }, [
      emitUpdated,
      load,
      options,
      revokeLocal,
      selectedFile,
      session,
      t,
    ]);

  const remove =
    useCallback(async () => {
      setBusy(true);
      setError("");
      setSuccess("");

      try {
        await brandingApi.remove(
          session,
        );

        emitUpdated();

        await load();

        setSuccess(
          t.settings
            .backgroundRemoved,
        );
      } catch (removeError) {
        console.error(
          "HQNATEX_BRANDING_REMOVE_FAILED",
          removeError,
        );

        setError(
          t.settings
            .backgroundRemoveFailed,
        );
      } finally {
        setBusy(false);
      }
    }, [
      emitUpdated,
      load,
      session,
      t,
    ]);

  const reset =
    useCallback(async () => {
      setBusy(true);
      setError("");
      setSuccess("");

      try {
        await brandingApi.reset(
          session,
        );

        emitUpdated();

        await load();

        setSuccess(
          t.settings
            .backgroundReset,
        );
      } catch (resetError) {
        console.error(
          "HQNATEX_BRANDING_RESET_FAILED",
          resetError,
        );

        setError(
          t.settings
            .backgroundResetFailed,
        );
      } finally {
        setBusy(false);
      }
    }, [
      emitUpdated,
      load,
      session,
      t,
    ]);

  const positionLabel = (
    value: string,
  ) => {
    switch (value) {
      case "center top":
        return t.settings
          .positionCenterTop;

      case "center bottom":
        return t.settings
          .positionCenterBottom;

      case "left center":
        return t.settings
          .positionLeftCenter;

      case "right center":
        return t.settings
          .positionRightCenter;

      default:
        return t.settings
          .positionCenter;
    }
  };

  const sizeLabel = (
    value: string,
  ) => {
    switch (value) {
      case "contain":
        return t.settings
          .sizeContain;

      case "auto":
        return t.settings
          .sizeAuto;

      default:
        return t.settings
          .sizeCover;
    }
  };

  if (!session.companyId) {
    return (
      <section className="glass-panel rounded-[1.25rem] p-4">
        <div className="flex items-center gap-3 text-amber-300">
          <TriangleAlert className="h-5 w-5" />

          <span className="text-sm font-bold">
            {
              t.settings
                .noCompanyForAppearance
            }
          </span>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="glass-panel rounded-[1.25rem] p-6">
        <div className="flex items-center justify-center gap-3 text-slate-400">
          <LoaderCircle className="h-5 w-5 animate-spin" />

          <span className="text-sm font-bold">
            {
              t.settings
                .loadingAppearance
            }
          </span>
        </div>
      </section>
    );
  }

  const isCustom =
    config?.mode === "custom" &&
    config.is_custom &&
    !config.uses_default;

  const previewDarkOpacity =
    options
      ?.dark_overlay_opacity ??
    0;

  return (
    <section className="glass-panel hq-glass-strong overflow-hidden rounded-[1.35rem] border border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
            <ImageIcon className="h-5 w-5 text-cyan-400" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-slate-900 dark:text-white">
              {
                t.settings
                  .systemBackground
              }
            </h3>

            <p className="mt-0.5 max-w-2xl truncate text-[11px] font-semibold text-slate-500">
              {
                t.settings
                  .systemBackgroundDesc
              }
            </p>
          </div>
        </div>

        <div
          className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] font-black ${
            isCustom
              ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
              : "border-slate-200 bg-white/60 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isCustom
                ? "bg-cyan-400"
                : "bg-slate-400"
            }`}
          />

          {isCustom
            ? t.settings
                .customBackground
            : t.settings
                .defaultBackground}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <div className="border-b border-white/[0.06] p-3.5 lg:border-b-0 lg:border-e lg:p-4">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MonitorUp className="h-4 w-4 text-cyan-500" />

              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                {t.settings.preview}
              </span>
            </div>

            {selectedFile && (
              <span className="max-w-[55%] truncate rounded-lg border border-cyan-500/15 bg-cyan-500/[0.07] px-2.5 py-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-300">
                {selectedFile.name}
              </span>
            )}
          </div>

          <div
            className="relative h-[210px] overflow-hidden rounded-[1rem] border border-white/10 bg-slate-950/20 shadow-inner sm:h-[225px] lg:h-[245px]"
            style={{
              backgroundImage:
                `url("${previewUrl}")`,

              backgroundPosition:
                options?.position ??
                "center center",

              backgroundSize:
                options?.size ??
                "cover",

              backgroundRepeat:
                "no-repeat",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  `rgba(2,11,23,${previewDarkOpacity})`,
              }}
            />

            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 hq-glass-strong rounded-xl border border-white/10 px-3 py-2.5 backdrop-blur-2xl">
              <div>
                <p className="text-xs font-black text-white">
                  HQNATEX
                </p>

                <p className="mt-0.5 text-[10px] font-semibold text-slate-300">
                  {
                    t.settings
                      .currentBackground
                  }
                </p>
              </div>

              <div className="text-end text-[10px] font-semibold text-slate-300">
                <div>
                  {positionLabel(
                    options?.position ??
                      "center center",
                  )}
                </div>

                <div className="mt-0.5 text-slate-400">
                  {sizeLabel(
                    options?.size ??
                      "cover",
                  )}
                </div>
              </div>
            </div>
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 hq-glass-soft rounded-xl border border-dashed border-cyan-500/25 px-3.5 py-3 transition hover:border-cyan-400/40 hover:bg-cyan-500/[0.08]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                <UploadCloud className="h-4 w-4 text-cyan-500" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-white">
                  {
                    t.settings
                      .chooseImage
                  }
                </p>

                <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
                  PNG · JPEG · WEBP
                  {" · "}
                  12 MB
                  {" · "}
                  7680 × 4320
                </p>
              </div>
            </div>

            <span className="shrink-0 hq-glass-soft rounded-lg px-3 py-1.5 text-[10px] font-black text-cyan-600 dark:text-cyan-300">
              {
                t.settings
                  .chooseImageShort
              }
            </span>

            <input
              type="file"
              className="hidden"
              disabled={busy}
              accept={
                BACKGROUND_CONTRACT
                  .allowedContentTypes
                  .join(",")
              }
              onChange={chooseFile}
            />
          </label>

          {(selectedFile ||
            config) && (
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="hq-glass-soft rounded-lg px-2.5 py-2">
                <div className="text-[9px] font-bold text-slate-400">
                  {
                    t.settings
                      .fileSize
                  }
                </div>

                <div className="mt-0.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
                  {selectedFile
                    ? formatBytes(
                        selectedFile.size,
                      )
                    : formatBytes(
                        config
                          ?.size_bytes ??
                          null,
                      )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white/40 px-2.5 py-2 dark:border-white/[0.06] dark:bg-white/[0.035]">
                <div className="text-[9px] font-bold text-slate-400">
                  {
                    t.settings
                      .imageDimensions
                  }
                </div>

                <div className="mt-0.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
                  {dimensions
                    ? `${dimensions.width} × ${dimensions.height}`
                    : `${config?.width ?? "—"} × ${config?.height ?? "—"}`}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white/40 px-2.5 py-2 dark:border-white/[0.06] dark:bg-white/[0.035]">
                <div className="text-[9px] font-bold text-slate-400">
                  {
                    t.settings
                      .backgroundPosition
                  }
                </div>

                <div className="mt-0.5 truncate text-[11px] font-black text-slate-700 dark:text-slate-300">
                  {positionLabel(
                    options?.position ??
                      "center center",
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white/40 px-2.5 py-2 dark:border-white/[0.06] dark:bg-white/[0.035]">
                <div className="text-[9px] font-bold text-slate-400">
                  {
                    t.settings
                      .backgroundSize
                  }
                </div>

                <div className="mt-0.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
                  {sizeLabel(
                    options?.size ??
                      "cover",
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 lg:p-4">
          <div className="mb-3 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-cyan-500" />

            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
              {
                t.settings
                  .visualSettings
              }
            </span>
          </div>

          <div className="space-y-2.5">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black text-slate-500">
                {
                  t.settings
                    .backgroundPosition
                }
              </span>

              <select
                className="glass-input h-10 w-full rounded-xl text-xs font-bold"
                disabled={
                  busy || !options
                }
                value={
                  options?.position ??
                  ""
                }
                onChange={(event) =>
                  setOptions(
                    (current) =>
                      current
                        ? {
                            ...current,
                            position:
                              event
                                .target
                                .value,
                          }
                        : current,
                  )
                }
              >
                {BACKGROUND_CONTRACT
                  .allowedPositions
                  .map(
                    (position) => (
                      <option
                        key={position}
                        value={position}
                      >
                        {positionLabel(
                          position,
                        )}
                      </option>
                    ),
                  )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black text-slate-500">
                {
                  t.settings
                    .backgroundSize
                }
              </span>

              <select
                className="glass-input h-10 w-full rounded-xl text-xs font-bold"
                disabled={
                  busy || !options
                }
                value={
                  options?.size ??
                  ""
                }
                onChange={(event) =>
                  setOptions(
                    (current) =>
                      current
                        ? {
                            ...current,
                            size:
                              event
                                .target
                                .value,
                          }
                        : current,
                  )
                }
              >
                {BACKGROUND_CONTRACT
                  .allowedSizes
                  .map(
                    (size) => (
                      <option
                        key={size}
                        value={size}
                      >
                        {sizeLabel(
                          size,
                        )}
                      </option>
                    ),
                  )}
              </select>
            </label>

            <div className="hq-glass-soft rounded-xl p-3">
              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black text-slate-500">
                    {
                      t.settings
                        .darkOverlay
                    }
                  </span>

                  <span className="hq-glass-soft rounded-md px-2 py-0.5 text-[10px] font-black text-slate-600 dark:text-slate-300">
                    {Math.round(
                      (
                        options
                          ?.dark_overlay_opacity ??
                        0
                      ) * 100,
                    )}
                    %
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  disabled={
                    busy || !options
                  }
                  value={
                    options
                      ?.dark_overlay_opacity ??
                    0
                  }
                  className="h-1.5 w-full cursor-pointer accent-cyan-500"
                  onChange={(event) =>
                    setOptions(
                      (current) =>
                        current
                          ? {
                              ...current,
                              dark_overlay_opacity:
                                Number(
                                  event
                                    .target
                                    .value,
                                ),
                            }
                          : current,
                    )
                  }
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-white/35 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black text-slate-500">
                    {
                      t.settings
                        .lightOverlay
                    }
                  </span>

                  <span className="rounded-md bg-slate-900/5 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {Math.round(
                      (
                        options
                          ?.light_overlay_opacity ??
                        0
                      ) * 100,
                    )}
                    %
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  disabled={
                    busy || !options
                  }
                  value={
                    options
                      ?.light_overlay_opacity ??
                    0
                  }
                  className="h-1.5 w-full cursor-pointer accent-cyan-500"
                  onChange={(event) =>
                    setOptions(
                      (current) =>
                        current
                          ? {
                              ...current,
                              light_overlay_opacity:
                                Number(
                                  event
                                    .target
                                    .value,
                                ),
                            }
                          : current,
                    )
                  }
                />
              </label>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {selectedFile && (
              <button
                type="button"
                disabled={
                  busy || !options
                }
                onClick={() =>
                  void upload()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-xs font-black text-slate-950 shadow-sm shadow-cyan-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}

                {
                  t.settings
                    .uploadBackground
                }
              </button>
            )}

            <button
              type="button"
              disabled={
                busy || !options
              }
              onClick={() =>
                void saveOptions()
              }
              className="inline-flex h-10 items-center justify-center gap-2 hq-glass-soft rounded-xl border border-cyan-500/25 px-4 text-xs font-black text-cyan-600 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-cyan-300"
            >
              <Save className="h-4 w-4" />

              {
                t.settings
                  .saveAppearance
              }
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  busy || !isCustom
                }
                onClick={() =>
                  void remove()
                }
                className="inline-flex h-9 items-center justify-center gap-2 hq-glass-soft rounded-xl border border-rose-500/15 px-3 text-[10px] font-black text-rose-500 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Trash2 className="h-3.5 w-3.5" />

                {
                  t.settings
                    .removeBackground
                }
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void reset()
                }
                className="inline-flex h-9 items-center justify-center gap-2 hq-glass-soft rounded-xl border border-slate-200/70 px-3 text-[10px] font-black text-slate-600 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />

                {
                  t.settings
                    .resetDefault
                }
              </button>
            </div>
          </div>

          {success && (
            <div className="mt-3 flex items-center gap-2 hq-glass-soft rounded-xl border border-emerald-500/15 px-3 py-2 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />

              <span className="leading-5">
                {success}
              </span>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 hq-glass-soft rounded-xl border border-rose-500/15 px-3 py-2 text-[10px] font-bold text-rose-400">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />

              <span className="leading-5">
                {error}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
