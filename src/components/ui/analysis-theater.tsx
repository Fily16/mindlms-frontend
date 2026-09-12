import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Cpu,
  FileText,
  Sparkles,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Radar,
  ShieldAlert,
  Activity,
} from "lucide-react";
import type {
  DetectionAlertEvent,
  LinguisticMarkers,
} from "../../hooks/useDetectionEvents";
import type { RiskLevel } from "../../types";

/**
 * AnalysisTheater — modal cinematográfico que muestra CÓMO el modelo
 * analiza un texto.  Se abre cuando llega un `new_alert` con `text`,
 * despliega el texto con typewriter, ejecuta el "pseudocódigo" del
 * pipeline línea a línea y termina con el veredicto animado.
 *
 * Objetivo: en el video de tesis, el profesor ve al modelo pensando —
 * no un cuadrito seco con un número al final.
 */

const LEVEL_COLOR: Record<RiskLevel, string> = {
  alto: "#ef4444",
  medio: "#f59e0b",
  bajo: "#10b981",
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  alto: "RIESGO ALTO",
  medio: "RIESGO MEDIO",
  bajo: "RIESGO BAJO",
};

const MARKER_META: Array<{
  key: keyof LinguisticMarkers;
  label: string;
  hint: string;
}> = [
  {
    key: "first_person_pronouns",
    label: "Pronombres 1ª persona",
    hint: "Foco en el yo, señal de rumiación",
  },
  {
    key: "negations",
    label: "Negaciones",
    hint: "'no', 'nunca', 'nada'",
  },
  {
    key: "negative_emotions",
    label: "Emociones negativas",
    hint: "'ansiedad', 'estrés', 'agotado'",
  },
  {
    key: "past_tense",
    label: "Tiempo pasado",
    hint: "Rumiación sobre el pasado",
  },
  {
    key: "isolation_references",
    label: "Aislamiento social",
    hint: "'solo', 'nadie', 'abandonado'",
  },
];

const STEPS = [
  { label: "clean_text(text)", desc: "Normalizar y limpiar HTML" },
  { label: "anonymize_text(text)", desc: "Ley 29733 — remover PII" },
  { label: "extract_markers(text)", desc: "Densidad de marcadores lingüísticos" },
  { label: "detect_high_risk_fragments()", desc: "Regex de patrones críticos" },
  { label: "RoBERTa_es.classify(text)", desc: "Transformer fine-tuned en español" },
  { label: "compute_risk_level(score)", desc: "Threshold: <0.45 bajo, <0.75 medio, ≥0.75 alto" },
];

/** Escribe una cadena carácter por carácter en un state. */
function useTypewriter(text: string, speed = 18) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

/** Cuenta 0 → target con easing. */
function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    setVal(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function AnalysisTheater({
  event,
  queueSize = 0,
  onClose,
}: {
  event: DetectionAlertEvent | null;
  queueSize?: number;
  onClose: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {event && (
        <TheaterContent
          key={event.student_id + event.text}
          event={event}
          queueSize={queueSize}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

function TheaterContent({
  event,
  queueSize,
  onClose,
}: {
  event: DetectionAlertEvent;
  queueSize: number;
  onClose: () => void;
}) {
  const color = LEVEL_COLOR[event.risk_level];
  const scoreValue = event.risk_score ?? 0;
  const confidenceValue = event.confidence ?? 0;
  const markers = event.linguistic_markers ?? {};
  const matchedWords = event.matched_words ?? {};
  const flagged = event.flagged_fragments ?? [];

  const typedText = useTypewriter(event.text || "", 12);
  const [stepIdx, setStepIdx] = useState(0);
  const [revealResult, setRevealResult] = useState(false);
  // Minimizar: colapsa el cuerpo pero mantiene el header visible.
  // Así el usuario puede ver el resto del dashboard sin perder el
  // análisis en curso (siempre está a un click de re-expandirse).
  const [minimized, setMinimized] = useState(false);

  // Fases: typewriter → pseudocódigo → resultado
  useEffect(() => {
    // pseudocódigo empieza cuando el texto ya escribió al menos 40%
    const textLen = (event.text || "").length;
    const startAt = Math.max(500, Math.min(2000, (textLen * 12) / 3));
    const startTimer = setTimeout(() => {
      setStepIdx(1);
      let i = 1;
      const stepInterval = setInterval(() => {
        i++;
        if (i > STEPS.length) {
          clearInterval(stepInterval);
          setRevealResult(true);
        } else {
          setStepIdx(i);
        }
      }, 550);
    }, startAt);
    return () => clearTimeout(startTimer);
  }, [event.text]);

  // (Se removió el auto-cierre — el panel solo cierra con el botón)

  const scoreDisplay = useCountUp(revealResult ? scoreValue * 100 : 0);
  const confidenceDisplay = useCountUp(revealResult ? confidenceValue * 100 : 0);

  const markersList = useMemo(
    () =>
      MARKER_META.map((m) => ({
        ...m,
        value: (markers[m.key] as number | undefined) ?? 0,
      })),
    [markers]
  );

  return (
    // Panel FIXED al viewport para que llegue al fondo real de la
    // pantalla sin importar dónde esté renderizado en el DOM (antes
    // quedaba atrapado dentro del slider del dashboard).
    // Aparece justo debajo del navbar + strip verde, con scroll interno.
    <motion.div
      key="theater"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-1/2 -translate-x-1/2 top-[76px] bottom-4 w-[min(96vw,900px)] z-[95] pointer-events-none"
    >
      <div className="h-full pointer-events-auto">
        <div
          className="theater theater-scroll relative rounded-2xl border border-white/12 bg-black shadow-2xl overflow-y-auto overflow-x-hidden h-full"
          style={{
            boxShadow: `0 20px 60px ${color}30, 0 0 0 1px ${color}22`,
            overscrollBehavior: "contain",
          }}
        >
        {/* Halo sutil del color de riesgo */}
        <div
          className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full blur-3xl opacity-15"
          style={{ background: color }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-10 bg-leaf-500"
        />

        {/* ─── Header ─── */}
        <div className="relative flex items-center gap-3 px-5 py-3 border-b border-white/8">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `${color}22`, color }}
          >
            <Radar size={18} className="animate-spin-slow" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.25em] text-leaf-300/70 uppercase">
              Motor de análisis · en vivo
            </p>
            <h2 className="text-[15px] font-extrabold text-white truncate">
              {event.student_name || "Estudiante"}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {queueSize > 0 && (
              <span
                className="hidden sm:flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-[10.5px] font-bold text-white/85"
                title={`${queueSize} caso(s) esperando`}
              >
                +{queueSize} en cola
              </span>
            )}
            <button
              onClick={() => setMinimized((m) => !m)}
              className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white transition"
              title={minimized ? "Mostrar análisis" : "Minimizar (ver dashboard)"}
            >
              {minimized ? (
                <>Expandir <ChevronDown size={13} /></>
              ) : (
                <>Minimizar <ChevronUp size={13} /></>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white transition"
              title={queueSize > 0 ? "Siguiente caso" : "Cerrar"}
            >
              {queueSize > 0 ? (
                <>Siguiente <ChevronRight size={13} /></>
              ) : (
                <>Cerrar <X size={13} /></>
              )}
            </button>
          </div>
        </div>

        {/* Cuerpo colapsable: al minimizar se anima height:auto → 0 y
            solo queda el header visible. El resto del dashboard queda
            libre para verse. */}
        <motion.div
          animate={{
            height: minimized ? 0 : "auto",
            opacity: minimized ? 0 : 1,
          }}
          initial={false}
          transition={{
            height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: minimized ? 0.15 : 0.25 },
          }}
          className="overflow-hidden"
        >

        {/* ─── Grid principal ─── */}
        <div className="grid gap-5 p-6 lg:grid-cols-[1.15fr_1fr]">
          {/* ─── Columna izquierda: texto + pseudocódigo ─── */}
          <div className="space-y-5">
            {/* Texto */}
            <div className="rounded-2xl border border-white/8 bg-neutral-950 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-b border-white/8">
                <FileText size={13} className="text-leaf-300" />
                <span className="text-[11px] font-bold tracking-[0.2em] text-leaf-300/80 uppercase">
                  Texto detectado · {event.source || "sin fuente"}
                </span>
              </div>
              <div className="p-4 font-mono text-[13.5px] leading-relaxed text-white/90 min-h-[110px]">
                {typedText}
                <span className="inline-block w-[7px] h-[15px] align-middle bg-leaf-400 ml-0.5 animate-pulse" />
              </div>
            </div>

            {/* Pseudocódigo */}
            <div className="rounded-2xl border border-white/8 bg-neutral-950 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-b border-white/8">
                <Cpu size={13} className="text-leaf-300" />
                <span className="text-[11px] font-bold tracking-[0.2em] text-leaf-300/80 uppercase">
                  Pipeline de análisis
                </span>
              </div>
              <div className="p-4 space-y-2 font-mono text-[12.5px]">
                {STEPS.map((step, i) => {
                  const done = i < stepIdx || revealResult;
                  const active = i === stepIdx - 1 && !revealResult;
                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{
                        opacity: done || active ? 1 : 0.28,
                        x: 0,
                      }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        className="mt-[3px] shrink-0"
                        style={{ color: done ? "#4ade80" : "#5a6a5f" }}
                      >
                        {done ? "✓" : active ? "▶" : "•"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`${
                            active ? "text-leaf-300" : done ? "text-white/90" : "text-white/55"
                          }`}
                        >
                          <span className="text-purple-300">async</span>{" "}
                          <span className="text-blue-300">await</span>{" "}
                          {step.label}
                        </div>
                        <div className="text-[11px] text-white/55 mt-0.5">
                          # {step.desc}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Flagged fragments */}
            {flagged.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-2xl border border-red-500/25 bg-red-950/25 overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/25">
                  <ShieldAlert size={13} className="text-red-300" />
                  <span className="text-[11px] font-bold tracking-[0.2em] text-red-300 uppercase">
                    Fragmentos críticos ({flagged.length})
                  </span>
                </div>
                <ul className="px-4 py-3 space-y-1.5 text-[13px] text-red-200 italic">
                  {flagged.slice(0, 4).map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* ─── Columna derecha: palabras + marcadores + veredicto ─── */}
          <div className="space-y-5">
            {/* Palabras detectadas (evidencia trazable) */}
            <MatchedWordsPanel words={matchedWords} visible={revealResult} />

            {/* Metadatos del análisis */}
            {revealResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-2xl border border-white/8 bg-neutral-950 p-4 grid grid-cols-3 gap-3"
              >
                <MiniMeta
                  label="Palabras"
                  value={String(event.word_count ?? 0)}
                />
                <MiniMeta
                  label="Caracteres"
                  value={String(event.char_count ?? 0)}
                />
                <MiniMeta
                  label="Modelo"
                  value={
                    event.model_backend === "transformer"
                      ? "RoBERTa"
                      : event.model_backend === "random_forest"
                      ? "Random Forest"
                      : "Reglas"
                  }
                />
              </motion.div>
            )}

            {/* Marcadores */}
            <div className="rounded-2xl border border-white/8 bg-neutral-950 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={13} className="text-leaf-300" />
                <span className="text-[11px] font-bold tracking-[0.2em] text-leaf-300/80 uppercase">
                  Densidad de marcadores
                </span>
              </div>
              <div className="space-y-3">
                {markersList.map((m, i) => (
                  <MarkerBar
                    key={m.key}
                    label={m.label}
                    hint={m.hint}
                    value={revealResult ? m.value : 0}
                    delay={i * 90}
                  />
                ))}
              </div>
            </div>

            {/* Veredicto */}
            <motion.div
              animate={{
                borderColor: revealResult ? `${color}88` : "rgba(255,255,255,0.08)",
                boxShadow: revealResult
                  ? `0 0 60px ${color}55, inset 0 0 30px ${color}15`
                  : "none",
              }}
              className="relative rounded-2xl border p-5 overflow-hidden"
              style={{
                background: revealResult
                  ? `linear-gradient(135deg, ${color}15, transparent 60%)`
                  : "rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Brain size={13} style={{ color }} />
                <span
                  className="text-[11px] font-bold tracking-[0.2em] uppercase"
                  style={{ color }}
                >
                  Veredicto del modelo
                </span>
              </div>

              {revealResult ? (
                <>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  >
                    <div
                      className="text-[36px] font-black leading-none tracking-tight"
                      style={{ color }}
                    >
                      {LEVEL_LABEL[event.risk_level]}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <MetricBox
                        label="Risk score"
                        value={`${scoreDisplay.toFixed(1)}%`}
                        color={color}
                      />
                      <MetricBox
                        label="Confianza"
                        value={`${confidenceDisplay.toFixed(1)}%`}
                        color="#a7f3d0"
                      />
                    </div>
                  </motion.div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-white/60 text-[13px]">
                  <Sparkles size={14} className="animate-pulse" />
                  Procesando…
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-white/8 bg-black">
          <span className="text-[11px] text-white/60">
            {event.course_name || "Curso"} · Ley 29733 · Datos anonimizados
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/15 transition"
          >
            Continuar <ChevronRight size={13} />
          </button>
        </div>
        </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Sub-componentes ─── */

function MarkerBar({
  label,
  hint,
  value,
  delay,
}: {
  label: string;
  hint: string;
  value: number;
  delay: number;
}) {
  // El backend devuelve proporciones (0..1). Amplificamos visualmente
  // porque valores típicos son <0.1; multiplicar por 5 hace la barra
  // legible sin distorsionar la comparación relativa.
  const scaled = Math.min(1, value * 5);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-white/90">{label}</span>
        <span className="text-[11px] font-mono text-white/60">
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div className="text-[10.5px] text-white/35 mb-1.5">{hint}</div>
      <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${scaled * 100}%` }}
          transition={{
            delay: delay / 1000,
            duration: 0.9,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-full rounded-full bg-gradient-to-r from-leaf-500 to-leaf-300"
        />
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
      <div className="text-[10px] font-semibold tracking-wide uppercase text-white/45">
        {label}
      </div>
      <div
        className="text-[20px] font-black tabular-nums mt-0.5"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Panel de "palabras detectadas": la evidencia trazable de por qué
 * el modelo clasificó el texto donde lo hizo.  Cada chip es una palabra
 * EXACTA que apareció en el texto y que pertenece a una categoría del
 * lexicón (emociones negativas, aislamiento, etc.).
 */
const WORD_CATEGORIES: Array<{
  key: keyof import("../../hooks/useDetectionEvents").MatchedWords;
  label: string;
  color: string;
  bg: string;
  border: string;
  hint: string;
}> = [
  {
    key: "emotions",
    label: "Emociones negativas",
    color: "#fca5a5",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.25)",
    hint: "Palabras del lexicón afectivo negativo",
  },
  {
    key: "isolation",
    label: "Aislamiento social",
    color: "#c4b5fd",
    bg: "rgba(139,92,246,0.10)",
    border: "rgba(139,92,246,0.25)",
    hint: "Referencias a soledad o abandono",
  },
  {
    key: "hopelessness",
    label: "Desesperanza",
    color: "#fdba74",
    bg: "rgba(249,115,22,0.10)",
    border: "rgba(249,115,22,0.25)",
    hint: "Marcadores de falta de esperanza",
  },
  {
    key: "negations",
    label: "Negaciones",
    color: "#fcd34d",
    bg: "rgba(234,179,8,0.10)",
    border: "rgba(234,179,8,0.25)",
    hint: "Patrón lingüístico de rumiación",
  },
  {
    key: "first_person",
    label: "Foco en el yo",
    color: "#6ee7b7",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.25)",
    hint: "Pronombres de primera persona",
  },
];

function MatchedWordsPanel({
  words,
  visible,
}: {
  words: import("../../hooks/useDetectionEvents").MatchedWords;
  visible: boolean;
}) {
  const nonEmpty = WORD_CATEGORIES.filter(
    (c) => (words[c.key] ?? []).length > 0
  );
  const total = nonEmpty.reduce(
    (n, c) => n + (words[c.key]?.length ?? 0),
    0
  );

  return (
    <div className="rounded-2xl border border-white/8 bg-neutral-950 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-b border-white/8">
        <Sparkles size={13} className="text-leaf-300" />
        <span className="text-[11px] font-bold tracking-[0.2em] text-leaf-300/80 uppercase">
          Palabras detectadas
        </span>
        {visible && total > 0 && (
          <span className="ml-auto text-[10.5px] font-mono text-white/50">
            {total} match{total !== 1 ? "es" : ""}
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {!visible ? (
          <div className="text-[12px] text-white/40 italic">
            Escaneando lexicón contra el texto…
          </div>
        ) : nonEmpty.length === 0 ? (
          <div className="text-[12px] text-white/60">
            Sin palabras del lexicón de riesgo detectadas.
            <span className="block mt-1 text-white/40">
              (Buena señal: el clasificador se apoya solo en el sentido general
              del texto)
            </span>
          </div>
        ) : (
          nonEmpty.map((cat, catIdx) => {
            const list = words[cat.key] ?? [];
            return (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.1 }}
              >
                <div className="flex items-baseline justify-between mb-1.5">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: cat.color }}
                  >
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    ×{list.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((w, wi) => (
                    <motion.span
                      key={cat.key + w + wi}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: catIdx * 0.1 + wi * 0.04,
                        type: "spring",
                        stiffness: 320,
                        damping: 22,
                      }}
                      className="rounded-md px-2 py-0.5 text-[12px] font-semibold font-mono"
                      style={{
                        background: cat.bg,
                        color: cat.color,
                        border: `1px solid ${cat.border}`,
                      }}
                    >
                      {w}
                    </motion.span>
                  ))}
                </div>
                <div className="mt-1 text-[10px] text-white/35 italic">
                  {cat.hint}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[9.5px] font-bold uppercase tracking-widest text-white/45">
        {label}
      </div>
      <div className="text-[15px] font-black text-white/95 mt-0.5 tabular-nums">
        {value}
      </div>
    </div>
  );
}
