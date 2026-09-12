import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { DetectionAlertEvent } from "../hooks/useDetectionEvents";

/**
 * Context del AnalysisTheater con COLA de eventos pendientes.
 *
 * Reglas:
 * 1. Nunca se cierra solo — solo con dismiss() del usuario.
 * 2. Si llega un evento nuevo mientras hay uno visible, el nuevo se
 *    encola.  Al cerrar el actual, se muestra el siguiente.
 * 3. Cola con límite (10) y priorizada por severidad: los alto van
 *    primero para no perder casos críticos si la cola crece.
 */
interface TheaterState {
  event: DetectionAlertEvent | null;
  queueSize: number;
  enqueue: (event: DetectionAlertEvent) => void;
  dismiss: () => void;
  clear: () => void;
}

const TheaterContext = createContext<TheaterState | null>(null);

const MAX_QUEUE = 10;
const SEVERITY = { alto: 3, medio: 2, bajo: 1 } as const;

export function TheaterProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<DetectionAlertEvent | null>(null);
  const [queue, setQueue] = useState<DetectionAlertEvent[]>([]);

  const enqueue = useCallback((e: DetectionAlertEvent) => {
    setEvent((current) => {
      // Si no hay uno visible, mostrarlo directo
      if (!current) return e;
      // Ya hay uno visible → a la cola
      setQueue((q) => {
        const next = [...q, e]
          .sort((a, b) => SEVERITY[b.risk_level] - SEVERITY[a.risk_level])
          .slice(0, MAX_QUEUE);
        return next;
      });
      return current;
    });
  }, []);

  const dismiss = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) {
        setEvent(null);
        return q;
      }
      const [next, ...rest] = q;
      setEvent(next);
      return rest;
    });
  }, []);

  const clear = useCallback(() => {
    setEvent(null);
    setQueue([]);
  }, []);

  return (
    <TheaterContext.Provider
      value={{ event, queueSize: queue.length, enqueue, dismiss, clear }}
    >
      {children}
    </TheaterContext.Provider>
  );
}

export function useTheater(): TheaterState {
  const ctx = useContext(TheaterContext);
  if (!ctx)
    return {
      event: null,
      queueSize: 0,
      enqueue: () => {},
      dismiss: () => {},
      clear: () => {},
    };
  return ctx;
}
