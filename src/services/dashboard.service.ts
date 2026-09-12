import api from "./api";
import type { DashboardStats } from "../types";

export const dashboardService = {
  async getStatistics(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>("/students/statistics");
    return data;
  },

  async getStudents(filters?: {
    risk_level?: string;
    course_id?: string;
    limit?: number;
  }) {
    const { data } = await api.get("/students/", { params: filters });
    return data;
  },

  async getStudentHistory(studentId: string) {
    const { data } = await api.get(`/students/${studentId}/history`);
    return data;
  },
};
