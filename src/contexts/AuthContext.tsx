import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authService } from "../services/auth.service";
import api from "../services/api";
import type { User } from "../types";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    authService.isAuthenticated()
  );
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user_info");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password);
    setIsAuthenticated(true);
    // Intentar obtener datos del usuario
    try {
      const { data } = await api.get<User>("/auth/me");
      setUser(data);
      localStorage.setItem("user_info", JSON.stringify(data));
    } catch {
      // Si no existe /auth/me, usar el email como nombre
      const fallback: User = {
        id: "",
        email,
        full_name: email.split("@")[0],
        role: "psicologo",
      };
      setUser(fallback);
      localStorage.setItem("user_info", JSON.stringify(fallback));
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("user_info");
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
