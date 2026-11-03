import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  brandingApi,
  type Session,
  type SystemBackgroundConfig,
} from "../../lib/api";

const DEFAULT_BACKGROUND =
  "/branding/hqnatex-system-background.webp";

export const BRANDING_UPDATED_EVENT =
  "hqnatex:branding-updated";

function cssUrl(
  value: string,
): string {
  const safe =
    value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');

  return `url("${safe}")`;
}

function applyOptions(
  config: SystemBackgroundConfig,
) {
  const root =
    document.documentElement;

  root.style.setProperty(
    "--hq-system-background-position",
    config.position,
  );

  root.style.setProperty(
    "--hq-system-background-size",
    config.size,
  );

  root.style.setProperty(
    "--hq-system-background-dark-overlay-opacity",
    String(
      config.dark_overlay_opacity,
    ),
  );

  root.style.setProperty(
    "--hq-system-background-light-overlay-opacity",
    String(
      config.light_overlay_opacity,
    ),
  );
}

function applyDefaultBackground() {
  document.documentElement
    .style
    .setProperty(
      "--hq-system-background-image",
      cssUrl(DEFAULT_BACKGROUND),
    );
}

export function GlobalBackgroundController({
  session,
}: {
  session: Session;
}) {
  const objectUrlRef =
    useRef<string | null>(null);

  const sequenceRef =
    useRef(0);

  const revokeObjectUrl =
    useCallback(() => {
      if (!objectUrlRef.current) {
        return;
      }

      URL.revokeObjectURL(
        objectUrlRef.current,
      );

      objectUrlRef.current = null;
    }, []);

  const load =
    useCallback(async () => {
      const sequence =
        ++sequenceRef.current;

      revokeObjectUrl();

      /*
       * Important isolation rule:
       * never keep Company A image visible
       * while Company B state is loading.
       */
      applyDefaultBackground();

      if (
        !session.tenantId ||
        !session.companyId
      ) {
        return;
      }

      try {
        const config =
          await brandingApi.get(
            session,
          );

        if (
          sequence !==
          sequenceRef.current
        ) {
          return;
        }

        applyOptions(config);

        if (
          config.mode === "custom" &&
          config.is_custom &&
          !config.uses_default
        ) {
          const blob =
            await brandingApi.fileBlob(
              session,
            );

          if (
            sequence !==
            sequenceRef.current
          ) {
            return;
          }

          const objectUrl =
            URL.createObjectURL(blob);

          objectUrlRef.current =
            objectUrl;

          document.documentElement
            .style
            .setProperty(
              "--hq-system-background-image",
              cssUrl(objectUrl),
            );

          return;
        }

        document.documentElement
          .style
          .setProperty(
            "--hq-system-background-image",
            cssUrl(
              config.background_url ||
                DEFAULT_BACKGROUND,
            ),
          );
      } catch (error) {
        console.error(
          "HQNATEX_BACKGROUND_LOAD_FAILED",
          error,
        );

        if (
          sequence ===
          sequenceRef.current
        ) {
          applyDefaultBackground();
        }
      }
    }, [
      revokeObjectUrl,
      session.access,
      session.tenantId,
      session.companyId,
    ]);

  useEffect(() => {
    void load();

    const listener = () => {
      void load();
    };

    window.addEventListener(
      BRANDING_UPDATED_EVENT,
      listener,
    );

    return () => {
      sequenceRef.current += 1;

      window.removeEventListener(
        BRANDING_UPDATED_EVENT,
        listener,
      );

      revokeObjectUrl();
    };
  }, [
    load,
    revokeObjectUrl,
  ]);

  return null;
}
