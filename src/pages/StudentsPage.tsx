import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dashboardService } from "../services/dashboard.service";
import { Reveal } from "../components/ui/reveal";
import { CaseDeck } from "../components/ui/case-deck";
import { Search, Loader2, Users, Bell, ArrowRight } from "lucide-react";
import type { StudentSummary } from "../types";

/**
 * Estudiantes v4 — revisión caso por caso.
 *
 * Porqués:
 * - Antes: cuadrícula con cientos de carnets → parálisis por exceso.
 *   Ahora: un mazo (CaseDeck) muestra UN estudiante grande a la vez,
 *   con las siguientes cartas asomando detrás. El backend ya ordena
 *   por severidad: el psicólogo revisa la cola en el orden correcto.
 * - Los chips con contadores siguen siendo el mapa general: dicen
 *   cuántos hay por nivel sin tener que verlos todos.
 */

const RISK_TEXT: Record<string, string> = {
  alto: "Riesgo alto",
  medio: "Riesgo medio",
  bajo: "Riesgo bajo",
};

const RISK_HEX: Record<string, string> = {
  alto: "#ef4444",
  medio: "#f59e0b",
  bajo: "#10b981",
};

const levelChip: Record<string, { active: string; dot: string }> = {
  "": {
    active: "bg-pine-900 text-white border-pine-900",
    dot: "bg-pine-900/30",
  },
  alto: {
    active: "bg-alto-700 text-white border-alto-700",
    dot: "bg-alto-500",
  },
  medio: {
    active: "bg-medio-700 text-white border-medio-700",
    dot: "bg-medio-500",
  },
  bajo: {
    active: "bg-bajo-700 text-white border-bajo-700",
    dot: "bg-bajo-500",
  },
};

function StudentCaseCard({
  student,
  onOpen,
}: {
  student: StudentSummary;
  onOpen: (id: string) => void;
}) {
  const level = student.current_risk_level || student.risk_level || "bajo";
  const score = student.avg_risk_score ?? student.latest_score ?? 0;
  const maxScore = student.max_risk_score ?? score;
  const color = RISK_HEX[level];
  const initials = (student.student_name || "??")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="overflow-hidden rounded-3xl border border-pine-900/8 bg-white shadow-xl"
      style={{ boxShadow: `inset 0 5px 0 0 ${color}, 0 24px 60px -20px ${color}30` }}
    >
      <div className="flex flex-col items-center px-8 pt-9 pb-7 text-center">
        <span
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase ${
            level === "alto"
              ? "bg-alto-50 text-alto-700"
              : level === "medio"
                ? "bg-medio-50 text-medio-700"
                : "bg-bajo-50 text-bajo-700"
          }`}
        >
          {RISK_TEXT[level] || level}
        </span>

        <div
          className="mt-6 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          }}
        >
          {initials}
        </div>

        <h3 className="mt-4 text-xl font-extrabold tracking-tight text-pine-900">
          {student.student_name || "Sin nombre"}
        </h3>
        <span className="text-[12.5px] text-pine-900/40">
          ID: {student.student_id}
        </span>

        {/* Anillo de score grande: lectura clínica instantánea */}
        <div
          className="mt-7 flex h-32 w-32 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${score * 360}deg, #e8f1eb 0deg)`,
          }}
        >
          <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-white">
            <span className="text-2xl font-extrabold text-pine-900">
              {(score * 100).toFixed(0)}%
            </span>
            <span className="text-[11px] text-pine-900/40">
              Score promedio
            </span>
          </div>
        </div>

        <div className="mt-7 flex w-full items-center justify-center gap-10">
          <div className="text-center">
            <div className="text-xl font-extrabold text-pine-900">
              {(maxScore * 100).toFixed(0)}%
            </div>
            <div className="text-[11.5px] text-pine-900/40">Score máximo</div>
          </div>
          <div className="h-10 w-px bg-pine-900/8" />
          <div className="text-center">
            <div className="text-xl font-extrabold text-pine-900">
              {student.total_alerts}
            </div>
            <div className="text-[11.5px] text-pine-900/40">Alertas</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onOpen(student.student_id)}
        className="group flex w-full items-center justify-center gap-2 bg-pine-900 py-4 text-[14px] font-semibold text-white transition-colors hover:bg-pine-800"
      >
        <Bell size={15} />
        Atender este caso
        <ArrowRight
          size={15}
          className="transition-transform group-hover:translate-x-1"
        />
      </button>
    </div>
  );
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRisk = searchParams.get("risk") || "";
  const [riskFilter, setRiskFilter] = useState(initialRisk);
  const [search, setSearch] = useState("");

  const { data: students = [], isLoading } = useQuery<StudentSummary[]>({
    queryKey: ["students", riskFilter],
    queryFn: () =>
      dashboardService.getStudents({
        ...(riskFilter ? { risk_level: riskFilter } : {}),
        limit: 200, // tope del backend: que el filtro muestre a todos
      }),
  });

  const filtered = search
    ? students.filter(
        (s) =>
          s.student_id.toLowerCase().includes(search.toLowerCase()) ||
          (s.student_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const countByLevel = (level: string) =>
    level
      ? students.filter(
          (s) => (s.current_risk_level || s.risk_level) === level
        ).length
      : students.length;

  const handleRiskChange = (value: string) => {
    setRiskFilter(value);
    if (value) setSearchParams({ risk: value });
    else setSearchParams({});
  };

  const openStudentAlerts = (studentId: string) => {
    navigate(`/alertas?student=${encodeURIComponent(studentId)}`);
  };

  const CHIP_LEVELS = ["", "alto", "medio", "bajo"];

  return (
    <div className="min-h-screen bg-mint-50 px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-7xl pt-28">
        {/* Encabezado */}
        <Reveal>
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.22em] text-leaf-700 uppercase">
            <Users size={14} />
            Monitoreo
          </div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-pine-900 md:text-5xl">
            Estudiantes{" "}
            <span className="font-display font-normal text-leaf-600 italic">
              activos
            </span>
          </h1>
          <p className="mt-2 text-[14px] text-pine-900/50">
            Revisa la cola caso por caso — ordenada del riesgo más alto al
            más bajo. Usa las flechas, el teclado (← →) o arrastra la carta.
          </p>
        </Reveal>

        {/* Filtros: chips segmentados + buscador */}
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {CHIP_LEVELS.map((lvl) => {
                const active = riskFilter === lvl;
                const chip = levelChip[lvl];
                return (
                  <button
                    key={lvl || "todos"}
                    onClick={() => handleRiskChange(lvl)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${
                      active
                        ? chip.active
                        : "border-pine-900/10 bg-white text-pine-900/60 hover:border-pine-900/25 hover:text-pine-900"
                    }`}
                  >
                    {lvl && (
                      <span
                        className={`h-2 w-2 rounded-full ${active ? "bg-white/80" : chip.dot}`}
                      />
                    )}
                    {lvl ? RISK_TEXT[lvl] : "Todos"}
                    <span
                      className={`rounded-full px-1.5 text-[11px] font-bold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-mint-100 text-pine-900/50"
                      }`}
                    >
                      {countByLevel(lvl)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative ml-auto w-full sm:w-72">
              <Search
                size={15}
                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-pine-900/35"
              />
              <input
                type="text"
                placeholder="Buscar por nombre o ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-pine-900/10 bg-white py-2.5 pr-4 pl-10 text-[13.5px] text-pine-900 placeholder:text-pine-900/30 focus:border-leaf-500/60 focus:outline-none"
              />
            </div>
          </div>
        </Reveal>

        {/* Mazo de casos */}
        {isLoading ? (
          <div className="mt-14 flex flex-col items-center justify-center gap-3 rounded-3xl border border-pine-900/6 bg-white py-20 text-pine-900/40">
            <Loader2 size={26} className="animate-spin text-leaf-600" />
            <p className="text-[13.5px]">Cargando estudiantes...</p>
          </div>
        ) : !filtered.length ? (
          <div className="mt-14 flex flex-col items-center justify-center gap-2 rounded-3xl border border-pine-900/6 bg-white py-20 text-pine-900/40">
            <Users size={32} strokeWidth={1.5} />
            <p className="text-[15px] font-semibold text-pine-900/70">
              No se encontraron estudiantes
            </p>
            <span className="text-[12.5px]">Prueba ajustando los filtros</span>
          </div>
        ) : (
          <div className="mt-12">
            <CaseDeck
              items={filtered}
              keyOf={(s) => s.student_id}
              label="estudiante"
              renderCard={(s) => (
                <StudentCaseCard student={s} onOpen={openStudentAlerts} />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
