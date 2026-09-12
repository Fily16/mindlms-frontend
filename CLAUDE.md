# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**MindLMS Frontend** - Panel web para psicólogos del sistema de detección temprana de ansiedad y estrés en estudiantes de Moodle. Tesis de Ingeniería de Sistemas en UPC (Baca / Anaya).

Stack: React 19 + TypeScript + Vite, React Router 7, TanStack Query 5, Axios, Recharts, lucide-react. Estilos en CSS plano (`App.css`, `index.css`) — no hay Tailwind ni framework de UI.

Este frontend consume la API FastAPI del monorepo de tesis, ubicada en `../backend` (tiene su propio `CLAUDE.md` con la documentación de la API). También existe `../moodle-data-generator` (herramienta única para poblar el Moodle de pruebas).

## Comandos

```bash
npm install          # instalar dependencias
npm run dev          # servidor de desarrollo Vite (localhost:5173)
npm run build        # tsc -b + vite build (la verificación de tipos corre en el build)
npm run lint         # ESLint
npm run preview      # previsualizar el build de producción
```

No hay tests configurados en este proyecto.

El backend debe estar corriendo en `http://localhost:8000` para que la app funcione. La URL de la API se configura con la variable `VITE_API_URL` (por defecto `http://localhost:8000/api/v1`).

Docker: build multi-stage (Node 22 → nginx). `docker build -t mindlms-frontend .`

## Arquitectura

### Capa de servicios (`src/services/`)

`api.ts` exporta la **única instancia de axios**, con dos interceptores:
- Request: agrega `Authorization: Bearer <token>` leyendo `access_token` de localStorage.
- Response: ante un 401 limpia el token y redirige a `/login`.

Los demás servicios (`auth.service`, `alerts.service`, `dashboard.service`, `ml.service`) son objetos con métodos async que usan esa instancia. Todo nuevo endpoint debe pasar por esta capa, nunca llamar axios directo desde componentes.

El login usa OAuth2 con form-urlencoded (`username`/`password` contra `/auth/login`), no JSON.

### Estado del servidor: TanStack Query

QueryClient global en `main.tsx` (retry 1, `staleTime` 30s, sin refetch al enfocar la ventana). Las query keys principales son `["students"]`, `["dashboard-stats"]` y `["recent-alerts"]` — si agregas datos que dependen de alertas nuevas, usa estas keys o agrégalas a la invalidación en `useDetectionEvents`.

### Tiempo real vía SSE (`src/hooks/useDetectionEvents.ts`)

Hook que abre un `EventSource` a `/ml/detect/events`. Cuando el backend emite `new_alert` o `detection_complete`, invalida las tres queries principales para refrescar el dashboard. **No hace polling** — solo refresca cuando el backend avisa.

Excepción: las tareas ML en background (entrenar modelo, ejecutar detección) sí consultan su estado por polling vía `mlService.getTrainingStatus()` / `getDetectionStatus()` (usado por `MLControlPanel`).

### Autenticación

`AuthContext` envuelve toda la app y persiste `access_token` + `user_info` en localStorage. `ProtectedRoute` redirige a `/login` si no hay sesión. Si `/auth/me` no responde, se construye un usuario fallback con rol `psicologo`.

### Rutas (`App.tsx`)

- `/login` — pública
- `/` (Dashboard), `/estudiantes`, `/alertas` — anidadas dentro de `Layout` protegido

### Tipos (`src/types/index.ts`)

Espejan los modelos del backend. Los valores de dominio están **en español** y deben coincidir exactamente con la API:
- `RiskLevel`: `"bajo" | "medio" | "alto"`
- `AlertStatus`: `"pendiente" | "revisada" | "en_seguimiento" | "resuelta"`
- `UserRole`: `"psicologo" | "admin" | "viewer"`

## Idioma

Todo el proyecto está en español: textos de la UI, comentarios, nombres de rutas (`/estudiantes`, `/alertas`) y valores de dominio. Mantener esa convención en cualquier código nuevo.
