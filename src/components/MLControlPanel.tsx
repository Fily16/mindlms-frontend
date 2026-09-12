import { Radar, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { mlService, type MLTaskStatus } from "../services/ml.service";
import { useDetectionStatus } from "../hooks/useMLStatus";

/**
 * Motor de detección v2 — solo lo que le compete al psicólogo.
 *
 * Porqués:
 * - El entrenamiento del modelo desapareció de la interfaz: es una
 *   tarea técnica y ocurre automáticamente en el backend. El psicólogo
 *   solo lanza y observa la DETECCIÓN.
 * - La detección es pausada (un texto nuevo cada ~40 s): el panel y las
 *   notificaciones reciben los casos uno a uno, en tiempo real.
 * - Si el backend se apaga a mitad, guarda el punto exacto y reanuda
 *   solo al volver a encender — aquí se muestran los "ya procesados".
 */

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-mint-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-leaf-600 to-leaf-400 transition-[width] duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatusIcon({ state }: { state: MLTaskStatus["state"] }) {
  if (state === "running")
    return <Loader2 size={14} className="animate-spin text-leaf-600" />;
  if (state === "completed")
    return <CheckCircle2 size={14} className="text-bajo-700" />;
  if (state === "failed") return <XCircle size={14} className="text-alto-700" />;
  return null;
}

export default function MLControlPanel() {
  const queryClient = useQueryClient();
  const { data: detection } = useDetectionStatus();
  const isDetecting = detection?.state === "running";

  const handleDetect = async () => {
    try {
      await mlService.startDetection();
      queryClient.invalidateQueries({ queryKey: ["ml-detection-status"] });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail: string } } }).response?.data
              ?.detail
          : "Error al iniciar";
      alert(msg);
    }
  };

  const r = detection?.result as Record<string, number> | null | undefined;

  return (
    <div className="rounded-3xl border border-pine-900/6 bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-600 text-white">
            <Radar
              size={20}
              strokeWidth={1.8}
              className={isDetecting ? "animate-spin" : ""}
            />
          </div>
          <div>
            <div className="text-[16px] font-bold text-pine-900">
              Detección en Moodle
            </div>
            <div className="text-[12.5px] text-pine-900/45">
              Analiza los textos nuevos del aula virtual, uno a uno y en
              tiempo real
            </div>
          </div>
        </div>

        <button
          onClick={handleDetect}
          disabled={isDetecting}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-leaf-500 to-leaf-600 px-6 py-3 text-[13.5px] font-semibold text-white shadow-md shadow-leaf-600/20 transition-all hover:brightness-110 disabled:opacity-50"
        >
          {isDetecting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Analizando...
            </>
          ) : (
            "Ejecutar detección"
          )}
        </button>
      </div>

      {detection && detection.state !== "idle" && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[13px] text-pine-900/60">
            <StatusIcon state={detection.state} />
            <span className="truncate">{detection.current_step}</span>
          </div>
          <ProgressBar value={detection.progress} />

          {r && (
            <div className="flex flex-wrap gap-2">
              {[
                `${r.analyzed ?? 0} textos nuevos`,
                `${r.alerts_generated ?? 0} alertas`,
                `${r.students_processed ?? 0} estudiantes`,
                ...(r.skipped
                  ? [`${r.skipped} ya procesados (no se repiten)`]
                  : []),
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-mint-100 px-3 py-1 text-[12px] font-semibold text-pine-900/60"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {detection.state === "failed" && (
            <p className="text-[12.5px] font-medium text-alto-700">
              {detection.error} — al volver a ejecutar, continúa desde donde
              se quedó.
            </p>
          )}
        </div>
      )}

      <p className="mt-5 flex items-center gap-1.5 rounded-xl bg-mint-50 px-4 py-2.5 text-[12px] text-pine-900/50">
        <Sparkles size={12} className="shrink-0 text-leaf-600" />
        El modelo de lenguaje se entrena y actualiza automáticamente — no
        necesitas configurarlo. Si el sistema se apaga a mitad de un
        análisis, continúa solo desde el último estudiante procesado.
      </p>
    </div>
  );
}
