import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { TheaterProvider, useTheater } from "../contexts/TheaterContext";
import { useDetectionEvents } from "../hooks/useDetectionEvents";
import {
  LiveAlertToasts,
  useAlertToasts,
} from "./ui/live-alert-toasts";
import { LayoutDashboard, Users, Bell, LogOut, Brain, Radar } from "lucide-react";

/**
 * Layout v3 — adiós sidebar estático.
 *
 * Porqués del rediseño:
 * - Navbar flotante superior (estilo "tubelight" de 21st.dev): libera todo
 *   el ancho de pantalla para los datos. El psicólogo trabaja con tarjetas
 *   y gráficos; cada pixel horizontal cuenta.
 * - Barra de progreso de scroll arriba: las páginas son narrativas largas;
 *   la barra funciona como línea de tiempo de un video que se reproduce
 *   al desplazarse.
 * - Indicador "En vivo" global: la conexión SSE vive aquí (una sola para
 *   toda la app). El psicólogo siempre sabe si el sistema está escuchando
 *   a Moodle, esté en la página que esté.
 * - Toasts SOLO de detecciones reales en vivo (SSE): cuando el backend
 *   detecta un mensaje nuevo en Moodle (usuario nuevo, mensaje nuevo)
 *   aparece la notificación. Ya no se muestran alertas viejas de la BD.
 */

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Panel" },
  { to: "/estudiantes", icon: Users, label: "Estudiantes" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
];

export default function Layout() {
  return (
    <TheaterProvider>
      <LayoutInner />
    </TheaterProvider>
  );
}

function LayoutInner() {
  const { logout, user } = useAuth();
  const { pathname } = useLocation();
  // Toasts SÓLO en vivo: cada "new_alert" que emite el SSE del backend
  // (detección real de contenido nuevo de Moodle) entra a la cola.
  const { toasts, pushAlert, dismiss } = useAlertToasts();

  // Panel cinematográfico "AnalysisTheater": el context maneja la cola
  // internamente (nunca se cierra solo, cada dismiss carga el siguiente).
  const { enqueue: enqueueTheater } = useTheater();

  const isDetecting = useDetectionEvents((e) => {
    pushAlert({ ...e, kind: "live" });
    // Encolar solo si viene con texto (necesario para el panel)
    if (e.text && e.text.length > 0) {
      enqueueTheater(e);
    }
  });

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 28 });

  const initials = (user?.full_name || "U")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-mint-50">
      {/* Línea de tiempo del scroll */}
      <motion.div
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-leaf-600 via-leaf-400 to-leaf-300"
        style={{ scaleX: progress }}
      />

      {/* Navbar flotante */}
      <header className="fixed inset-x-0 top-3 z-50 flex justify-center px-3">
        <div className="glass-dark flex w-full max-w-5xl items-center justify-between gap-2 rounded-full py-2 pr-2 pl-4 shadow-xl shadow-pine-950/20">
          {/* Marca */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf-500/15 text-leaf-300">
              <Brain size={17} strokeWidth={1.8} />
            </div>
            <div className="hidden flex-col leading-none sm:flex">
              <span className="text-[14px] font-bold tracking-tight text-white">
                MindLMS
              </span>
              <span className="text-[10px] text-leaf-200/60">
                Panel psicológico
              </span>
            </div>
          </Link>

          {/* Navegación tubelight */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    active ? "text-white" : "text-white/55 hover:text-white/85"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="tubelight"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-leaf-500/15"
                    >
                      {/* El "tubo de luz" encendido sobre la pestaña activa */}
                      <span className="absolute -top-2.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-leaf-400">
                        <span className="absolute -inset-x-2 -top-2 h-6 rounded-full bg-leaf-400/30 blur-md" />
                      </span>
                    </motion.span>
                  )}
                  <Icon size={16} className="relative z-10" />
                  <span className="relative z-10 hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Estado + usuario */}
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold sm:flex ${
                isDetecting
                  ? "bg-medio-500/15 text-medio-200"
                  : "bg-leaf-500/12 text-leaf-200"
              }`}
              title={
                isDetecting
                  ? "El motor está analizando textos de Moodle ahora mismo"
                  : "Conectado a Moodle, escuchando nuevos textos"
              }
            >
              {isDetecting ? (
                <>
                  <Radar size={12} className="animate-spin" />
                  Analizando
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-leaf-400 animate-pulse-soft" />
                  En vivo
                </>
              )}
            </span>

            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-leaf-500 to-leaf-700 text-[12px] font-bold text-white ring-2 ring-white/10"
              title={`${user?.full_name || "Profesional"} — ${user?.role || "psicólogo"}`}
            >
              {initials}
            </div>

            <button
              onClick={logout}
              title="Cerrar sesión"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Notificaciones de detección en tiempo real */}
      <LiveAlertToasts toasts={toasts} onDismiss={dismiss} />

      {/* NOTA: el AnalysisTheater se renderiza dentro de LiveSystemStrip
          (dashboard), justo debajo de la barra verde de progreso.
          Se comparte por TheaterContext. */}

      {/* Contenido a pantalla completa: cada página maneja sus secciones */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
