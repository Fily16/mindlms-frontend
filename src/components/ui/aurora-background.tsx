import type { ReactNode } from "react";

/**
 * Fondo "aurora" en verdes profundos (adaptación ligera del Aurora
 * Background de Aceternity, sin WebGL: solo gradientes difuminados
 * animados con CSS para no castigar el rendimiento).
 *
 * Porqué: el sistema detecta ansiedad; la primera impresión debe
 * transmitir calma. El movimiento es lento (18–26s) a propósito —
 * un ritmo respiratorio, nunca frenético.
 */
export function AuroraBackground({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-pine-950 ${className}`}>
      {/* Capa aurora */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-1/4 -left-1/4 h-[80vh] w-[80vw] rounded-full opacity-50 blur-3xl animate-drift-1"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(16,185,129,0.55) 0%, rgba(16,185,129,0.12) 45%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/3 -right-1/4 h-[70vh] w-[70vw] rounded-full opacity-40 blur-3xl animate-drift-2"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(52,211,153,0.45) 0%, rgba(6,95,70,0.18) 50%, transparent 72%)",
          }}
        />
        <div
          className="absolute -bottom-1/3 left-1/4 h-[70vh] w-[60vw] rounded-full opacity-35 blur-3xl animate-drift-3"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(110,231,183,0.35) 0%, rgba(4,120,87,0.15) 50%, transparent 75%)",
          }}
        />
        {/* Viñeta para que el texto siempre respire sobre el fondo */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 0%, rgba(3,16,11,0.55) 100%)",
          }}
        />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
