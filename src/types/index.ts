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
