import { useQuery } from "@tanstack/react-query";
import { mlService, type MLTaskStatus } from "../services/ml.service";

/**
 * Estado en vivo del motor ML vía polling ligero.
 * Rápido (2.5 s) mientras hay trabajo corriendo; relajado (12 s) en reposo.
 * El psicólogo no controla el entrenamiento — solo lo observa.
 */
export function useDetectionStatus() {
  return useQuery<MLTaskStatus>({
    queryKey: ["ml-detection-status"],
    queryFn: mlService.getDetectionStatus,
    refetchInterval: (query) =>
      query.state.data?.state === "running" ? 2500 : 12000,
  });
}

export function useTrainingStatus() {
  return useQuery<MLTaskStatus>({
    queryKey: ["ml-training-status"],
    queryFn: mlService.getTrainingStatus,
    refetchInterval: (query) =>
      query.state.data?.state === "running" ? 4000 : 20000,
  });
}
