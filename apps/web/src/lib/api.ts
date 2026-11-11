const BASE = import.meta.env.DEV ? "/api/v1" : import.meta.env.VITE_API_URL ?? "/api/v1";
let token = "";
let refreshRequest: Promise<boolean> | undefined;
export const setToken = (t: string) => { token = t; };
export function refreshSession(): Promise<boolean> {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const r = await fetch(BASE + "/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });
      if (!r.ok) return false;
      token = (await r.json()).accessToken;
      return true;
    })().finally(() => { refreshRequest = undefined; });
  }
  return refreshRequest;
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const go = () => {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
    headers.set("X-Requested-With", "fetch");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(BASE + path, { ...init, credentials: "include", headers });
  };
  let res = await go();
  if (res.status === 401 && token) {
    if (await refreshSession()) res = await go();
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function apiAll<T>(path: string): Promise<{ items: T[] }> {
  const limit = 100;
  const items: T[] = [];
  let page = 1;
  let total = 0;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const result = await api<{ items: T[]; total: number }>(`${path}${separator}page=${page}&limit=${limit}`);
    items.push(...result.items);
    total = result.total;
    if (!result.items.length && items.length < total)
      throw new Error("The API returned an incomplete paginated result");
    page += 1;
  } while (items.length < total);
  return { items };
}
