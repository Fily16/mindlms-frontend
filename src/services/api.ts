import axios from "axios";

// En desarrollo apunta al backend local; en el build de producción, al
// desplegado en Modal. VITE_API_URL sigue teniendo prioridad si se define,
// pero así no hace falta configurar nada en el panel de hosting.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://yanfilybacatorres--mindlms-api-fastapi-app.modal.run/api/v1"
    : "http://localhost:8000/api/v1");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor para agregar JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
