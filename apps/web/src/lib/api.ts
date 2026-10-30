const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";
let token = "";
export const setToken = (t: string) => { token = t; };
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const go = () => fetch(BASE + path, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  let res = await go();
  if (res.status === 401 && token) {
    const r = await fetch(BASE + "/auth/refresh", { method: "POST", credentials: "include" });
    if (r.ok) { token = (await r.json()).accessToken; res = await go(); }
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.status === 204 ? (undefined as T) : res.json();
}
