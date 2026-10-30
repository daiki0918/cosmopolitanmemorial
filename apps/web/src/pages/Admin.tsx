import { FormEvent, useState } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export function AdminLayout() {
  const { user, ready, logout } = useAuth();
  if (!ready) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  const link = ({ isActive }: { isActive: boolean }) => (isActive ? "font-semibold text-brand" : "hover:underline");
  return (<div><div className="mb-6 flex flex-wrap items-center gap-4 border-b pb-3">
    {[["/admin", "Dashboard"], ["/admin/branches", "Branches"], ["/admin/inquiries", "Inquiries"], ["/admin/services", "Services"], ["/admin/products", "Products"], ["/admin/faqs", "FAQs"]].map(([t, l]) => <NavLink key={t} to={t} end className={link}>{l}</NavLink>)}
    <span className="ml-auto text-sm">{user.role}</span><button onClick={logout} className="underline">Sign out</button></div><Outlet /></div>);
}
export function Dashboard() {
  const { data } = useQuery({ queryKey: ["dash"], queryFn: () => api<{ branches: number; newInquiries: number; byStatus: { _id: string; count: number }[] }>("/admin/dashboard") });
  const Stat = ({ l, v }: { l: string; v: number | undefined }) => <div className="rounded-xl border border-brand/10 bg-white p-5 shadow-sm"><div className="text-3xl font-heading font-bold text-navy">{v ?? "–"}</div><div>{l}</div></div>;
  return (<section><h1 className="font-heading font-bold text-3xl text-navy">Dashboard</h1><div className="mt-4 grid gap-4 sm:grid-cols-3">
    <Stat l="Active branches" v={data?.branches} /><Stat l="New inquiries" v={data?.newInquiries} />
    {data?.byStatus.map((s) => <Stat key={s._id} l={`Status: ${s._id}`} v={s.count} />)}</div></section>);
}
const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2";
export function AdminBranches() {
  const qc = useQueryClient(); const [err, setErr] = useState("");
  const { data } = useQuery({ queryKey: ["ab"], queryFn: () => api<{ items: any[] }>("/admin/branches") });
  const create = useMutation({ mutationFn: (b: object) => api("/admin/branches", { method: "POST", body: JSON.stringify(b) }), onSuccess: () => { setErr(""); qc.invalidateQueries({ queryKey: ["ab"] }); }, onError: (e: Error) => setErr(e.message) });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const b: any = Object.fromEntries(f);
    b.lat = Number(b.lat); b.lng = Number(b.lng); b.verified = f.get("verified") === "on"; Object.keys(b).forEach((k) => b[k] === "" && delete b[k]); create.mutate(b); e.currentTarget.reset(); };
  return (<section><h1 className="font-heading font-bold text-3xl text-navy">Branches</h1>
    <ul className="mt-4 space-y-2">{data?.items.map((b) => <li key={b._id} className="flex items-center gap-3 rounded-xl border border-brand/10 bg-white p-3 shadow-sm">
      {b.image && <img src={b.image} alt="" className="h-10 w-10 rounded object-cover" />}<span>{b.code} · {b.name} · {b.status} · {b.verified ? "verified" : "unverified (hidden from public)"}</span></li>)}</ul>
    <form onSubmit={submit} className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2"><h2 className="font-heading font-bold text-xl sm:col-span-2">Add branch</h2>
      {["code", "name", "address", "municipality", "province", "phone", "hours"].map((n) => <label key={n} className="capitalize">{n}<input name={n} required={n === "code" || n === "name"} className={input} /></label>)}
      <label className="sm:col-span-2">Image URL or path (e.g. /branches/junquera.jpg)<input name="image" className={input} /></label>
      <label>Latitude<input name="lat" type="number" step="any" min={-90} max={90} required className={input} /></label>
      <label>Longitude<input name="lng" type="number" step="any" min={-180} max={180} required className={input} /></label>
      <label className="sm:col-span-2"><input type="checkbox" name="verified" /> Details and coordinates verified (show publicly)</label>
      {err && <p role="alert" className="text-red-700 sm:col-span-2">{err}</p>}<button className="rounded-full bg-brand px-7 py-3 font-medium text-white transition hover:bg-navy sm:col-span-2">Save branch</button></form></section>);
}
export function AdminInquiries() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["ai"], queryFn: () => api<{ items: any[] }>("/admin/inquiries") });
  const set = useMutation({ mutationFn: (v: { id: string; status: string }) => api(`/admin/inquiries/${v.id}/status`, { method: "PATCH", body: JSON.stringify({ status: v.status }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ["ai"] }) });
  return (<section><h1 className="font-heading font-bold text-3xl text-navy">Inquiries</h1>{data?.items.length === 0 && <p className="mt-4">No inquiries yet.</p>}
    <ul className="mt-4 space-y-3">{data?.items.map((i) => <li key={i._id} className="rounded-xl border border-brand/10 bg-white p-4 shadow-sm">
      <div className="font-semibold">{i.reference} · {i.subject}</div><div className="text-sm">{i.name} · {i.email || i.phone}</div><p className="mt-1">{i.message}</p>
      <label className="mt-2 block text-sm">Status <select value={i.status} onChange={(e) => set.mutate({ id: i._id, status: e.target.value })} className="rounded-lg border border-slate-300 p-1">
        {["new", "in_review", "contacted", "resolved", "closed"].map((s) => <option key={s}>{s}</option>)}</select></label></li>)}</ul></section>);
}
const FIELDS: Record<string, { name: string; label: string; area?: boolean; list?: boolean }[]> = {
  services: [{ name: "title", label: "Title" }, { name: "description", label: "Description", area: true }, { name: "price", label: "Price or range" }, { name: "image", label: "Image URL" }],
  products: [{ name: "title", label: "Title" }, { name: "category", label: "Category" }, { name: "description", label: "Description", area: true }, { name: "price", label: "Price" }, { name: "image", label: "Image URL" }, { name: "inclusions", label: "Inclusions (comma separated)", list: true }],
  faqs: [{ name: "question", label: "Question" }, { name: "answer", label: "Answer", area: true }],
};
export function AdminContent({ type }: { type: "services" | "products" | "faqs" }) {
  const qc = useQueryClient(); const [err, setErr] = useState(""); const key = ["c", type];
  const { data } = useQuery({ queryKey: key, queryFn: () => api<any[]>(`/admin/${type}`) });
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const create = useMutation({ mutationFn: (b: object) => api(`/admin/${type}`, { method: "POST", body: JSON.stringify(b) }), onSuccess: () => { setErr(""); inv(); }, onError: (e: Error) => setErr(e.message) });
  const patch = useMutation({ mutationFn: (v: { id: string; b: object }) => api(`/admin/${type}/${v.id}`, { method: "PATCH", body: JSON.stringify(v.b) }), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: string) => api(`/admin/${type}/${id}`, { method: "DELETE" }), onSuccess: inv });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const b: any = {};
    FIELDS[type].forEach((x) => { const v = String(f.get(x.name) ?? "").trim(); if (v) b[x.name] = x.list ? v.split(",").map((s) => s.trim()).filter(Boolean) : v; });
    b.published = f.get("published") === "on"; create.mutate(b); e.currentTarget.reset(); };
  return (<section><h1 className="font-heading font-bold text-3xl capitalize text-navy">{type}</h1>
    <ul className="mt-4 space-y-2">{data?.map((d) => <li key={d._id} className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/10 bg-white p-3 shadow-sm">
      <span className="font-semibold">{d.title ?? d.question}</span><span className="text-sm">{d.published ? "Published" : "Draft"}</span>
      <button className="ml-auto underline" onClick={() => patch.mutate({ id: d._id, b: { published: !d.published } })}>{d.published ? "Unpublish" : "Publish"}</button>
      <button className="underline text-red-700" onClick={() => confirm("Archive this item?") && del.mutate(d._id)}>Archive</button></li>)}</ul>
    <form onSubmit={submit} className="mt-6 max-w-xl space-y-3"><h2 className="font-heading font-bold text-xl">Add new</h2>
      {FIELDS[type].map((x) => <label key={x.name} className="block">{x.label}{x.area ? <textarea name={x.name} rows={3} className={input} required={x.name !== "description"} /> : <input name={x.name} className={input} required={x.name === "title" || x.name === "question"} />}</label>)}
      <label className="block"><input type="checkbox" name="published" /> Publish immediately</label>
      {err && <p role="alert" className="text-red-700">{err}</p>}<button className="rounded-full bg-brand px-7 py-3 font-medium text-white transition hover:bg-navy">Create</button></form></section>);
}
