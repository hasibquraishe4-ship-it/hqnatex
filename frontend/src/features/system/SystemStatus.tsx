import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { fetchHealth, type HealthResponse } from "../../lib/api";

type StatusState =
  | { kind: "loading" }
  | { kind: "ready"; data: HealthResponse }
  | { kind: "error"; message: string };

export function SystemStatus() {
  const [status, setStatus] = useState<StatusState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetchHealth(controller.signal)
      .then((data: HealthResponse) => setStatus({ kind: "ready", data }))
      .catch((error: Error) => {
        if (controller.signal.aborted) {
          return;
        }
        setStatus({ kind: "error", message: error.message });
      });

    return () => controller.abort();
  }, []);

  if (status.kind === "loading") {
    return (
      <Panel title="API status">
        <div className="flex items-center gap-3 text-slate-300" role="status" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Checking backend liveness
        </div>
      </Panel>
    );
  }

  if (status.kind === "error") {
    return (
      <Panel title="API status">
        <div className="flex items-start gap-3 text-rose-200" role="alert">
          <XCircle className="mt-0.5 h-5 w-5" aria-hidden="true" />
          <div>
            <p className="font-medium">Backend is not reachable from the browser.</p>
            <p className="mt-1 text-sm text-rose-100/80">{status.message}</p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="API status">
      <div className="flex items-start gap-3 text-emerald-200" role="status" aria-live="polite">
        <CheckCircle2 className="mt-0.5 h-5 w-5" aria-hidden="true" />
        <div>
          <p className="font-medium">Backend liveness confirmed</p>
          <dl className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Service</dt>
              <dd>{status.data.service}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Version</dt>
              <dd>{status.data.version}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>{status.data.status}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="hq-visual-panel rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

