import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken } from "./api";
type U = { id: string; name?: string; role: string } | null;
const Ctx = createContext<{ user: U; ready: boolean; login: (e: string, p: string) => Promise<void>; logout: () => Promise<void> }>(null!);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<U>(null); const [ready, setReady] = useState(false);
  useEffect(() => { (async () => {
    try { const r = await fetch((import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1") + "/auth/refresh", { method: "POST", credentials: "include" });
      if (r.ok) { setToken((await r.json()).accessToken); setUser(await api("/auth/me")); } } catch {} setReady(true); })(); }, []);
  const login = async (email: string, password: string) => {
    const r = await api<{ accessToken: string; user: U }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setToken(r.accessToken); setUser(r.user);
  };
  const logout = async () => { try { await api("/auth/logout", { method: "POST" }); } catch {} setToken(""); setUser(null); };
  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}
