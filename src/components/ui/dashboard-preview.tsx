import { Brain, Bell, Users, Activity, ShieldCheck, AlertTriangle } from "lucide-react";

/**
 * Maqueta viva del panel, usada dentro del ContainerScroll del login.
 *
 * Porqué: en vez de una captura o una foto de stock (imágenes genéricas
 * prohibidas en este proyecto), se renderiza una versión en miniatura del
 * dashboard real con JSX. Siempre está actualizada con la marca y le
 * muestra al psicólogo exactamente lo que encontrará al entrar.
 * Los datos son ilustrativos: lo real vive detrás del login.
 */
export function DashboardPreview() {
  return (
    <div className="flex h-full w-full flex-col bg-mint-50 text-left select-none">
      {/* Barra superior */}
      <div className="flex items-center justify-between border-b border-pine-900/8 bg-white/80 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pine-900 text-leaf-300">
            <Brain size={15} />
          </div>
          <span className="text-[13px] font-bold tracking-tight text-pine-900">
            MindLMS
          </span>
        </div>
        <div className="hidden items-center gap-1 rounded-full bg-pine-900/5 p-1 md:flex">
          {["Panel", "Estudiantes", "Alertas"].map((t, i) => (
            <span
              key={t}
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                i === 0 ? "bg-pine-900 text-white" : "text-pine-900/60"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-bajo-50 px-2.5 py-1 text-[10px] font-semibold text-bajo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-bajo-500 animate-pulse-soft" />
            En vivo
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-leaf-600 text-[10px] font-bold text-white">
            PS
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="grid flex-1 grid-cols-12 gap-3 p-4 md:gap-4 md:p-5">
        {/* Stats */}
        {[
          { icon: Users, lbl: "Monitoreados", num: "486", cls: "text-pine-900" },
          { icon: AlertTriangle, lbl: "Riesgo alto", num: "12", cls: "text-alto-700" },
          { icon: Activity, lbl: "Riesgo medio", num: "57", cls: "text-medio-700" },
          { icon: ShieldCheck, lbl: "Riesgo bajo", num: "417", cls: "text-bajo-700" },
        ].map(({ icon: Icon, lbl, num, cls }) => (
          <div
            key={lbl}
            className="col-span-6 rounded-2xl border border-pine-900/6 bg-white p-3 shadow-sm md:col-span-3 md:p-4"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-pine-900/50">
              <Icon size={12} />
              {lbl}
            </div>
            <div className={`mt-1 text-xl font-extrabold tracking-tight md:text-2xl ${cls}`}>
              {num}
            </div>
          </div>
        ))}

        {/* Distribución (anillo CSS) */}
        <div className="col-span-12 flex items-center gap-4 rounded-2xl border border-pine-900/6 bg-white p-4 shadow-sm md:col-span-5">
          <div
            className="relative h-24 w-24 shrink-0 rounded-full md:h-28 md:w-28"
            style={{
              background:
                "conic-gradient(#ef4444 0 9deg, #f59e0b 9deg 51deg, #10b981 51deg 360deg)",
            }}
          >
            <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white">
              <span className="text-lg font-extrabold text-pine-900">486</span>
              <span className="text-[9px] text-pine-900/50">evaluados</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-[11px]">
            {[
              { c: "#ef4444", t: "Alto — atención inmediata" },
              { c: "#f59e0b", t: "Medio — en seguimiento" },
              { c: "#10b981", t: "Bajo — estable" },
            ].map(({ c, t }) => (
              <span key={t} className="flex items-center gap-2 text-pine-900/70">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Alertas recientes */}
        <div className="col-span-12 rounded-2xl border border-pine-900/6 bg-white p-4 shadow-sm md:col-span-7">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-pine-900/50 uppercase">
            <Bell size={11} />
            Alertas recientes
          </div>
          <div className="flex flex-col gap-2">
            {[
              { lvl: "alto", txt: "“no puedo más con los parciales, no duermo…”", pct: 88 },
              { lvl: "medio", txt: "“me siento muy presionado por la entrega…”", pct: 56 },
              { lvl: "bajo", txt: "“esta semana fue tranquila, avancé bien…”", pct: 18 },
            ].map(({ lvl, txt, pct }) => (
              <div
                key={txt}
                className="flex items-center gap-3 rounded-xl bg-mint-50 px-3 py-2"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    lvl === "alto"
                      ? "bg-alto-50 text-alto-700"
                      : lvl === "medio"
                        ? "bg-medio-50 text-medio-700"
                        : "bg-bajo-50 text-bajo-700"
                  }`}
                >
                  {lvl}
                </span>
                <span className="flex-1 truncate text-[11px] text-pine-900/70 italic">
                  {txt}
                </span>
                <span className="text-[10px] font-bold text-pine-900/60">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
