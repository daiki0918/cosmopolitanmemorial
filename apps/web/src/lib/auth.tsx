import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { api, refreshSession, setToken } from "./api";
type U = { id: string; name?: string; email?: string; role: string; mustChangePassword?: boolean } | null;
const Ctx = createContext<{ user: U; ready: boolean; login: (e: string, p: string) => Promise<void>; logout: () => Promise<void> }>(null!);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [user, setUser] = useState<U>(null); const [adminReady, setAdminReady] = useState(false);
  const isAdmin = pathname.startsWith("/admin");
  useEffect(() => {
    if (!isAdmin) { setAdminReady(false); return; }
    let active = true;
    (async () => {
      try { if (await refreshSession()) setUser(await api<U>("/auth/me")); } catch {}
      if (active) setAdminReady(true);
    })();
    return () => { active = false; };
  }, [isAdmin]);
  const login = async (email: string, password: string) => {
    const r = await api<{ accessToken: string; user: U }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setToken(r.accessToken);
    setUser(r.user);
  };
  const logout = async () => { try { await api("/auth/logout", { method: "POST" }); } catch {} setToken(""); setUser(null); };
  return <Ctx.Provider value={{ user, ready: !isAdmin || adminReady, login, logout }}>{children}</Ctx.Provider>;
}
