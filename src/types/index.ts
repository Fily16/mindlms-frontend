// === Tipos de datos del sistema MindLMS ===

export type RiskLevel = "bajo" | "medio" | "alto";
export type AlertStatus = "pendiente" | "revisada" | "en_seguimiento" | "resuelta";
export type UserRole = "psicologo" | "admin" | "viewer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface LinguisticMarkers {
  first_person_pronouns: number;
  negations: number;
  negative_emotions: number;
  past_tense: number;
  isolation_references: number;
}

export interface TextAnalysisResult {
  risk_level: RiskLevel;
  risk_score: number;
  confidence: number;
  linguistic_markers: LinguisticMarkers;
  flagged_fragments: string[];
  analyzed_at: string;
}

export interface AlertNote {
  author: string;
  content: string;
  date: string;
}

export interface Alert {
  id: string;
  student_id: string;
  student_name?: string;
  course_id?: string;
  course_name?: string;
  risk_level: RiskLevel;
  risk_score: number;
  confidence?: number;
  text_fragment: string;
  source: string;
  status: AlertStatus;
  created_at: string;
  notes: AlertNote[];
  /** Fecha del último cambio (estado, validación...) — HU0022 */
  updated_at?: string | null;
  /** Validación clínica del nivel del modelo — HU0026 / HU0027 */
  risk_validated?: "confirmado" | "ajustado" | null;
  risk_level_adjusted?: RiskLevel | null;
  risk_adjust_reason?: string | null;
  validated_at?: string | null;
  /** Psicólogo que asumió el caso ("Atender este caso") — HU0015 */
  assigned_to?: string | null;
  /** Solo en el detalle */
  status_history?: StatusChange[];
  linguistic_evidence?: LinguisticEvidence | null;
}

export interface StatusChange {
  de: AlertStatus | null;
  a: AlertStatus;
  por: string | null;
  fecha: string;
}

/** Marcadores lingüísticos que activaron la alerta — HU0025 */
export interface LinguisticEvidence {
  marcadores: {
    pronombres_primera_persona: string[];
    negaciones: string[];
    emociones_negativas: string[];
    aislamiento: string[];
    desesperanza: string[];
  };
  fragmentos_alto_riesgo: string[];
}

/** Conteos de los filtros del Centro de Alertas — HU0020 */
export interface AlertCounts {
  por_nivel: Record<RiskLevel, number>;
  por_estado: Record<AlertStatus, number>;
  total_nivel: number;
  total_estado: number;
}

/** Indicador de extracción desde Moodle — HU0005 */
export interface ExtractionStatus {
  estado: "en_vivo" | "sin_conexion" | "sin_datos";
  ultima_extraccion: string | null;
  en_curso: boolean;
  error: string | null;
}

export interface StudentSummary {
  student_id: string;
  student_name?: string;
  current_risk_level: RiskLevel;
  total_alerts: number;
  max_risk_score: number;
  avg_risk_score: number;
  last_alert_at?: string;
  // Campos de MongoDB (si está disponible)
  risk_level?: RiskLevel;
  latest_score?: number;
  total_analyses?: number;
}

export interface DashboardStats {
  total_students: number;
  risk_distribution: Record<RiskLevel, number>;
  alerts_today: number;
}
