import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Activity, ShieldCheck, X } from "lucide-react";
import type { DetectionAlertEvent } from "../../hooks/useDetectionEvents";
import type { RiskLevel } from "../../types";

/**
 * Notificaciones de detección en tiempo real (estilo toast de 21st.dev).
 *
 * Porqués:
 * - El psicólogo debe SENTIR que el sistema está vivo: cada estudiante
 *   detectado aparece como una tarjeta que entra por la derecha.
 * - Ritmo dosificado: máximo 3 visibles y una nueva cada ~2 s. Ver 50
 *   detecciones de golpe abruma; verlas llegar "de a pocos" informa.
 * - Si la cola se acumula, se priorizan los riesgos más severos: lo
 *   urgente nunca espera detrás de lo rutinario.
 * - Clic en la tarjeta → abre directamente las alertas de ese
 *   estudiante (la página de alertas ya auto-abre el detalle).
 */

const SEVERITY: Record<RiskLevel, number> = { alto: 3, medio: 2, bajo: 1 };
const MAX_VISIBLE = 5; // hasta 5 tarjetas apiladas en pantalla
const DRAIN_MS = 1800; // ritmo de aparición (una cada ~2 s)
const LIFE_MS = 11000; // vida de cada tarjeta
const MAX_QUEUE = 15; // cola acotada si la detección va muy rápido

/**
 * Dos fuentes alimentan los toasts, siempre con datos reales:
 * - "live": evento SSE de una detección ocurriendo ahora mismo.
 * - "feed": monitoreo en vivo — alertas reales de la base de datos que
 *   van apareciendo de a pocos para que el panel nunca se sienta muerto.
 */
export interface ToastEvent extends DetectionAlertEvent {
  at?: string; // fecha real de la alerta (ISO); ausente = ahora mismo
  kind?: "live" | "feed";
}

export interface AlertToast extends ToastEvent {
  id: number;
}

function timeAgo(iso?: string): string {
  if (!iso) return "ahora mismo";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export function useAlertToasts() {
  const [toasts, setToasts] = useState<AlertToast[]>([]);
  const pending = useRef<ToastEvent[]>([]);
  const nextId = useRef(1);

  const pushAlert = useCallback((e: ToastEvent) => {
    // Un caso de riesgo bajo se registra y sigue en monitoreo, pero no
    // interrumpe al psicólogo: avisar de cada texto sano convertiría la
    // pantalla en ruido y restaría valor a los avisos que sí importan.
    if (e.risk_level === "bajo") return;
    pending.current.push(e);
    if (pending.current.length > MAX_QUEUE) {
      // conservar lo más severo cuando hay avalancha
      pending.current.sort(
        (a, b) => SEVERITY[b.risk_level] - SEVERITY[a.risk_level]
      );
      pending.current.length = MAX_QUEUE;
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setToasts((prev) => {
        if (!pending.current.length || prev.length >= MAX_VISIBLE) return prev;
        // las detecciones en vivo primero; dentro de cada grupo, lo urgente
        pending.current.sort(
          (a, b) =>
            (a.kind === "feed" ? 1 : 0) - (b.kind === "feed" ? 1 : 0) ||
            SEVERITY[b.risk_level] - SEVERITY[a.risk_level]
        );
        const evt = pending.current.shift()!;
        const id = nextId.current++;
        setTimeout(() => {
          setToasts((p) => p.filter((t) => t.id !== id));
        }, LIFE_MS);
        return [...prev, { ...evt, id }];
      });
    }, DRAIN_MS);
    return () => clearInterval(interval);
  }, []);

  return { toasts, pushAlert, dismiss };
}

const LEVEL_CONFIG: Record<
  RiskLevel,
  { icon: typeof AlertTriangle; color: string; label: string; chip: string }
> = {
  alto: {
    icon: AlertTriangle,
    color: "#ef4444",
    label: "Riesgo alto",
    chip: "bg-alto-500/15 text-red-300",
  },
  medio: {
    icon: Activity,
    color: "#f59e0b",
    label: "Riesgo medio",
    chip: "bg-medio-500/15 text-amber-300",
  },
  bajo: {
    icon: ShieldCheck,
    color: "#10b981",
    label: "Riesgo bajo",
    chip: "bg-bajo-500/15 text-emerald-300",
  },
};

export function LiveAlertToasts({
  toasts,
  onDismiss,
}: {
  toasts: AlertToast[];
  onDismiss: (id: number) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed top-20 right-5 z-[80] flex w-[min(94vw,440px)] flex-col gap-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const cfg = LEVEL_CONFIG[toast.risk_level] ?? LEVEL_CONFIG.bajo;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 460, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 460, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              onClick={() =>
                navigate(
                  `/alertas?student=${encodeURIComponent(toast.student_id)}`
                )
              }
              className="relative cursor-pointer overflow-hidden rounded-3xl border border-white/12 bg-pine-900/95 backdrop-blur transition-transform hover:scale-[1.02]"
              style={{
                // Borde de riesgo + halo del color: visible desde el rabillo del ojo
                boxShadow: `inset 6px 0 0 0 ${cfg.color}, 0 12px 48px ${cfg.color}45, 0 8px 24px rgba(3,16,11,0.5)`,
              }}
            >
              <div className="flex items-start gap-4 p-5">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: `${cfg.color}26`, color: cfg.color }}
                >
                  <Icon size={26} strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold tracking-[0.16em] text-leaf-300/85 uppercase">
                      {toast.kind === "feed"
                        ? "Monitoreo en vivo"
                        : "Nueva detección"}
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf-400" />
                    </span>
                    {toast.source === "formulario_validacion" && (
                      <span className="rounded-md bg-leaf-400/20 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-leaf-300 uppercase ring-1 ring-leaf-400/40">
                        Datos reales
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[18px] leading-tight font-extrabold text-white">
                    {toast.student_name || "Estudiante"}
                  </p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-bold uppercase ${cfg.chip}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="truncate text-[12px] text-white/45">
                      {toast.student_id}
                    </span>
                    <span className="ml-auto shrink-0 text-[12px] font-medium text-white/40">
                      {timeAgo(toast.at)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(toast.id);
                  }}
                  className="rounded-full p-1.5 text-white/35 transition-colors hover:bg-white/10 hover:text-white"
                  title="Descartar"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Cuenta regresiva de vida de la tarjeta */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: LIFE_MS / 1000, ease: "linear" }}
                className="h-[4px]"
                style={{ background: cfg.color }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
