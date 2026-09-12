import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Envoltorio de scroll-reveal: el contenido aparece con un leve
 * desplazamiento al entrar en el viewport, una sola vez.
 *
 * Porqué: el rediseño usa scroll como hilo narrativo ("la página se
 * reproduce como un video"). Cada bloque entra cuando le toca, con
 * retrasos escalonados para guiar la lectura del psicólogo de arriba
 * hacia abajo sin saturarlo.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.65, 0.32, 0.99] }}
    >
      {children}
    </motion.div>
  );
}
