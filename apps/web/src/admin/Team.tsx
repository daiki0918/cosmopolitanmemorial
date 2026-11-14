import { FormEvent, ReactNode, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiAll } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can, ROLE_INFO, type Perm, type Role } from "./permissions";
import { Badge, Confirm, Drawer, Empty, Err, Icon, Loading, PageHeader, Pager, Spinner, btnGhost, btnPrimary, card, input, labelCls, useToast } from "./ui";

const when = (d?: string) => (d ? new Date(d).toLocaleString() : "");
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const genPass = () => Array.from(crypto.getRandomValues(new Uint8Array(14)), (b) => CHARS[b % CHARS.length]).join("");
const ROLES = Object.keys(ROLE_INFO) as Role[];
const selectCls = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-slate-400";

export function RequirePerm({ perm, children }: { perm: Perm; children: ReactNode }) {
  const { user } = useAuth();
  return can(user?.role, perm) ? <>{children}</> : <Navigate to="/admin" replace />;
}

function PasswordField({ value, onChange, label = "Temporary password" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const toast = useToast();
  return (
    <label className={labelCls}>{label}
      <div className="mt-1 flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} minLength={12} maxLength={256} required autoComplete="off"
          className={`${input.replace("mt-1 ", "")} min-w-0 flex-1 font-mono`} />
        <button type="button" className={btnGhost} onClick={() => onChange(genPass())}>Generate</button>
        <button type="button" className={btnGhost} onClick={() => navigator.clipboard.writeText(value).then(() => toast("Copied"))}>Copy</button>
      </div>
      <span className="mt-1 block text-xs font-normal normal-case text-slate-500">They must change it at first sign-in. Share it privately, never in a group chat.</span>
    </label>
  );
}

/* ───────── users ───────── */
export function AdminUsers() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user: me } = useAuth();
  const { data, isLoading, isError } = useQuery({ queryKey: ["users"], queryFn: () => api<{ items: any[] }>("/admin/users") });
  const branchesQuery = useQuery({
    queryKey: ["ab", me?.id],
    queryFn: () => apiAll<{ _id: string; name: string; municipality?: string; province?: string }>("/admin/branches"),
  });
  const [modal, setModal] = useState<any>(null); // "new" or the user whose password is being reset
  const [editModal, setEditModal] = useState<any>(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [ask, setAsk] = useState<{ title: string; message: string; run: () => void } | null>(null);

  const open = (m: any) => { setErr(""); setPw(genPass()); setModal(m); };
  const done = (msg: string) => () => { qc.invalidateQueries({ queryKey: ["users"] }); setModal(null); setEditModal(null); toast(msg); };
  const fail = (e: Error) => { setErr(e.message); toast(e.message, "err"); };
  const create = useMutation({ mutationFn: (b: object) => api("/admin/users", { method: "POST", body: JSON.stringify(b) }), onSuccess: done("Account created"), onError: fail });
  const patch = useMutation({ mutationFn: (v: { id: string; b: object }) => api(`/admin/users/${v.id}`, { method: "PATCH", body: JSON.stringify(v.b) }), onSuccess: done("Saved"), onError: fail });

  const submitNew = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({ name: String(f.get("name")).trim(), email: String(f.get("email")).trim(), role: f.get("role"), password: pw });
  };
  const submitEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = new FormData(form);
    patch.mutate({
      id: editModal._id,
      b: {
        name: String(fields.get("name")).trim(),
        email: String(fields.get("email")).trim(),
        ...(editModal._id !== me?.id ? { role: fields.get("role") } : {}),
        ...(branchesQuery.data?.items.length ? { branches: fields.getAll("branches").map(String) } : {}),
        active: editModal._id === me?.id ? editModal.active !== false : fields.get("active") === "on",
      },
    });
  };

  return (
    <section>
      <PageHeader title="Users" subtitle="Team accounts and what each role can do."
        action={<button className={btnPrimary} onClick={() => open("new")}>Add team member</button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r} className={`${card} p-4`}>
            <p className="font-semibold text-navy">{ROLE_INFO[r].label}</p>
            <p className="mt-1 text-sm text-slate-500">{ROLE_INFO[r].blurb}</p>
            <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
              {ROLE_INFO[r].access.map((access) => (
                <li key={access} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {access}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        {isLoading ? <Loading /> : isError ? <Err msg="Could not load team accounts. Refresh the page or try again later." /> : !data?.items.length ? <Empty>No users found.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3 font-semibold">Member</th><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Last sign-in</th><th className="w-[320px] px-5 py-3 text-right font-semibold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((u) => {
                  const self = u._id === me?.id;
                  const active = u.active !== false;
                  return (
                    <tr key={u._id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-bold text-white">{(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}</span>
                          <div>
                            <div className="font-medium text-slate-900">{u.name ?? "—"} {self && <Badge tone="blue">You</Badge>}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select value={u.role} disabled={self || patch.isPending} aria-label={`Role for ${u.name ?? u.email}`} className={selectCls}
                          onChange={(e) => patch.mutate({ id: u._id, b: { role: e.target.value } })}>
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3"><Badge tone={active ? "green" : "slate"}>{active ? "Active" : "Disabled"}</Badge></td>
                      <td className="px-5 py-3 text-slate-500">{when(u.lastLoginAt) || "Never"}</td>
                      <td className="px-5 py-3">
                        <div className="ml-auto grid w-[300px] grid-cols-[72px_132px_80px] justify-end gap-2">
                          <button className={`${btnGhost} w-full justify-center px-2`} onClick={() => { setErr(""); setEditModal(u); }}>
                            <Icon name="edit" className="h-4 w-4" />Edit
                          </button>
                          <button className={`${btnGhost} w-full justify-center px-2`} disabled={self} onClick={() => open(u)}>
                            <Icon name="key" className="h-4 w-4" />Reset password
                          </button>
                          {!self && (active
                            ? <button className="w-full rounded-lg border border-red-200 px-2 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                                onClick={() => setAsk({ title: "Disable account?", message: `${u.name ?? u.email} will be signed out and unable to sign in. You can re-enable them later.`, run: () => patch.mutate({ id: u._id, b: { active: false } }) })}>Disable</button>
                            : <button className={`${btnGhost} w-full justify-center px-2`} onClick={() => patch.mutate({ id: u._id, b: { active: true } })}>Enable</button>)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === "new" && (
        <Drawer title="Add team member" onClose={() => setModal(null)}>
          <form onSubmit={submitNew} className="space-y-4">
            <label className={labelCls}>Full name<input name="name" required className={input} /></label>
            <label className={labelCls}>Email<input name="email" type="email" required className={input} /></label>
            <label className={labelCls}>Role
              <select name="role" defaultValue="staff" className={input}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label} — {ROLE_INFO[r].blurb}</option>)}</select>
            </label>
            <PasswordField value={pw} onChange={setPw} />
            <Err msg={err} />
            <button disabled={create.isPending} className={btnPrimary}>{create.isPending && <Spinner />}{create.isPending ? "Creating account…" : "Create account"}</button>
          </form>
        </Drawer>
      )}
      {editModal && (
        <Drawer title={`Edit ${editModal.name ?? "team member"}`} onClose={() => setEditModal(null)} maxW="max-w-2xl">
          <form onSubmit={submitEdit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>Full name
                <input name="name" defaultValue={editModal.name} required minLength={2} maxLength={120} className={input} />
              </label>
              <label className={labelCls}>Email
                <input name="email" type="email" defaultValue={editModal.email} required maxLength={254} className={input} />
              </label>
              <label className={labelCls}>Role
                <select name="role" defaultValue={editModal.role} disabled={editModal._id === me?.id} className={input}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                </select>
                {editModal._id === me?.id && <span className="mt-1 block text-xs font-normal text-slate-500">You cannot change your own role.</span>}
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
                <input name="active" type="checkbox" defaultChecked={editModal.active !== false} disabled={editModal._id === me?.id} className="h-4 w-4 rounded border-slate-300" />
                Account active
              </label>
            </div>
            <fieldset>
              <legend className={`${labelCls} mb-2`}>Assigned branches</legend>
              {branchesQuery.isLoading ? <Loading /> : branchesQuery.isError
                ? <Err msg="Could not load branches. Refresh the page before changing branch assignments." />
                : branchesQuery.data?.items.length
                  ? <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                    {branchesQuery.data.items.map((branch) => (
                      <label key={branch._id} className="flex items-start gap-2 rounded-lg p-2 text-sm text-slate-700 hover:bg-slate-50">
                        <input type="checkbox" name="branches" value={branch._id} defaultChecked={(editModal.branches ?? []).some((id: unknown) => String(id) === branch._id)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                        <span><span className="block font-medium">{branch.name}</span><span className="text-xs text-slate-500">{[branch.municipality, branch.province].filter(Boolean).join(", ")}</span></span>
                      </label>
                    ))}
                  </div>
                  : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No branches are available to assign.</p>}
              <p className="mt-2 text-xs leading-5 text-slate-500">Assignments restrict branch and inquiry access for branch manager, staff, and content manager roles. Administrators and super admins have access across all branches regardless of assignments.</p>
            </fieldset>
            <Err msg={err} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setEditModal(null)}>Cancel</button>
              <button disabled={patch.isPending || branchesQuery.isLoading || branchesQuery.isError} className={btnPrimary}>{patch.isPending && <Spinner />}{patch.isPending ? "Saving changes…" : "Save changes"}</button>
            </div>
          </form>
        </Drawer>
      )}
      {modal && modal !== "new" && (
        <Drawer title={`Reset password for ${modal.name ?? modal.email}`} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); patch.mutate({ id: modal._id, b: { password: pw } }); }} className="space-y-4">
            <PasswordField value={pw} onChange={setPw} label="New temporary password" />
            <Err msg={err} />
            <button disabled={patch.isPending} className={btnPrimary}>{patch.isPending && <Spinner />}{patch.isPending ? "Setting password…" : "Set password"}</button>
          </form>
        </Drawer>
      )}
      {ask && <Confirm title={ask.title} message={ask.message} onCancel={() => setAsk(null)} onConfirm={() => { ask.run(); setAsk(null); }} />}
    </section>
  );
}

/* ───────── activity log ───────── */
export function AdminActivity() {
  type ActivityRecord = {
    _id: string;
    createdAt: string;
    actor: { _id: string; name?: string; email?: string } | null;
    action: string;
    target?: string;
    meta?: Record<string, unknown>;
  };
  const [activityPage, setActivityPage] = useState(1);
  const [actorFilter, setActorFilter] = useState("all");
  const pageSize = 20;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit", actorFilter, activityPage],
    queryFn: () => api<{ items: ActivityRecord[]; total: number; actors: { _id: string; name?: string; email?: string }[] }>(
      `/admin/audit-logs?page=${activityPage}&limit=${pageSize}&actor=${encodeURIComponent(actorFilter)}`,
    ),
  });
  const pg = {
    page: activityPage,
    pages: Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
    total: data?.total ?? 0,
    size: pageSize,
    setPage: setActivityPage,
  };
  return (
    <section>
      <PageHeader title="Activity" subtitle="Sign-ins and changes made by team members."
        action={<label className="flex items-center gap-2 text-sm text-slate-600">
          <span>Filter:</span>
          <select aria-label="Filter activity by user" value={actorFilter} onChange={(e) => { setActorFilter(e.target.value); setActivityPage(1); }} className={selectCls}>
            <option value="all">All users</option>
            {data?.actors.map((actor) => <option key={actor._id} value={actor._id}>{actor.name ?? actor.email}</option>)}
            <option value="system">System / unknown actor</option>
          </select>
        </label>} />
      <div className={`${card} overflow-hidden`}>
        {isLoading ? <Loading /> : isError ? <Err msg="Could not load activity records. Refresh the page or try again later." /> : !pg.total ? <Empty>{actorFilter !== "all" ? "No activity for this user." : "No activity recorded yet."}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3 font-semibold">When</th><th className="px-5 py-3 font-semibold">Who</th><th className="px-5 py-3 font-semibold">Action</th><th className="px-5 py-3 font-semibold">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map((a) => {
                  const meta = a.meta ?? {};
                  const summaryKey = ["targetName", "name", "title", "question", "reference", "email"].find((key) => typeof meta[key] === "string" && meta[key]);
                  const details = Object.entries(meta)
                    .filter(([key, value]) => !["ip", "targetName", "targetEmail", "name", "title", "question", "reference", "email"].includes(key) && ["string", "number", "boolean"].includes(typeof value))
                    .map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/_/g, " ")}: ${String(value)}`);
                  return (
                  <tr key={a._id}>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{when(a.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{a.actor?.name ?? a.actor?.email ?? "System / unknown actor"}</div>
                      {a.actor?.name && <div className="text-xs text-slate-500">{a.actor.email}</div>}
                    </td>
                    <td className="px-5 py-3"><Badge>{String(a.action).replace(/[._]/g, " ")}</Badge></td>
                    <td className="px-5 py-3 text-slate-600">
                      <div>{summaryKey ? String(meta[summaryKey]) : a.target ?? "—"}</div>
                      {details.length > 0 && <div className="mt-1 text-xs text-slate-500">{details.join(" · ")}</div>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager {...pg} />
      </div>
    </section>
  );
}

/* ───────── my account ───────── */
export function AdminAccount() {
  const { user } = useAuth();
  const [err, setErr] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const change = useMutation({
    mutationFn: (b: object) => api("/auth/change-password", { method: "POST", body: JSON.stringify(b) }),
    onSuccess: () => { setErr(""); window.location.assign("/admin/login"); },
    onError: (e: Error) => setErr(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const next = String(f.get("next"));
    if (next.length < 12) return setErr("New password must be at least 12 characters");
    if (next !== f.get("confirm")) return setErr("Passwords don't match");
    change.mutate({ current: f.get("current"), next }, { onSuccess: () => form.reset() });
  };
  const roleInfo = ROLE_INFO[user?.role as Role];
  const passwordMatches = confirmPassword.length > 0 && nextPassword === confirmPassword;
  return (
    <section className="space-y-6">
      <PageHeader title="My account" subtitle="Review your account access and keep your sign-in secure." />
      {user?.mustChangePassword && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">For your security, please choose a new password before continuing.</p>}

      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <section className={`${card} overflow-hidden`}>
          <div className="bg-gradient-to-br from-navy to-brand p-6 text-white">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 font-heading text-2xl font-bold">{(user?.name ?? user?.role ?? "?").charAt(0).toUpperCase()}</span>
            <h2 className="mt-4 font-heading text-xl font-bold">{user?.name ?? "Signed in"}</h2>
            <p className="mt-1 text-sm text-white/75">Account profile</p>
          </div>
          <dl className="space-y-4 p-5">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access role</dt>
              <dd className="mt-1"><Badge tone="blue">{roleInfo?.label ?? user?.role ?? "Team member"}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permissions</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-600">{roleInfo?.blurb ?? "Your assigned admin access is managed by an administrator."}</dd>
            </div>
          </dl>
        </section>

        <form onSubmit={submit} className={`${card} space-y-5 p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-navy">Change password</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">Use a unique password with at least 12 characters.</p>
            </div>
            <button type="button" className={btnGhost} onClick={() => setShowPasswords((show) => !show)} aria-label={showPasswords ? "Hide passwords" : "Show passwords"}>
              <Icon name="eye" className="h-4 w-4" />{showPasswords ? "Hide" : "Show"}
            </button>
          </div>
          <label className={labelCls}>Current password
            <input name="current" type={showPasswords ? "text" : "password"} required autoComplete="current-password" className={input} />
          </label>
          <label className={labelCls}>New password
            <input name="next" type={showPasswords ? "text" : "password"} value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} required minLength={12} maxLength={256} autoComplete="new-password" className={input} />
          </label>
          <label className={labelCls}>Confirm new password
            <input name="confirm" type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={256} autoComplete="new-password" className={input} />
          </label>
          <p role="status" className={`text-sm ${!confirmPassword ? "text-slate-500" : passwordMatches ? "text-emerald-700" : "text-amber-700"}`}>
            {!confirmPassword ? "Password must be 12–256 characters." : passwordMatches ? "Passwords match." : "Passwords do not match yet."}
          </p>
          <Err msg={err} />
          <button disabled={change.isPending || nextPassword.length < 12 || !passwordMatches} className={btnPrimary}>{change.isPending && <Spinner />}{change.isPending ? "Updating password…" : "Update password"}</button>
        </form>
      </div>
    </section>
  );
}