import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RiskLevel } from "../types";

// Mismo criterio que en services/api.ts: local en desarrollo, Modal en
// el build de producción, y VITE_API_URL manda si está definida.
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://yanfilybacatorres--mindlms-api-fastapi-app.modal.run/api/v1"
    : "http://localhost:8000/api/v1");

/** Marcadores lingüísticos extraídos del texto (0..1 = proporción). */
export interface LinguisticMarkers {
  first_person_pronouns?: number;
  negations?: number;
  negative_emotions?: number;
  past_tense?: number;
  isolation_references?: number;
}

/** Palabras exactas del texto que activaron cada categoría de marcador. */
export interface MatchedWords {
  first_person?: string[];
  negations?: string[];
  emotions?: string[];
  isolation?: string[];
  hopelessness?: string[];
}

/** Payload del evento "new_alert" que emite el backend por SSE. */
export interface DetectionAlertEvent {
  student_id: string;
  student_name: string;
  risk_level: RiskLevel;
  risk_score?: number;
  confidence?: number;
  /** Texto completo (anonimizado) que se analizó */
  text?: string;
  /** "formulario_validacion" = dato real del formulario de validación */
  source?: string;
  course_name?: string;
  linguistic_markers?: LinguisticMarkers;
  matched_words?: MatchedWords;
  flagged_fragments?: string[];
  word_count?: number;
  char_count?: number;
  /** "transformer" | "random_forest" | "rules" */
  model_backend?: string;
}

/**
 * Se conecta al endpoint SSE del backend.
 * Cuando llega un evento "new_alert" (se guardó una alerta nueva),
 * invalida las queries del dashboard para que se refresquen y notifica
 * al caller vía `onAlert` (usado por los toasts en vivo del Layout).
 *
 * NO hace polling — solo reacciona cuando el backend avisa.
 */
export function useDetectionEvents(
  onAlert?: (event: DetectionAlertEvent) => void
) {
  const queryClient = useQueryClient();
  const [isDetecting, setIsDetecting] = useState(false);

  // Ref para no re-suscribir el EventSource cuando cambie el callback
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/ml/detect/events`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "new_alert") {
          setIsDetecting(true);
          onAlertRef.current?.({
            student_id: data.student_id ?? "",
            student_name: data.student_name ?? "",
            risk_level: (data.risk_level ?? "bajo") as RiskLevel,
            risk_score: data.risk_score ?? 0,
            confidence: data.confidence ?? 0,
            text: data.text ?? "",
            source: data.source ?? "",
            course_name: data.course_name ?? "",
            linguistic_markers: data.linguistic_markers ?? {},
            matched_words: data.matched_words ?? {},
            flagged_fragments: data.flagged_fragments ?? [],
            word_count: data.word_count ?? 0,
            char_count: data.char_count ?? 0,
            model_backend: data.model_backend ?? "transformer",
          });
          // Refrescar las 3 queries principales del dashboard
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          queryClient.invalidateQueries({ queryKey: ["recent-alerts"] });
        }

        if (data.type === "detection_complete") {
          setIsDetecting(false);
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          queryClient.invalidateQueries({ queryKey: ["recent-alerts"] });
        }
      } catch {
        // ignorar eventos malformados
      }
    };

    es.onerror = () => {
      // EventSource reconecta automáticamente
      setIsDetecting(false);
    };

    return () => es.close();
  }, [queryClient]);

  return isDetecting;
}
