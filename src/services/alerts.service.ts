import api from "./api";
import type { Alert, AlertCounts, RiskLevel, AlertStatus } from "../types";

export const alertsService = {
  async getAlerts(filters?: {
    risk_level?: RiskLevel;
    status?: AlertStatus;
    student_id?: string;
    limit?: number;
  }): Promise<Alert[]> {
    const { data } = await api.get<Alert[]>("/alerts/", { params: filters });
    return data;
  },

  /** Conteos por nivel y por estado, calculados en el backend (HU0020). */
  async getCounts(filters?: {
    risk_level?: RiskLevel;
    status?: AlertStatus;
    student_id?: string;
  }): Promise<AlertCounts> {
    const { data } = await api.get<AlertCounts>("/alerts/counts", { params: filters });
    return data;
  },

  async updateStatus(alertId: string, newStatus: AlertStatus): Promise<void> {
    await api.patch(`/alerts/${alertId}/status`, null, {
      params: { new_status: newStatus },
    });
  },

  async addNote(alertId: string, content: string): Promise<void> {
    await api.post(`/alerts/${alertId}/notes`, { content });
  },

  async sendMessage(
    alertId: string,
    args: { content?: string; template?: "meeting" }
  ): Promise<{ sent: boolean }> {
    const { data } = await api.post(`/alerts/${alertId}/send-message`, {
      content: args.content ?? "",
      template: args.template ?? null,
    });
    return data;
  },

  async getAlertDetail(alertId: string): Promise<Alert> {
    const { data } = await api.get<Alert>(`/alerts/${alertId}`);
    return data;
  },

  async getStatistics() {
    const { data } = await api.get("/alerts/statistics");
    return data;
  },

  /**
   * Decisión del psicólogo sobre el nivel que calculó el modelo.
   * El backend conserva el nivel automático intacto: la corrección se
   * guarda aparte para poder comparar después ambos criterios.
   */
  async validateRisk(
    alertId: string,
    args: { decision: "confirmado" | "ajustado"; nivel?: RiskLevel; motivo?: string }
  ): Promise<{ nivel_final: string; decision: string }> {
    const { data } = await api.patch(`/alerts/${alertId}/risk-validation`, {
      decision: args.decision,
      nivel_ajustado: args.nivel ?? null,
      motivo: args.motivo ?? null,
    });
    return data;
  },

  /** Registra el informe de evaluación en el expediente del estudiante. */
  async createReport(
    alertId: string,
    args: {
      contenido: string;
      derivacion?: string;
      comunicado?: boolean;
      fechaComunicacion?: string;
    }
  ): Promise<{ id: string }> {
    const { data } = await api.post(`/alerts/${alertId}/report`, {
      contenido: args.contenido,
      derivacion: args.derivacion || null,
      comunicado_al_estudiante: args.comunicado ?? false,
      fecha_comunicacion: args.comunicado ? args.fechaComunicacion || null : null,
    });
    return data;
  },

  /** Registra que se comunicaron los resultados de un informe (HU0031). */
  async registerCommunication(reportId: string, fecha: string) {
    const { data } = await api.patch(`/alerts/reports/${reportId}/communication`, {
      fecha_comunicacion: fecha,
    });
    return data;
  },

  /** "Atender este caso": el psicólogo asume el caso (HU0015). */
  async attendStudent(studentId: string): Promise<{
    student_id: string;
    alertas_en_seguimiento: number;
    asignado_a: string;
    fecha: string;
  }> {
    const { data } = await api.post(`/students/${encodeURIComponent(studentId)}/attend`);
    return data;
  },

  /** Expediente del estudiante: sus informes, del más reciente al más antiguo. */
  async getStudentReports(studentId: string): Promise<
    {
      id: string;
      autor: string;
      contenido: string;
      derivacion: string | null;
      comunicado: boolean;
      fecha_comunicacion?: string | null;
      fecha: string;
    }[]
  > {
    const { data } = await api.get(`/students/${studentId}/reports`);
    return data;
  },
};
