import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AdminUser { username: string; }
interface AdminContextType {
  user: AdminUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("admin_token");
    if (saved) {
      fetch("/api/admin/me", { headers: { Authorization: `Bearer ${saved}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.username) { setToken(saved); setUser({ username: data.username }); }
          else localStorage.removeItem("admin_token");
        })
        .catch(() => localStorage.removeItem("admin_token"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const r = await fetch("/api/admin/login", {
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
    setUser({ username: data.username });
    localStorage.setItem("admin_token", data.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("admin_token");
  };

  return (
    <AdminContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be inside AdminProvider");
  return ctx;
}

export function adminFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("admin_token");
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(options.headers || {}),
    },
  });
}
