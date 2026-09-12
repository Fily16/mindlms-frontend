import { motion, AnimatePresence } from "framer-motion";
import { Radar, BrainCog, Database } from "lucide-react";
import { useDetectionStatus, useTrainingStatus } from "../../hooks/useMLStatus";
import { useTheater } from "../../contexts/TheaterContext";
import { AnalysisTheater } from "./analysis-theater";

/**
 * Latido del sistema en la cara principal del panel.
 *
 * Porqués:
 * - El psicólogo debe ver que el sistema está VIVO sin ir a buscar:
 *   si hay una extracción corriendo, aquí se ve el estudiante en curso
 *   y los contadores subiendo en tiempo real.
 * - El entrenamiento del modelo es automático (sin botón): cuando
 *   ocurre, se muestra como actividad observable, no configurable.
 * - En reposo, el latido confirma que sigue escuchando a Moodle.
 */
export function LiveSystemStrip() {
  const { data: detection } = useDetectionStatus();
  const { data: training } = useTrainingStatus();
  const { event: theaterEvent, queueSize, dismiss } = useTheater();

  const detecting = detection?.state === "running";
  const trainingNow = training?.state === "running";
  const r = detection?.result as Record<string, number> | null | undefined;

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-2">
      <AnimatePresence mode="wait">
        {detecting ? (
          /* ── Extracción en vivo ── */
          <motion.div
            key="detecting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-light w-full rounded-2xl px-5 py-4 shadow-lg shadow-leaf-600/10"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf-600 text-white">
                <Radar size={18} className="animate-spin" />
                <span className="absolute -inset-1 -z-10 animate-ping rounded-xl bg-leaf-500/40" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[13px] font-bold text-pine-900">
                  Extrayendo datos de Moodle en tiempo real
                </div>
                <div className="truncate text-[12px] text-pine-900/55">
                  {detection?.current_step || "Analizando textos..."}
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                {[
                  { n: r?.analyzed ?? 0, l: "analizados" },
                  { n: r?.alerts_generated ?? 0, l: "alertas" },
                  { n: r?.students_processed ?? 0, l: "estudiantes" },
                ].map(({ n, l }) => (
                  <div
                    key={l}
                    className="rounded-xl bg-white/80 px-3 py-1.5 text-center"
                  >
                    <div className="text-[15px] leading-none font-extrabold text-pine-900 tabular-nums">
                      {n}
                    </div>
                    <div className="text-[10px] text-pine-900/45">{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Progreso con brillo en movimiento: algo está pasando */}
            <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-pine-900/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-leaf-600 to-leaf-400 transition-[width] duration-700"
                style={{ width: `${detection?.progress ?? 0}%` }}
              />
              <motion.div
                animate={{ x: ["-100%", "350%"] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                className="absolute top-0 h-full w-1/3 bg-white/40 blur-sm"
              />
            </div>
          </motion.div>
        ) : trainingNow ? (
          /* ── Entrenamiento automático (solo observable) ── */
          <motion.div
            key="training"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-light flex w-full items-center gap-3 rounded-2xl px-5 py-4 shadow-lg shadow-leaf-600/10"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine-900 text-leaf-300"
            >
              <BrainCog size={18} />
            </motion.span>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[13px] font-bold text-pine-900">
                El modelo se está reentrenando automáticamente
              </div>
              <div className="truncate text-[12px] text-pine-900/55">
                {training?.current_step || "Optimizando el clasificador..."}
              </div>
            </div>
            <span className="shrink-0 text-[12px] font-bold text-pine-900/50 tabular-nums">
              {training?.progress ?? 0}%
            </span>
          </motion.div>
        ) : (
          /* ── Reposo: el latido de siempre ── */
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-full bg-pine-900/4 px-4 py-1.5 text-[12px] text-pine-900/50"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf-500" />
            </span>
            Sistema escuchando Moodle · el modelo se actualiza automáticamente
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sello de datos reales del estudio de validación */}
      <div className="flex items-center gap-1.5 rounded-full border border-leaf-600/20 bg-leaf-500/8 px-3.5 py-1 text-[11.5px] font-semibold text-leaf-700">
        <Database size={11} />
        Incluye datos reales del formulario de validación
      </div>

      {/* AnalysisTheater: cuando llega un new_alert con texto, este
          panel se despliega justo aquí, debajo de la barra verde.
          Al cerrar (dismiss) carga el siguiente de la cola. */}
      <div className="w-full">
        <AnalysisTheater
          event={theaterEvent}
          queueSize={queueSize}
          onClose={dismiss}
        />
      </div>
    </div>
  );
}
