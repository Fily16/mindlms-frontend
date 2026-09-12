import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { dashboardService } from "../services/dashboard.service";
import { alertsService } from "../services/alerts.service";
import { AnimatedNumber } from "../components/ui/animated-number";
import { LiveSystemStrip } from "../components/ui/live-system-strip";
import {
  AlertTriangle,
  ShieldCheck,
  Activity,
  Brain,
  TrendingUp,
  Bell,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { Alert, RiskLevel } from "../types";
import { useAuth } from "../contexts/AuthContext";

/**
 * Dashboard v5 — un viaje con cuatro movimientos de cámara distintos.
 *
 * Porqués:
 * - Cada transición tiene dirección propia para que el psicólogo SIENTA
 *   el cambio de contexto (efectos vistos en 21st.dev):
 *     Estado    → sale con zoom-out a la izquierda (la cámara se aleja
 *                 del panorama general)
 *     Analítica → entra desde la derecha; sus gráficos se DIBUJAN con
 *                 el scroll: el donut se traza y las barras suben
 *     Alertas   → emerge desde abajo (los casos "suben" a la superficie)
 *     Motor ML  → zoom-in final (entramos a la sala de máquinas)
 * - Los gráficos son SVG/DOM propios (no librería) para poder atarlos
 *   al progreso del scroll: el dato se revela con el gesto del usuario.
 * - Los contadores de riesgo ahora cuentan ESTUDIANTES reales (mismo
 *   criterio que la lista filtrada): clic en "Riesgo bajo" muestra
 *   exactamente esa cantidad de estudiantes.
 */

const RISK_COLORS: Record<RiskLevel, string> = {
  alto: "#ef4444",
  medio: "#f59e0b",
  bajo: "#10b981",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
};

const riskCardStyles: Record<
  string,
  { ring: string; iconBg: string; num: string }
> = {
  alto: {
    ring: "hover:shadow-alto-500/15 hover:border-alto-200",
    iconBg: "bg-alto-50 text-alto-700",
    num: "text-alto-700",
  },
  medio: {
    ring: "hover:shadow-medio-500/15 hover:border-medio-200",
    iconBg: "bg-medio-50 text-medio-700",
    num: "text-medio-700",
  },
  bajo: {
    ring: "hover:shadow-bajo-500/20 hover:border-bajo-200",
    iconBg: "bg-bajo-50 text-bajo-700",
    num: "text-bajo-700",
  },
  hoy: {
    ring: "hover:shadow-leaf-600/15 hover:border-mint-300",
    iconBg: "bg-pine-900 text-leaf-300",
    num: "text-pine-900",
  },
};

const SCENES = ["Estado", "Analítica", "Alertas"];

/* ════════ Gráficos scroll-driven (se dibujan con el desplazamiento) ════════ */

const DONUT_R = 80;
const DONUT_C = 2 * Math.PI * DONUT_R;

function DonutSegment({
  p,
  start,
  frac,
  color,
}: {
  p: MotionValue<number>;
  start: number;
  frac: number;
  color: string;
}) {
  const dashArray = useTransform(
    p,
    (v) => `${Math.max(frac * DONUT_C * v, 0.001)} ${DONUT_C}`
  );
  const dashOffset = useTransform(p, (v) => DONUT_C / 4 - start * DONUT_C * v);
  return (
    <motion.circle
      cx="100"
      cy="100"
      r={DONUT_R}
      fill="none"
      stroke={color}
      strokeWidth="30"
      style={{ strokeDasharray: dashArray, strokeDashoffset: dashOffset }}
    />
  );
}

function ScrollBar({
  p,
  value,
  max,
  color,
  label,
}: {
  p: MotionValue<number>;
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const height = useTransform(p, (v) =>
    max > 0 ? `${Math.max((value / max) * 100 * v, 1.5)}%` : "0%"
  );
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-end gap-2">
      <motion.span
        style={{ opacity: p }}
        className="text-2xl font-extrabold tracking-tight"
      >
        <span style={{ color }}>{value}</span>
      </motion.span>
      <motion.div
        style={{
          height,
          background: `linear-gradient(180deg, ${color}, ${color}b0)`,
        }}
        className="w-full max-w-24 rounded-t-2xl"
      />
      <span className="text-[13px] font-semibold text-pine-900/60">
        {label}
      </span>
    </div>
  );
}

function LegendRow({
  p,
  name,
  value,
  total,
  color,
}: {
  p: MotionValue<number>;
  name: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const width = useTransform(p, (v) => `${pct * v}%`);
  return (
    <div>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="font-semibold text-pine-900/80">{name}</span>
        <span className="ml-auto font-bold text-pine-900">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mint-100">
        <motion.div
          style={{ width, background: color }}
          className="h-full rounded-full"
        />
      </div>
      <span className="text-[11px] text-pine-900/40">{value} estudiantes</span>
    </div>
  );
}

/* ════════════════════════ Página ════════════════════════ */

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardService.getStatistics,
  });

  const { data: recentAlerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ["recent-alerts"],
    queryFn: () => alertsService.getAlerts({ limit: 6 }),
  });

  if (loadingStats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-pine-900/50">
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          <Brain size={36} strokeWidth={1.5} className="text-leaf-600" />
        </motion.div>
        <span className="text-[14px]">Preparando tu panel...</span>
      </div>
    );
  }

  // El viaje vive en un componente hijo que se monta recién cuando los
  // datos están listos: useScroll necesita que la pista exista en el DOM
  // desde su primer render (un early return previo lo dejaría congelado).
  return (
    <DashboardJourney
      stats={stats}
      recentAlerts={recentAlerts}
      loadingAlerts={loadingAlerts}
    />
  );
}

function DashboardJourney({
  stats,
  recentAlerts,
  loadingAlerts,
}: {
  stats?: {
    total_students: number;
    risk_distribution: Record<RiskLevel, number>;
    alerts_today: number;
  };
  recentAlerts?: Alert[];
  loadingAlerts: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: trackRef });

  /* ── Movimientos de cámara por escena (3 escenas en 400vh) ──
     Cada escena TERMINA de salir antes de que la siguiente entre. */
  // Estado: sale a la izquierda alejándose (zoom-out + fade)
  const s0x = useTransform(p, [0.18, 0.32], ["0vw", "-40vw"]);
  const s0scale = useTransform(p, [0.18, 0.32], [1, 0.85]);
  const s0opacity = useTransform(p, [0.18, 0.31], [1, 0]);

  // Analítica: entra desde la derecha, sale hacia arriba
  const s1x = useTransform(p, [0.26, 0.42], ["100vw", "0vw"]);
  const s1y = useTransform(p, [0.5, 0.62], ["0vh", "-100vh"]);

  // Alertas: emerge desde abajo — escena final, sin salida
  const s2y = useTransform(p, [0.56, 0.72], ["100vh", "0vh"]);

  // Los gráficos se dibujan durante la permanencia en Analítica
  const chartP = useTransform(p, [0.42, 0.56], [0, 1]);

  // Palabras fantasma en parallax
  const ghostX = useTransform(p, [0, 1], ["20vw", "-140vw"]);

  /* Garantía dura contra "pantallas fantasma": visibility y pointerEvents
     se derivan del MISMO progreso de scroll. */
  const s0visibility = useTransform(p, (v) =>
    v > 0.33 ? "hidden" : "visible"
  );
  const s1visibility = useTransform(p, (v) =>
    v < 0.22 || v > 0.65 ? "hidden" : "visible"
  );
  const s2visibility = useTransform(p, (v) =>
    v < 0.54 ? "hidden" : "visible"
  );
  const s0pointer = useTransform(p, (v) => (v < 0.34 ? "auto" : "none"));
  const s1pointer = useTransform(p, (v) =>
    v >= 0.34 && v < 0.62 ? "auto" : "none"
  );
  const s2pointer = useTransform(p, (v) => (v >= 0.62 ? "auto" : "none"));

  // Solo para el indicador inferior (no participa en los estilos)
  const [scene, setScene] = useState(0);
  useMotionValueEvent(p, "change", (v) => {
    setScene(v < 0.33 ? 0 : v < 0.65 ? 1 : 2);
  });

  const totalStudents = stats?.total_students ?? 0;
  const alto = stats?.risk_distribution.alto ?? 0;
  const medio = stats?.risk_distribution.medio ?? 0;
  const bajo = stats?.risk_distribution.bajo ?? 0;
  const alertsToday = stats?.alerts_today ?? 0;

  const distData = (["alto", "medio", "bajo"] as RiskLevel[]).map((level) => ({
    level,
    name: RISK_LABELS[level],
    value: stats?.risk_distribution[level] ?? 0,
    color: RISK_COLORS[level],
  }));
  const totalRisk = distData.reduce((s, d) => s + d.value, 0);
  const maxBar = Math.max(...distData.map((d) => d.value), 1);

  // Fracciones acumuladas para los segmentos del donut
  let acc = 0;
  const donutSegments = distData.map((d) => {
    const frac = totalRisk > 0 ? d.value / totalRisk : 0;
    const seg = { ...d, frac, start: acc };
    acc += frac;
    return seg;
  });

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Buenos días"
      : now.getHours() < 18
        ? "Buenas tardes"
        : "Buenas noches";
  const dateStr = now.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const firstName = (user?.full_name || "").split(" ")[0];

  const statCards = [
    {
      key: "alto",
      icon: AlertTriangle,
      label: "Riesgo alto",
      sub: "Atención inmediata",
      value: alto,
      onClick: () => navigate("/estudiantes?risk=alto"),
    },
    {
      key: "medio",
      icon: Activity,
      label: "Riesgo medio",
      sub: "Vigilancia cercana",
      value: medio,
      onClick: () => navigate("/estudiantes?risk=medio"),
    },
    {
      key: "bajo",
      icon: ShieldCheck,
      label: "Riesgo bajo",
      sub: "Situación estable",
      value: bajo,
      onClick: () => navigate("/estudiantes?risk=bajo"),
    },
    {
      key: "hoy",
      icon: Bell,
      label: "Alertas hoy",
      sub: "Últimas 24 horas",
      value: alertsToday,
      onClick: () => navigate("/alertas"),
    },
  ];

  const previewAlerts = (recentAlerts ?? []).slice(0, 3);


  return (
    <div ref={trackRef} className="relative h-[400vh] bg-mint-50">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Atmósfera */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-32 -right-24 h-[34rem] w-[34rem] rounded-full opacity-60 blur-3xl animate-drift-1"
            style={{
              background:
                "radial-gradient(circle, rgba(110,231,183,0.35) 0%, transparent 65%)",
            }}
          />
          <div
            className="absolute -bottom-40 -left-24 h-[30rem] w-[30rem] rounded-full opacity-50 blur-3xl animate-drift-2"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 65%)",
            }}
          />
        </div>

        {/* Palabras fantasma */}
        <motion.div
          style={{ x: ghostX }}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-0 z-0 -translate-y-1/2 text-[20vw] leading-none font-extrabold tracking-tighter whitespace-nowrap text-leaf-600/5 select-none"
        >
          BIENESTAR · DATOS · ACCIÓN ·
        </motion.div>

        {/* ─── ESCENA 0 · ESTADO (sale con zoom-out a la izquierda) ─── */}
        <motion.div
          style={{
            x: s0x,
            scale: s0scale,
            opacity: s0opacity,
            visibility: s0visibility,
            pointerEvents: s0pointer,
          }}
          className="absolute inset-0 z-10 flex flex-col px-6 pt-24 pb-6 md:px-12"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] text-pine-900/45 capitalize">
              {dateStr}
            </span>
            <span className="flex items-center gap-2 rounded-full border border-leaf-600/15 bg-white/70 px-4 py-1.5 text-[13px] text-pine-900/70">
              <Sparkles size={13} className="text-leaf-600" />
              {greeting},{" "}
              <strong className="font-semibold text-pine-900">
                {firstName || "Profesional"}
              </strong>
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[13px] font-semibold tracking-[0.3em] text-leaf-700 uppercase"
            >
              Bienestar estudiantil en tiempo real
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="text-[clamp(4.5rem,13vw,10rem)] leading-none font-extrabold tracking-tighter text-pine-900">
                <AnimatedNumber value={totalStudents} duration={1.8} />
              </div>
              <p className="mt-2 text-lg text-pine-900/55 md:text-xl">
                estudiantes{" "}
                <span className="font-display text-leaf-600 italic">
                  monitoreados
                </span>{" "}
                hoy
              </p>
            </motion.div>

            {/* Latido del sistema: extracción en vivo, entrenamiento
                automático y sello de datos reales */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 flex w-full justify-center"
            >
              <LiveSystemStrip />
            </motion.div>

            <div className="mt-10 grid w-full max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
              {statCards.map(
                ({ key, icon: Icon, label, sub, value, onClick }, i) => {
                  const s = riskCardStyles[key];
                  return (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                      onClick={onClick}
                      className={`group relative rounded-3xl border border-pine-900/6 bg-white/80 p-5 text-left shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${s.ring}`}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${s.iconBg}`}
                        >
                          <Icon size={19} strokeWidth={1.9} />
                        </div>
                        <ArrowUpRight
                          size={16}
                          className="text-pine-900/25 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-pine-900/60"
                        />
                      </div>
                      <div
                        className={`mt-4 text-4xl font-extrabold tracking-tight ${s.num}`}
                      >
                        <AnimatedNumber value={value} />
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-pine-900/80">
                        {label}
                      </div>
                      <div className="text-[11.5px] text-pine-900/40">{sub}</div>
                    </motion.button>
                  );
                }
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="mx-auto flex items-center gap-1 text-[12px] text-pine-900/35"
          >
            <span>Desplázate para recorrer tu panel</span>
            <motion.span
              animate={{ x: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            >
              <ChevronRight size={16} />
            </motion.span>
          </motion.div>
        </motion.div>

        {/* ─── ESCENA 1 · ANALÍTICA (entra por la derecha, gráficos scroll-driven) ─── */}
        <motion.div
          style={{
            x: s1x,
            y: s1y,
            visibility: s1visibility,
            pointerEvents: s1pointer,
          }}
          className="absolute inset-0 z-20 flex flex-col justify-center px-6 pt-20 pb-8 md:px-12"
        >
          <div className="mx-auto w-full max-w-[88rem]">
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.22em] text-leaf-700 uppercase">
              <TrendingUp size={14} />
              Analítica
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-pine-900 md:text-5xl">
              Distribución del{" "}
              <span className="font-display font-normal text-leaf-600 italic">
                riesgo emocional
              </span>
            </h2>
            <p className="mt-1 text-[13px] text-pine-900/45">
              Sigue desplazándote: los gráficos se dibujan contigo.
            </p>

            <div className="mt-8 grid gap-6 lg:grid-cols-5">
              {/* Donut que se traza con el scroll */}
              <div className="rounded-3xl border border-pine-900/6 bg-white p-7 shadow-sm lg:col-span-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-bold text-pine-900">
                    Por nivel
                  </span>
                  <span className="text-[12px] text-pine-900/45">
                    {totalRisk} estudiantes evaluados
                  </span>
                </div>

                {totalRisk === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 text-pine-900/35">
                    <Brain size={32} strokeWidth={1.5} />
                    <p className="text-[13px]">Sin datos disponibles</p>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
                    <div className="relative h-[230px] w-[230px] shrink-0">
                      <svg viewBox="0 0 200 200" className="h-full w-full">
                        <circle
                          cx="100"
                          cy="100"
                          r={DONUT_R}
                          fill="none"
                          stroke="#e8f1eb"
                          strokeWidth="30"
                        />
                        {donutSegments.map((seg) => (
                          <DonutSegment
                            key={seg.level}
                            p={chartP}
                            start={seg.start}
                            frac={seg.frac}
                            color={seg.color}
                          />
                        ))}
                      </svg>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-pine-900">
                          {totalRisk}
                        </span>
                        <span className="text-[11px] text-pine-900/45">
                          Total
                        </span>
                      </div>
                    </div>

                    <div className="flex w-full flex-1 flex-col gap-4">
                      {distData.map((d) => (
                        <LegendRow
                          key={d.level}
                          p={chartP}
                          name={d.name}
                          value={d.value}
                          total={totalRisk}
                          color={d.color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Barras que suben con el scroll */}
              <div className="rounded-3xl border border-pine-900/6 bg-white p-7 shadow-sm lg:col-span-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-bold text-pine-900">
                    Comparativo
                  </span>
                  <span className="text-[12px] text-pine-900/45">
                    Estudiantes por nivel
                  </span>
                </div>

                {totalRisk === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 text-pine-900/35">
                    <Activity size={32} strokeWidth={1.5} />
                    <p className="text-[13px]">Sin datos disponibles</p>
                  </div>
                ) : (
                  <div className="mt-4 flex h-[280px] items-end gap-8 border-b border-pine-900/8 px-4 md:px-12">
                    {distData.map((d) => (
                      <ScrollBar
                        key={d.level}
                        p={chartP}
                        value={d.value}
                        max={maxBar}
                        color={d.color}
                        label={d.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── ESCENA 2 · ALERTAS (emerge desde abajo — escena final) ─── */}
        <motion.div
          style={{
            y: s2y,
            visibility: s2visibility,
            pointerEvents: s2pointer,
          }}
          className="absolute inset-0 z-30 flex flex-col justify-center px-6 pt-20 pb-8 md:px-12"
        >
          <div className="mx-auto w-full max-w-[88rem]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.22em] text-leaf-700 uppercase">
                  <AlertTriangle size={14} />
                  Atención
                </div>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-pine-900 md:text-5xl">
                  Alertas{" "}
                  <span className="font-display font-normal text-leaf-600 italic">
                    recientes
                  </span>
                </h2>
              </div>
              <button
                onClick={() => navigate("/alertas")}
                className="group flex items-center gap-2 rounded-full bg-pine-900 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-pine-800"
              >
                Ver todas las alertas
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>

            {loadingAlerts ? (
              <div className="mt-8 flex h-44 items-center justify-center rounded-3xl border border-pine-900/6 bg-white text-[13px] text-pine-900/40">
                Cargando alertas...
              </div>
            ) : !previewAlerts.length ? (
              <div className="mt-8 flex flex-col items-center justify-center gap-2 rounded-3xl border border-pine-900/6 bg-white py-16 text-pine-900/40">
                <ShieldCheck
                  size={36}
                  strokeWidth={1.5}
                  className="text-leaf-600"
                />
                <p className="text-[15px] font-semibold text-pine-900/70">
                  No hay alertas recientes
                </p>
                <span className="text-[12.5px]">
                  El sistema está funcionando correctamente
                </span>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {previewAlerts.map((alert, i) => (
                  <motion.button
                    key={alert.id}
                    initial={{ opacity: 0, y: 80 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{
                      duration: 0.7,
                      delay: i * 0.15,
                      ease: [0.21, 0.65, 0.32, 0.99],
                    }}
                    onClick={() =>
                      navigate(
                        `/alertas?student=${encodeURIComponent(alert.student_id)}`
                      )
                    }
                    className={`group h-full rounded-3xl border bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                      alert.risk_level === "alto"
                        ? "border-alto-200/70 hover:shadow-alto-500/10"
                        : alert.risk_level === "medio"
                          ? "border-medio-200/70 hover:shadow-medio-500/10"
                          : "border-bajo-200/70 hover:shadow-bajo-500/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                          alert.risk_level === "alto"
                            ? "bg-alto-50 text-alto-700"
                            : alert.risk_level === "medio"
                              ? "bg-medio-50 text-medio-700"
                              : "bg-bajo-50 text-bajo-700"
                        }`}
                      >
                        {alert.risk_level}
                      </span>
                      <span className="text-[12px] text-pine-900/40">
                        {new Date(alert.created_at).toLocaleDateString("es-PE", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="mt-4 line-clamp-3 text-[13.5px] leading-relaxed text-pine-900/70 italic">
                      “{alert.text_fragment.slice(0, 110)}
                      {alert.text_fragment.length > 110 ? "…" : ""}”
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mint-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(alert.risk_score ?? 0) * 100}%`,
                            background: RISK_COLORS[alert.risk_level],
                          }}
                        />
                      </div>
                      <span className="text-[12px] font-bold text-pine-900/60">
                        {((alert.risk_score ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>


{/* Indicador de escenas */}
        <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3">
          {SCENES.map((name, i) => (
            <div key={name} className="flex items-center gap-1.5">
              <span
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  scene === i ? "w-8 bg-leaf-500" : "w-1.5 bg-pine-900/20"
                }`}
              />
              {scene === i && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[11px] font-semibold text-pine-900/45"
                >
                  {name}
                </motion.span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
