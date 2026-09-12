import api from "./api";
import type { Alert, RiskLevel, AlertStatus } from "../types";

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
};
