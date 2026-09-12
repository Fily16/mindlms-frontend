import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Mazo de casos — un caso a la vez (inspirado en los Display Cards
 * apilados y los carruseles de 21st.dev).
 *
 * Porqués:
 * - Ver 200 tarjetas en cuadrícula abruma y diluye la atención; el
 *   trabajo clínico es caso por caso. El mazo presenta UNO grande,
 *   con las siguientes cartas asomando detrás: se siente la cola de
 *   trabajo sin tener que mirarla entera.
 * - La lista llega ordenada por severidad: el psicólogo avanza con
 *   flechas, teclado (← →) o arrastrando la carta, siempre del caso
 *   más urgente al menos urgente.
 */
export function CaseDeck<T>({
  items,
  keyOf,
  renderCard,
  label = "caso",
}: {
  items: T[];
  keyOf: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  label?: string;
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  // Si cambia el filtro/la lista, volver al primer caso
  const firstKey = items.length ? keyOf(items[0]) : "";
  useEffect(() => {
    setIndex(0);
  }, [firstKey, items.length]);

  const clamped = Math.min(index, Math.max(items.length - 1, 0));
  const current = items[clamped];

  const go = (delta: number) => {
    setDir(delta);
    setIndex((i) => {
      const next = i + delta;
      if (next < 0 || next >= items.length) return i;
      return next;
    });
  };

  // Navegación con teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (!current) return null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Escenario del mazo */}
      <div className="relative">
        {/* Cartas que asoman detrás: la cola de trabajo se intuye */}
        {items.length - clamped > 2 && (
          <div className="absolute inset-x-8 -top-4 h-full rotate-[1.2deg] rounded-3xl border border-pine-900/6 bg-white/50 shadow-sm" />
        )}
        {items.length - clamped > 1 && (
          <div className="absolute inset-x-4 -top-2 h-full rotate-[-0.8deg] rounded-3xl border border-pine-900/8 bg-white/75 shadow-sm" />
        )}

        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={keyOf(current)}
            custom={dir}
            variants={{
              enter: (d: number) => ({
                x: d * 440,
                opacity: 0,
                scale: 0.92,
                rotate: d * 3,
              }),
              center: { x: 0, opacity: 1, scale: 1, rotate: 0 },
              exit: (d: number) => ({
                x: -d * 440,
                opacity: 0,
                scale: 0.92,
                rotate: -d * 3,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(1);
              else if (info.offset.x > 80) go(-1);
            }}
            className="relative cursor-grab active:cursor-grabbing"
          >
            {renderCard(current)}
          </motion.div>
        </AnimatePresence>

        {/* Flechas laterales */}
        <button
          onClick={() => go(-1)}
          disabled={clamped === 0}
          title="Caso anterior (←)"
          className="absolute top-1/2 -left-4 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-pine-900/10 bg-white text-pine-900/70 shadow-lg transition-all hover:scale-110 hover:text-pine-900 disabled:opacity-30 disabled:hover:scale-100 md:-left-16"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => go(1)}
          disabled={clamped >= items.length - 1}
          title="Siguiente caso (→)"
          className="absolute top-1/2 -right-4 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-pine-900/10 bg-white text-pine-900/70 shadow-lg transition-all hover:scale-110 hover:text-pine-900 disabled:opacity-30 disabled:hover:scale-100 md:-right-16"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Posición en la cola */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <span className="text-[13px] font-semibold text-pine-900/55">
          {label} {clamped + 1} de {items.length}
        </span>
        <div className="h-1.5 w-44 overflow-hidden rounded-full bg-pine-900/8">
          <motion.div
            animate={{
              width: `${((clamped + 1) / items.length) * 100}%`,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="h-full rounded-full bg-leaf-500"
          />
        </div>
      </div>
    </div>
  );
}
