import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import Reveal from "../components/Reveal";
export default function Login() {
  const { user, login } = useAuth(); const [err, setErr] = useState("");
  if (user) return <Navigate to="/admin" replace />;
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget);
    try { await login(String(f.get("email")), String(f.get("password"))); } catch (x) { setErr((x as Error).message); } }
  return (<Reveal><form onSubmit={submit} className="max-w-sm space-y-4"><h1 className="font-heading font-bold text-3xl text-navy">Staff sign in</h1>
    <label className="block">Email<input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2" /></label>
    <label className="block">Password<input name="password" type="password" required className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2" /></label>
    {err && <p role="alert" className="text-red-700">{err}</p>}<button className="rounded-full bg-brand px-7 py-3 font-medium text-white transition hover:bg-navy">Sign in</button></form></Reveal>);
}
