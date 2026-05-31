import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiFetch } from "../lib/api";
import { hasPermission as checkPermission, type AdminPermission } from "./permissions";

interface AdminUser {
  username: string;
  displayName: string;
  email?: string;
  role?: string;
  isSuperAdmin?: boolean;
  permissions: string[];
}
interface AdminContextType {
  user: AdminUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission?: AdminPermission) => boolean;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const doLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("admin_token");
  };

  useEffect(() => {
    const saved = localStorage.getItem("admin_token");
    if (saved) {
      apiFetch("/api/admin/me", { headers: { Authorization: `Bearer ${saved}` } })
        .then(async r => {
          if (r.status === 401) {
            localStorage.removeItem("admin_token");
            return null;
          }
          return r.ok ? r.json() : null;
        })
        .then(data => {
          if (data?.username) {
            setToken(saved);
            setUser({
              username: data.username,
              displayName: data.displayName || data.username,
              email: data.email || "",
              role: data.role || "admin",
              isSuperAdmin: !!data.isSuperAdmin,
              permissions: Array.isArray(data.permissions) ? data.permissions : [],
            });
          } else {
            localStorage.removeItem("admin_token");
          }
        })
        .catch(() => localStorage.removeItem("admin_token"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const r = await apiFetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || "Login failed");
    }
    const data = await r.json();
    setToken(data.token);
    setUser({
      username: data.username,
      displayName: data.displayName || data.username,
      email: data.email || "",
      role: data.role || "admin",
      isSuperAdmin: !!data.isSuperAdmin,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
    });
    localStorage.setItem("admin_token", data.token);
  };

  const logout = () => { doLogout(); };
  const hasPermission = useCallback((permission?: AdminPermission) => checkPermission(user, permission), [user]);

  return (
    <AdminContext.Provider value={{ user, token, login, logout, hasPermission, isLoading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be inside AdminProvider");
  return ctx;
}

export function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("admin_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return apiFetch(`/api${path}`, { ...options, headers }).then(async r => {
    if (r.status === 401) {
      const body = await r.clone().json().catch(() => ({}));
      if (body.code === "TOKEN_EXPIRED" || body.code === "INVALID_TOKEN") {
        localStorage.removeItem("admin_token");
        window.location.href = "/admin/login";
      }
    }
    return r;
  });
}
