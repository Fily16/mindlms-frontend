import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

/**
 * Número animado con física de resorte (inspirado en el Animated Blur
 * Number de 21st.dev). El conteo arranca recién cuando el número entra
 * en pantalla.
 *
 * Porqué: las cifras (estudiantes monitoreados, alertas) son el corazón
 * del panel; verlas "subir" comunica que el sistema está vivo y midiendo,
 * no que muestra un reporte estático.
 */
export function AnimatedNumber({
  value,
  className = "",
  duration = 1.4,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toLocaleString("es-PE");
      }
    });
    return unsubscribe;
  }, [spring]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      0
    </span>
  );
}
