import api from "./api";

export interface MLTaskStatus {
  state: "idle" | "running" | "completed" | "failed";
  task_type: string | null;
  current_step: string;
  progress: number;
  steps_completed: number;
  total_steps: number;
  logs: string[];
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export const mlService = {
  async startTraining(modelType: string = "baseline") {
    const { data } = await api.post("/ml/train", { model_type: modelType });
    return data;
  },

  async getTrainingStatus(): Promise<MLTaskStatus> {
    const { data } = await api.get<MLTaskStatus>("/ml/train/status");
    return data;
  },

  async startDetection() {
    const { data } = await api.post("/ml/detect");
    return data;
  },

  async getDetectionStatus(): Promise<MLTaskStatus> {
    const { data } = await api.get<MLTaskStatus>("/ml/detect/status");
    return data;
  },
};
