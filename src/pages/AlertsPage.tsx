import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { alertsService } from "../services/alerts.service";
import { Reveal } from "../components/ui/reveal";
import { CaseDeck } from "../components/ui/case-deck";
import {
  X,
  Send,
  Bell,
  CheckCircle2,
  Eye,
  Activity,
  Clock,
  FileText,
  User,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { Alert, AlertStatus, RiskLevel } from "../types";

/**
 * Centro de alertas v3.
 *
 * Porqués:
 * - Doble fila de chips (riesgo + estado) con contadores en vivo:
 *   el psicólogo ve cuánto trabajo pendiente hay ANTES de filtrar.
 * - Las tarjetas llevan el color de riesgo en el borde izquierdo:
 *   misma convención visual que el resto del sistema.
 * - El modal de detalle conserva el flujo completo de trabajo clínico:
 *   leer texto → cambiar estado → dejar nota de seguimiento.
 */

const STATUS_OPTIONS: { value: AlertStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "revisada", label: "Revisada" },
  { value: "en_seguimiento", label: "En seguimiento" },
  { value: "resuelta", label: "Resuelta" },
];

const RISK_HEX: Record<string, string> = {
  alto: "#ef4444",
  medio: "#f59e0b",
  bajo: "#10b981",
};

const statusStyles: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-600",
  revisada: "bg-blue-50 text-blue-700",
  en_seguimiento: "bg-medio-50 text-medio-700",
  resuelta: "bg-bajo-50 text-bajo-700",
};

const riskBadge: Record<string, string> = {
  alto: "bg-alto-50 text-alto-700",
  medio: "bg-medio-50 text-medio-700",
  bajo: "bg-bajo-50 text-bajo-700",
};

const formatStatus = (s: string) =>
  s === "en_seguimiento"
    ? "En seguimiento"
    : s.charAt(0).toUpperCase() + s.slice(1);

const formatSource = (s: string) =>
  s === "formulario_validacion"
    ? "Formulario de validación"
    : s === "mensaje_directo"
      ? "Mensaje directo"
      : s.charAt(0).toUpperCase() + s.slice(1);

/** Sello para alertas que provienen de datos reales del estudio */
function RealDataBadge() {
  return (
    <span className="rounded-md bg-leaf-600/10 px-2 py-0.5 text-[10.5px] font-extrabold tracking-wide text-leaf-700 uppercase ring-1 ring-leaf-600/25">
      Datos reales
    </span>
  );
}

function AlertCaseCard({
  alert,
  onOpen,
}: {
  alert: Alert;
  onOpen: (a: Alert) => void;
}) {
  const initials = (alert.student_name || alert.student_id || "??")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const color = RISK_HEX[alert.risk_level];

  return (
    <div
      className="overflow-hidden rounded-3xl border border-pine-900/8 bg-white shadow-xl"
      style={{
        boxShadow: `inset 0 5px 0 0 ${color}, 0 24px 60px -20px ${color}30`,
      }}
    >
      <div className="px-8 pt-8 pb-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-extrabold tracking-tight text-pine-900">
                {alert.student_name || "Estudiante"}
              </div>
              <div className="truncate text-[12px] text-pine-900/40">
                {alert.student_id}
              </div>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase ${riskBadge[alert.risk_level]}`}
          >
            Riesgo {alert.risk_level}
          </span>
        </div>

        {/* El texto detectado es el corazón del caso: grande y legible */}
        <p
          className="mt-6 rounded-2xl border-l-4 bg-mint-50 px-6 py-5 text-[15px] leading-relaxed text-pine-900/80 italic"
          style={{ borderColor: color }}
        >
          “{alert.text_fragment.slice(0, 280)}
          {alert.text_fragment.length > 280 ? "…" : ""}”
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${statusStyles[alert.status]}`}
          >
            {formatStatus(alert.status)}
          </span>
          <span className="flex items-center gap-1.5 text-[12.5px] text-pine-900/45">
            <Clock size={13} />
            {new Date(alert.created_at).toLocaleDateString("es-PE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="text-[12.5px] text-pine-900/45">
            Fuente: {formatSource(alert.source)}
          </span>
          {alert.source === "formulario_validacion" && <RealDataBadge />}
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-mint-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(alert.risk_score ?? 0) * 100}%`,
                background: color,
              }}
            />
          </div>
          <span className="text-[14px] font-extrabold text-pine-900/70">
            {((alert.risk_score ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <button
        onClick={() => onOpen(alert)}
        className="group flex w-full items-center justify-center gap-2 bg-pine-900 py-4 text-[14px] font-semibold text-white transition-colors hover:bg-pine-800"
      >
        <Eye size={15} />
        Ver detalle y atender
        <ArrowRight
          size={15}
          className="transition-transform group-hover:translate-x-1"
        />
      </button>
    </div>
  );
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentFilter = searchParams.get("student") || "";

  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Alert | null>(null);
  const [newNote, setNewNote] = useState("");
  // Panel de acción: "note" = nota interna, "message" = mensaje al alumno
  const [actionTab, setActionTab] = useState<"note" | "message">("note");
  const [msgToStudent, setMsgToStudent] = useState("");
  const [msgFeedback, setMsgFeedback] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["alerts", riskFilter, statusFilter, studentFilter],
    queryFn: () =>
      alertsService.getAlerts({
        ...(riskFilter ? { risk_level: riskFilter as RiskLevel } : {}),
        ...(statusFilter ? { status: statusFilter as AlertStatus } : {}),
        ...(studentFilter ? { student_id: studentFilter } : {}),
      }),
  });

  // Si venimos con ?student= y hay alertas, abrir la primera automáticamente
  // (solo una vez por estudiante, para que no reaparezca al cerrarla)
  const autoOpenedFor = useRef<string>("");
  useEffect(() => {
    if (
      studentFilter &&
      alerts.length > 0 &&
      autoOpenedFor.current !== studentFilter
    ) {
      autoOpenedFor.current = studentFilter;
      alertsService.getAlertDetail(alerts[0].id).then(setSelected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentFilter, alerts]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AlertStatus }) =>
      alertsService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      if (selected) {
        alertsService.getAlertDetail(selected.id).then(setSelected);
      }
    },
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      alertsService.addNote(id, content),
    onSuccess: () => {
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      if (selected) {
        alertsService.getAlertDetail(selected.id).then(setSelected);
      }
    },
  });

  const messageMutation = useMutation({
    mutationFn: (args: {
      id: string;
      content?: string;
      template?: "meeting";
    }) =>
      alertsService.sendMessage(args.id, {
        content: args.content,
        template: args.template,
      }),
    onSuccess: () => {
      setMsgToStudent("");
      setMsgFeedback({
        kind: "ok",
        text: "Mensaje enviado al alumno via Moodle.",
      });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      if (selected) {
        alertsService.getAlertDetail(selected.id).then(setSelected);
      }
      setTimeout(() => setMsgFeedback(null), 4000);
    },
    onError: (err: unknown) => {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      setMsgFeedback({
        kind: "err",
        text: detail || "No se pudo enviar el mensaje.",
      });
      setTimeout(() => setMsgFeedback(null), 5000);
    },
  });

  function openDetail(alert: Alert) {
    alertsService.getAlertDetail(alert.id).then(setSelected);
  }

  function clearStudentFilter() {
    setSearchParams({});
  }

  const countByStatus = (status: string) =>
    status ? alerts.filter((a) => a.status === status).length : alerts.length;
  const countByRisk = (risk: string) =>
    risk ? alerts.filter((a) => a.risk_level === risk).length : alerts.length;

  const studentName =
    studentFilter && alerts.length > 0 ? alerts[0].student_name : "";

  const selectedColor = selected ? RISK_HEX[selected.risk_level] : "#10b981";

  return (
    <div className="min-h-screen bg-mint-50 px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-7xl pt-28">
        {/* Encabezado */}
        <Reveal>
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.22em] text-leaf-700 uppercase">
            <Bell size={14} />
            Atención requerida
          </div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-pine-900 md:text-5xl">
            Centro de{" "}
            <span className="font-display font-normal text-leaf-600 italic">
              alertas
            </span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px] text-pine-900/50">
            {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} con los
            filtros actuales
            {studentFilter && (
              <span className="flex items-center gap-1.5 rounded-full bg-pine-900 px-3 py-1 text-[12px] font-semibold text-white">
                <User size={12} />
                {studentName || studentFilter}
                <button
                  onClick={clearStudentFilter}
                  title="Quitar filtro"
                  className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </p>
        </Reveal>

        {/* Filtros como chips con contadores */}
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-col gap-3">
            {/* Por riesgo */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-[11px] font-semibold tracking-wide text-pine-900/40 uppercase">
                Riesgo
              </span>
              {["", "alto", "medio", "bajo"].map((lvl) => {
                const active = riskFilter === lvl;
                return (
                  <button
                    key={lvl || "todos"}
                    onClick={() => setRiskFilter(lvl)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${
                      active
                        ? "border-pine-900 bg-pine-900 text-white"
                        : "border-pine-900/10 bg-white text-pine-900/60 hover:border-pine-900/25"
                    }`}
                  >
                    {lvl && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: RISK_HEX[lvl] }}
                      />
                    )}
                    {lvl ? lvl.charAt(0).toUpperCase() + lvl.slice(1) : "Todos"}
                    <span
                      className={`rounded-full px-1.5 text-[10.5px] font-bold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-mint-100 text-pine-900/50"
                      }`}
                    >
                      {countByRisk(lvl)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Por estado */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-[11px] font-semibold tracking-wide text-pine-900/40 uppercase">
                Estado
              </span>
              {[
                { value: "", label: "Todos" },
                ...STATUS_OPTIONS,
              ].map(({ value, label }) => {
                const active = statusFilter === value;
                return (
                  <button
                    key={value || "todos"}
                    onClick={() => setStatusFilter(value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${
                      active
                        ? "border-pine-900 bg-pine-900 text-white"
                        : "border-pine-900/10 bg-white text-pine-900/60 hover:border-pine-900/25"
                    }`}
                  >
                    {label}
                    <span
                      className={`rounded-full px-1.5 text-[10.5px] font-bold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-mint-100 text-pine-900/50"
                      }`}
                    >
                      {countByStatus(value)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Cuadrícula */}
        {isLoading ? (
          <div className="mt-14 flex flex-col items-center justify-center gap-3 rounded-3xl border border-pine-900/6 bg-white py-20 text-pine-900/40">
            <Loader2 size={26} className="animate-spin text-leaf-600" />
            <p className="text-[13.5px]">Cargando alertas...</p>
          </div>
        ) : !alerts.length ? (
          <div className="mt-14 flex flex-col items-center justify-center gap-2 rounded-3xl border border-pine-900/6 bg-white py-20 text-pine-900/40">
            <CheckCircle2 size={32} strokeWidth={1.5} className="text-leaf-600" />
            <p className="text-[15px] font-semibold text-pine-900/70">
              No hay alertas con estos filtros
            </p>
            <span className="text-[12.5px]">Prueba ajustando los criterios</span>
          </div>
        ) : (
          <div className="mt-12">
            <CaseDeck
              items={alerts}
              keyOf={(a) => a.id}
              label="alerta"
              renderCard={(a) => (
                <AlertCaseCard alert={a} onOpen={openDetail} />
              )}
            />
          </div>
        )}
      </div>

      {/* ════════════════ MODAL DETALLE ════════════════ */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-pine-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            >
              {/* Cabecera con el color del riesgo */}
              <div
                className="relative px-7 pt-6 pb-5 text-white"
                style={{
                  background: `linear-gradient(120deg, #071d14 0%, ${selectedColor}55 160%)`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${riskBadge[selected.risk_level]}`}
                  >
                    Riesgo {selected.risk_level}
                  </span>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                  {selected.student_name || "Estudiante"}
                </h2>
                <span className="text-[12.5px] text-white/55">
                  ID: {selected.student_id}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-7 py-6">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      lbl: "Score",
                      val: `${(selected.risk_score * 100).toFixed(0)}%`,
                    },
                    { lbl: "Fuente", val: formatSource(selected.source) },
                    { lbl: "Estado", val: formatStatus(selected.status) },
                    {
                      lbl: "Fecha",
                      val: new Date(selected.created_at).toLocaleDateString(
                        "es-PE"
                      ),
                    },
                  ].map(({ lbl, val }) => (
                    <div
                      key={lbl}
                      className="rounded-2xl bg-mint-50 px-4 py-3"
                    >
                      <div className="text-[10.5px] font-semibold tracking-wide text-pine-900/40 uppercase">
                        {lbl}
                      </div>
                      <div className="mt-0.5 truncate text-[13.5px] font-bold text-pine-900">
                        {val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Texto detectado */}
                <div className="mt-6">
                  <h3 className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-pine-900/50 uppercase">
                    <Eye size={13} />
                    Texto detectado
                  </h3>
                  <p
                    className="mt-2 rounded-2xl border-l-4 bg-mint-50 px-5 py-4 text-[14px] leading-relaxed text-pine-900/80 italic"
                    style={{ borderColor: selectedColor }}
                  >
                    “{selected.text_fragment}”
                  </p>
                </div>

                {/* Cambiar estado */}
                <div className="mt-6">
                  <h3 className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-pine-900/50 uppercase">
                    <Activity size={13} />
                    Cambiar estado
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => {
                      const isCurrent = selected.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          disabled={isCurrent || statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              id: selected.id,
                              status: opt.value,
                            })
                          }
                          className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all ${
                            isCurrent
                              ? "bg-pine-900 text-white"
                              : "border border-pine-900/12 bg-white text-pine-900/60 hover:border-pine-900/30 hover:text-pine-900 disabled:opacity-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notas + Mensaje al alumno (2 pestañas) */}
                <div className="mt-6">
                  <h3 className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-pine-900/50 uppercase">
                    <FileText size={13} />
                    Notas ({selected.notes?.length ?? 0})
                  </h3>
                  {selected.notes?.length ? (
                    <ul className="mt-2 flex flex-col gap-2">
                      {selected.notes.map((note, i) => (
                        <li
                          key={i}
                          className="rounded-2xl bg-mint-50 px-4 py-3"
                        >
                          <p className="text-[13.5px] text-pine-900/80">
                            {note.content}
                          </p>
                          <span className="mt-1 block text-[11px] text-pine-900/40">
                            {note.author} ·{" "}
                            {new Date(note.date).toLocaleDateString("es-PE")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[13px] text-pine-900/35">
                      Sin notas todavía
                    </p>
                  )}

                  {/* Tabs: Nota interna | Mensaje al alumno */}
                  <div className="mt-4 flex gap-1 rounded-full bg-pine-900/5 p-1">
                    <button
                      onClick={() => setActionTab("note")}
                      className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold transition-all ${
                        actionTab === "note"
                          ? "bg-white text-pine-900 shadow-sm"
                          : "text-pine-900/50 hover:text-pine-900/70"
                      }`}
                    >
                      Nota interna
                    </button>
                    <button
                      onClick={() => setActionTab("message")}
                      className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold transition-all ${
                        actionTab === "message"
                          ? "bg-white text-pine-900 shadow-sm"
                          : "text-pine-900/50 hover:text-pine-900/70"
                      }`}
                    >
                      Mensaje al alumno
                    </button>
                  </div>

                  {/* Panel: Nota interna */}
                  {actionTab === "note" && (
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newNote.trim()) {
                          noteMutation.mutate({
                            id: selected.id,
                            content: newNote.trim(),
                          });
                        }
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Escribir una nota de seguimiento..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 rounded-full border border-pine-900/10 bg-white px-4 py-2.5 text-[13.5px] text-pine-900 placeholder:text-pine-900/30 focus:border-leaf-500/60 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newNote.trim() || noteMutation.isPending}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-600 text-white shadow-md transition-all hover:brightness-110 disabled:opacity-40"
                        title="Guardar nota"
                      >
                        <Send size={15} />
                      </button>
                    </form>
                  )}

                  {/* Panel: Mensaje al alumno */}
                  {actionTab === "message" && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11.5px] text-pine-900/50">
                        El mensaje se envía como admin al alumno via Moodle
                        (mensajería directa). Queda registrado también como
                        nota en esta alerta.
                      </p>

                      {/* Botón rápido: citación a reunión */}
                      <button
                        onClick={() =>
                          messageMutation.mutate({
                            id: selected.id,
                            template: "meeting",
                          })
                        }
                        disabled={messageMutation.isPending}
                        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-leaf-500/30 bg-leaf-500/8 px-4 py-3 text-[13px] font-semibold text-leaf-800 transition-all hover:bg-leaf-500/15 disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          <Clock size={14} />
                          Citar a reunión inmediata
                        </span>
                        <ArrowRight size={14} />
                      </button>

                      {/* Formulario libre */}
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (msgToStudent.trim()) {
                            messageMutation.mutate({
                              id: selected.id,
                              content: msgToStudent.trim(),
                            });
                          }
                        }}
                      >
                        <textarea
                          placeholder="Escribir mensaje personalizado al alumno..."
                          value={msgToStudent}
                          onChange={(e) => setMsgToStudent(e.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-2xl border border-pine-900/10 bg-white px-4 py-2.5 text-[13.5px] text-pine-900 placeholder:text-pine-900/30 focus:border-leaf-500/60 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={
                            !msgToStudent.trim() || messageMutation.isPending
                          }
                          className="flex items-center justify-center gap-1.5 rounded-full bg-pine-900 py-2 text-[13px] font-semibold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-40"
                        >
                          {messageMutation.isPending ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send size={13} /> Enviar mensaje
                            </>
                          )}
                        </button>
                      </form>

                      {/* Feedback */}
                      {msgFeedback && (
                        <div
                          className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${
                            msgFeedback.kind === "ok"
                              ? "bg-leaf-500/12 text-leaf-800"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {msgFeedback.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
