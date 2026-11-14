import { FormEvent, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiAll, apiAssetUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import { can, type Perm } from "./permissions";
import {
  Badge, Confirm, Drawer, Empty, Err, Icon, IconName, Loading, PageHeader, Pager, SearchBox, Spinner, STATUSES, ToastProvider,
  btnGhost, btnPrimary, card, downloadCsv, iconBtn, input, label, labelCls, statusTone, useToast, usePaged,
} from "./ui";

/* ───────── data hooks (shared cache keys) ───────── */
type ContentType = "services" | "products" | "faqs";
const useDash = (enabled = true) => {
  const { user } = useAuth();
  return useQuery({ queryKey: ["dash", user?.id], enabled, queryFn: () => api<{ branches: number | null; totalBranches: number | null; newInquiries: number | null; users: number | null; byStatus: { _id: string; count: number }[]; inquiryActivity: { _id: string; count: number }[] }>("/admin/dashboard") });
};
const useInquiries = (enabled = true) => {
  const { user } = useAuth();
  return useQuery({ queryKey: ["ai", user?.id], enabled, queryFn: () => apiAll<any>("/admin/inquiries") });
};
const useBranches = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: ["ab", user?.id], queryFn: () => apiAll<any>("/admin/branches") });
};
const useContent = (type: ContentType, enabled = true) => {
  const { user } = useAuth();
  return useQuery({ queryKey: ["c", type, user?.id], enabled, queryFn: async () => (await apiAll<any>(`/admin/${type}`)).items });
};
const when = (d?: string) => (d ? new Date(d).toLocaleString() : "");
const time = (d?: string) => (d ? new Date(d).getTime() : 0);

/* ───────── layout ───────── */
const adminLinks: { to: string; label: string; icon: IconName; perm?: Perm }[] = [
  { to: "/admin", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/branches", label: "Branches", icon: "branches", perm: "branches.view" },
  { to: "/admin/inquiries", label: "Inquiries", icon: "inquiries", perm: "inquiries.view" },
  { to: "/admin/services", label: "Services", icon: "services", perm: "content.edit" },
  { to: "/admin/products", label: "Products", icon: "products", perm: "content.edit" },
  { to: "/admin/faqs", label: "FAQs", icon: "faqs", perm: "content.edit" },
  { to: "/admin/users", label: "Users", icon: "users", perm: "users.manage" },
  { to: "/admin/activity", label: "Activity", icon: "activity", perm: "audit.view" },
];

export function AdminLayout() {
  const { user, ready, logout } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const preference = localStorage.getItem("cosmopolitan-admin-sidebar");
      return preference ? preference === "collapsed" : true;
    } catch (error) {
      console.error("Could not read the admin sidebar preference.", error);
      return true;
    }
  });
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("cosmopolitan-admin-theme") === "dark";
    } catch (error) {
      console.error("Could not read the admin theme preference.", error);
      return false;
    }
  });
  const { data: dash } = useDash(!!user);
  useEffect(() => {
    try {
      localStorage.setItem("cosmopolitan-admin-sidebar", sidebarCollapsed ? "collapsed" : "expanded");
    } catch (error) {
      console.error("Could not save the admin sidebar preference.", error);
    }
  }, [sidebarCollapsed]);
  useEffect(() => {
    try {
      localStorage.setItem("cosmopolitan-admin-theme", darkMode ? "dark" : "light");
    } catch (error) {
      console.error("Could not save the admin theme preference.", error);
    }
  }, [darkMode]);
  if (!ready) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;
  if (!user) return <AdminLoginRedirect />;
  if (user.mustChangePassword && loc.pathname !== "/admin/account") return <Navigate to="/admin/account" replace />;

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`;
  const role = label(user.role);
  const initial = (user.name ?? user.role).charAt(0).toUpperCase();

  return (
    <ToastProvider>
      <div className={`admin-theme admin-shell min-h-screen bg-slate-50 text-slate-800 ${darkMode ? "admin-dark" : ""}`}>
        {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}

        <aside className={`admin-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden bg-navy text-white transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"} lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className={`flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5 ${sidebarCollapsed ? "lg:justify-center lg:px-2" : ""}`}>
            <Link to="/admin" className="flex items-center gap-3" onClick={() => setOpen(false)}>
              <img src="/logo-white.png" alt="" className="h-8 w-auto brightness-0 invert" />
              <span className={`whitespace-nowrap font-heading text-sm font-bold leading-tight ${sidebarCollapsed ? "lg:hidden" : ""}`}>Cosmopolitan<br />Admin</span>
            </Link>
            <button className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
          </div>

          <nav aria-label="Admin" className={`flex-1 space-y-1 overflow-x-hidden overflow-y-auto py-3 px-3 ${sidebarCollapsed ? "lg:px-2" : ""}`}>
            <p className={`whitespace-nowrap px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-white/40 ${sidebarCollapsed ? "lg:hidden" : ""}`}>Manage</p>
            {adminLinks.filter((l) => !l.perm || can(user.role, l.perm)).map((l) => (
              <NavLink key={l.to} to={l.to} end title={sidebarCollapsed ? (l.to === "/admin/inquiries" && dash?.newInquiries ? `${l.label}, ${dash.newInquiries} new` : l.label) : undefined} aria-label={sidebarCollapsed ? (l.to === "/admin/inquiries" && dash?.newInquiries ? `${l.label}, ${dash.newInquiries} new` : l.label) : undefined} className={({ isActive }) => `${link({ isActive })} ${sidebarCollapsed ? "relative lg:justify-center lg:px-0" : ""}`} onClick={() => setOpen(false)}>
                <Icon name={l.icon} className="h-[18px] w-[18px] shrink-0" /><span className={`whitespace-nowrap ${sidebarCollapsed ? "lg:hidden" : ""}`}>{l.label}</span>
                {l.to === "/admin/inquiries" && !!dash?.newInquiries && (
                  <span aria-hidden="true" className={`grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[.65rem] font-bold leading-none tabular-nums text-navy ring-2 ring-navy ${sidebarCollapsed ? "absolute -right-0.5 -top-0.5 lg:h-4 lg:min-w-4 lg:text-[.6rem] lg:ring-1" : "ml-auto"}`}>
                    {dash.newInquiries > 99 ? "99+" : dash.newInquiries}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className={`space-y-1 border-t border-white/10 py-3 px-3 ${sidebarCollapsed ? "lg:px-2" : ""}`}>
            <NavLink to="/admin/account" title={sidebarCollapsed ? "My account" : undefined} aria-label={sidebarCollapsed ? "My account" : undefined} className={({ isActive }) => `${link({ isActive })} ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`} onClick={() => setOpen(false)}>
              <Icon name="key" className="h-[18px] w-[18px] shrink-0" /><span className={`whitespace-nowrap ${sidebarCollapsed ? "lg:hidden" : ""}`}>My account</span>
            </NavLink>
            <a href="/" title={sidebarCollapsed ? "View site" : undefined} aria-label={sidebarCollapsed ? "View site" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}>
              <Icon name="external" className="h-[18px] w-[18px] shrink-0" /><span className={`whitespace-nowrap ${sidebarCollapsed ? "lg:hidden" : ""}`}>View site</span>
            </a>
            <div className={`flex items-center gap-3 rounded-lg bg-white/5 p-3 ${sidebarCollapsed ? "lg:flex-col lg:gap-1 lg:p-1.5" : ""}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold">{initial}</span>
              <div className={`min-w-0 flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
                <p className="truncate text-sm font-medium">{user.name ?? "Administrator"}</p>
                <p className="truncate text-xs capitalize text-white/50">{role}</p>
              </div>
              <button onClick={() => setConfirmLogout(true)} title="Sign out" aria-label="Sign out" className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white">
                <Icon name="logout" className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </aside>

        <div className={`admin-workspace transition-[padding] duration-300 ease-in-out motion-reduce:transition-none ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}>
          <header className="admin-topbar sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
            <button type="button" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((current) => !current)} className="hidden rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:inline-flex">
              <span className="sr-only">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 transition-transform duration-300 motion-reduce:transition-none ${sidebarCollapsed ? "rotate-180" : ""}`}>
                <path d="m14 6-6 6 6 6" />
              </svg>
            </button>
            <span className="hidden text-sm font-medium text-slate-500 sm:inline">Admin console</span>
            <nav aria-label="Admin shortcuts" className="admin-top-links hidden items-center gap-1 xl:flex">
              <NavLink to="/admin" end className={({ isActive }) => `admin-top-link ${isActive ? "active" : ""}`}>Dashboard</NavLink>
              {can(user.role, "inquiries.view") && <NavLink to="/admin/inquiries" className={({ isActive }) => `admin-top-link ${isActive ? "active" : ""}`}>Inquiries</NavLink>}
              {can(user.role, "content.edit") && <NavLink to="/admin/services" className={({ isActive }) => `admin-top-link ${isActive ? "active" : ""}`}>Content</NavLink>}
              {can(user.role, "audit.view") && <NavLink to="/admin/activity" className={({ isActive }) => `admin-top-link ${isActive ? "active" : ""}`}>Activity</NavLink>}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {can(user.role, "inquiries.view") && <Link to="/admin/inquiries" className="admin-icon-link relative" aria-label="Search inquiries" title="Search inquiries">
                <Icon name="search" className="h-5 w-5" />
              </Link>}
              {can(user.role, "inquiries.view") && <Link to="/admin/inquiries" className="admin-icon-link relative" aria-label={`Notifications${dash?.newInquiries ? `, ${dash.newInquiries} new inquiries` : ""}`} title="New inquiries">
                <Icon name="bell" className="h-5 w-5" />
                {!!dash?.newInquiries && <span className="admin-notification-dot">{dash.newInquiries > 99 ? "99+" : dash.newInquiries}</span>}
              </Link>}
              <button type="button" aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} title={darkMode ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={darkMode} onClick={() => setDarkMode((current) => !current)} className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`absolute h-5 w-5 motion-safe:transition-all motion-safe:duration-300 ${darkMode ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`}>
                  <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </svg>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`absolute h-5 w-5 motion-safe:transition-all motion-safe:duration-300 ${darkMode ? "-rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}>
                  <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
                </svg>
                <span className="sr-only">{darkMode ? "Switch to light mode" : "Switch to dark mode"}</span>
              </button>
              <details className="admin-profile">
                <summary aria-label="Open profile menu">
                  <span className="admin-avatar">{initial}</span>
                  <span className="hidden max-w-32 truncate text-left text-sm font-semibold text-slate-700 sm:block">{user.name ?? "Administrator"}</span>
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400"><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                </summary>
                <div className="admin-profile-menu">
                  <p className="truncate px-3 py-2 text-xs font-medium text-slate-500">{role}</p>
                  <Link to="/admin/account" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>My account</Link>
                  <button type="button" onClick={() => setConfirmLogout(true)}>Sign out</button>
                </div>
              </details>
            </div>
          </header>
          <main className="admin-main mx-auto max-w-[1440px] p-4 sm:p-8"><Outlet /></main>
        </div>
        {confirmLogout && <Confirm title="Sign out?" message="You will need to sign in again to access the admin dashboard." onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); logout(); }} />}
      </div>
    </ToastProvider>
  );
}

function AdminLoginRedirect() {
  useEffect(() => {
    window.location.replace("/admin/login");
  }, []);
  return <div className="grid min-h-screen place-items-center text-slate-500">Redirecting to sign in…</div>;
}

/* ───────── dashboard ───────── */
function Stat({ label: l, value, icon, tone, loading, to }: { label: string; value?: number; icon: IconName; tone: string; loading: boolean; to: string }) {
  return (
    <Link to={to} className={`${card} group block p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{l}</span>
        <span className={`grid h-10 w-10 place-items-center rounded-xl transition-transform group-hover:scale-105 ${tone}`}><Icon name={icon} /></span>
      </div>
      <div className="mt-3 font-heading text-3xl font-bold text-navy">
        {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-200" /> : value ?? "–"}
      </div>
      <span className="mt-1 block text-xs text-slate-400">View details <span aria-hidden="true">↗</span></span>
    </Link>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const canReadInquiries = can(user?.role, "inquiries.view");
  const canManageContent = can(user?.role, "content.edit");
  const canReadBranches = can(user?.role, "branches.view");
  const canManageUsers = can(user?.role, "users.manage");
  const canReadActivity = can(user?.role, "audit.view");
  const queryClient = useQueryClient();
  const dash = useDash();
  const inq = useInquiries(canReadInquiries);
  const audit = useQuery({
    queryKey: ["audit", "all", 1],
    enabled: canReadActivity,
    queryFn: () => api<{ items: { _id: string; createdAt: string; actor: { name?: string; email?: string } | null; action: string; meta?: Record<string, unknown> }[] }>(
      "/admin/audit-logs?page=1&limit=5&actor=all",
    ),
  });
  const content: { type: ContentType; icon: IconName; q: ReturnType<typeof useContent> }[] = [
    { type: "services", icon: "services", q: useContent("services", canManageContent) },
    { type: "products", icon: "products", q: useContent("products", canManageContent) },
    { type: "faqs", icon: "faqs", q: useContent("faqs", canManageContent) },
  ];
  const data = dash.data;
  const total = data?.byStatus.reduce((n, s) => n + s.count, 0) ?? 0;
  const drafts = canManageContent ? content.reduce((n, c) => n + (c.q.data ?? []).filter((d) => !d.published).length, 0) : 0;
  const contentLoading = canManageContent && content.some((c) => c.q.isLoading);
  const contentFailed = canManageContent && content.some((c) => c.q.isError);
  const recent = [...(inq.data?.items ?? [])].sort((a, b) => time(b.createdAt) - time(a.createdAt)).slice(0, 5);
  const recentContent = content.flatMap((c) => (c.q.data ?? []).map((item) => ({
    ...item, type: c.type, title: item.title ?? item.question,
  }))).sort((a, b) => time(b.updatedAt ?? b.createdAt) - time(a.updatedAt ?? a.createdAt)).slice(0, 5);
  const publishedServices = content[0].q.data?.filter((item) => item.published).length ?? 0;
  const publishedProducts = content[1].q.data?.filter((item) => item.published).length ?? 0;
  const activity = data?.inquiryActivity ?? [];
  const activityDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, count: activity.find((day) => day._id === key)?.count ?? 0, label: date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }) };
  });
  const maxActivity = Math.max(1, ...activityDays.map((day) => day.count));

  return (
    <section>
      <PageHeader title={`Welcome back, ${user?.name ?? "Administrator"}`} subtitle={
        user?.role === "staff" ? "Review and respond to inquiries for your assigned branches."
          : user?.role === "branch_manager" ? "Monitor your assigned branches and manage their inquiries."
          : user?.role === "content_manager" ? "Manage website content and view your assigned branches."
          : "Here's what's happening across Cosmopolitan Funeral Homes today."
      } />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        <div className="flex flex-wrap gap-2">
          {canReadInquiries && <Link to="/admin/inquiries" className={btnPrimary}><Icon name="inquiries" className="h-4 w-4" />Review inquiries</Link>}
          {canReadBranches && <Link to="/admin/branches" className={btnGhost}><Icon name="plus" className="h-4 w-4" />Add branch</Link>}
          {canManageContent && <Link to="/admin/services" className={btnGhost}><Icon name="plus" className="h-4 w-4" />Add service</Link>}
          {canManageContent && <Link to="/admin/products" className={btnGhost}><Icon name="products" className="h-4 w-4" />Add product</Link>}
          {canManageContent && <Link to="/admin/faqs" className={btnGhost}><Icon name="faqs" className="h-4 w-4" />Manage FAQs</Link>}
          {canManageUsers && <Link to="/admin/users" className={btnGhost}><Icon name="users" className="h-4 w-4" />Manage users</Link>}
          <button type="button" onClick={() => void queryClient.invalidateQueries()} className={btnGhost}><Icon name="activity" className="h-4 w-4" />Refresh</button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canReadBranches && <>
          <Stat label="Total branches" value={data?.totalBranches ?? undefined} icon="branches" tone="bg-blue-50 text-blue-600" loading={dash.isLoading} to="/admin/branches" />
          <Stat label="Active branches" value={data?.branches ?? undefined} icon="branches" tone="bg-teal-50 text-teal-600" loading={dash.isLoading} to="/admin/branches" />
        </>}
        {canReadInquiries && <>
          <Stat label="New inquiries" value={data?.newInquiries ?? undefined} icon="inquiries" tone="bg-sky-50 text-sky-600" loading={dash.isLoading} to="/admin/inquiries" />
          <Stat label="Total inquiries" value={total} icon="dashboard" tone="bg-violet-50 text-violet-600" loading={dash.isLoading} to="/admin/inquiries" />
        </>}
        {canManageContent && <>
          <Stat label="Published services" value={publishedServices} icon="services" tone="bg-rose-50 text-rose-600" loading={contentLoading} to="/admin/services" />
          <Stat label="Published products" value={publishedProducts} icon="products" tone="bg-indigo-50 text-indigo-600" loading={contentLoading} to="/admin/products" />
          <Stat label="Pending approvals" value={drafts} icon="edit" tone="bg-amber-50 text-amber-600" loading={contentLoading} to="/admin/services" />
        </>}
        {canManageUsers && <Stat label="Registered users" value={data?.users ?? undefined} icon="users" tone="bg-slate-100 text-slate-600" loading={dash.isLoading} to="/admin/users" />}
      </div>
      {dash.isError && <Err msg="Could not load dashboard statistics. Try refreshing the page." />}
      {inq.isError && canReadInquiries && <Err msg="Could not load recent inquiries. You can try again from the inquiries page." />}
      {contentFailed && <Err msg="Could not load the content overview. Try refreshing the page." />}
      {audit.isError && canReadActivity && <Err msg="Could not load recent activity. Visit the activity page to try again." />}

      {canReadInquiries && <div className={`${card} mt-6 p-5`}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-heading text-lg font-bold text-navy">Inquiry activity</h2><p className="mt-1 text-xs text-slate-500">Daily inquiries over the last 14 days</p></div>
          <span className="text-xs text-slate-400">{activity.reduce((sum, day) => sum + day.count, 0)} received</span>
        </div>
        {dash.isLoading ? <Loading /> : <div className="overflow-x-auto"><div className="grid h-36 min-w-[560px] grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-2" role="img" aria-label="Daily inquiry counts for the last 14 days">
          {activityDays.map((day) => <div key={day.key} className="flex h-full flex-col items-center justify-end gap-2" title={`${day.label}: ${day.count} inquiries`}>
            <div className="w-full max-w-8 rounded-t bg-brand/80 transition-[height] duration-500" style={{ height: `${Math.max(day.count ? 8 : 2, day.count / maxActivity * 100)}%` }} />
            <span className="text-[10px] text-slate-400">{day.label.split(" ")[1]}</span>
          </div>)}
        </div></div>}
      </div>}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {canReadInquiries && <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-heading text-lg font-bold text-navy">Recent inquiries</h2>
            <Link to="/admin/inquiries" className="text-sm font-medium text-brand hover:underline">View all</Link>
          </div>
          {inq.isLoading ? <Loading /> : !recent.length ? <Empty>No inquiries yet.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {recent.map((i) => (
                <li key={i._id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{i.subject}</p>
                    <p className="truncate text-xs text-slate-500">{i.name} · {i.email || i.phone || i.reference} · {when(i.createdAt)}</p>
                  </div>
                  <Badge tone={statusTone[i.status] ?? "slate"}>{label(i.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        }

        <div className="space-y-4">
          {canReadInquiries && <div className={`${card} p-5`}>
            <h2 className="font-heading text-lg font-bold text-navy">Inquiries by status</h2>
            {dash.isLoading ? <Loading /> : !data?.byStatus.length ? <Empty>No data yet.</Empty> : (
              <ul className="mt-4 space-y-3">
                {data.byStatus.map((s) => (
                  <li key={s._id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <Badge tone={statusTone[s._id] ?? "slate"}>{label(s._id)}</Badge>
                      <span className="font-medium text-slate-600">{s.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${total ? (s.count / total) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>}

          {canManageContent && <div className={`${card} p-5`}>
            <h2 className="font-heading text-lg font-bold text-navy">Content</h2>
            <ul className="mt-3 space-y-1">
              {content.map((c) => {
                const items = c.q.data ?? [];
                return (
                  <li key={c.type}>
                    <Link to={`/admin/${c.type}`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-slate-50">
                      <Icon name={c.icon} className="h-4 w-4 text-slate-400" />
                      <span className="capitalize">{c.type}</span>
                      <span className="ml-auto text-slate-500">{items.filter((d) => d.published).length}/{items.length} live</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>}
        </div>
      </div>

      {canReadActivity && <div className={`${card} mt-6 overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-heading text-lg font-bold text-navy">Recent activity</h2><p className="mt-1 text-xs text-slate-500">Latest changes made by your team</p></div>
          <Link to="/admin/activity" className="text-sm font-medium text-brand hover:underline">View all</Link>
        </div>
        {audit.isLoading ? <Loading /> : !audit.data?.items.length ? <Empty>No recent activity.</Empty> : (
          <ul className="divide-y divide-slate-100">
            {audit.data.items.slice(0, 5).map((entry) => (
              <li key={entry._id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><Icon name="activity" className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{entry.actor?.name ?? entry.actor?.email ?? "System"} <span className="font-normal text-slate-500">{entry.action.replace(/[._]/g, " ")}</span></p>
                  <p className="mt-0.5 text-xs capitalize text-slate-500">{entry.action.split(".")[0]} · {when(entry.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>}

      {canManageContent && <div className={`${card} mt-6 overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-navy">Recently updated content</h2>
            <p className="mt-1 text-xs text-slate-500">Latest services, products, and FAQs</p>
          </div>
        </div>
        {contentLoading ? <Loading /> : recentContent.length ? (
          <ul className="divide-y divide-slate-100">
            {recentContent.map((item) => (
              <li key={`${item.type}-${item._id}`}>
                <Link to={`/admin/${item.type}`} className="flex flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                  <Icon name={content.find((c) => c.type === item.type)!.icon} className="h-4 w-4 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                    <span className="text-xs capitalize text-slate-500">{item.type} · {when(item.updatedAt ?? item.createdAt)}</span>
                  </span>
                  <Badge tone={item.published ? "green" : "amber"}>{item.published ? "Published" : "Draft"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>No content yet. Add a service, product, or FAQ to get started.</Empty>}
      </div>}
    </section>
  );
}

/* ───────── branches ───────── */
const BRANCH_FIELDS = ["code", "name", "address", "municipality", "province", "phone", "hours"];

function BranchForm({ initial, busy, err, submitLabel, onSubmit }: { initial?: any; busy: boolean; err: string; submitLabel: string; onSubmit: (b: object) => Promise<void> }) {
  const [latitude, setLatitude] = useState(String(initial?.lat ?? initial?.location?.coordinates?.[1] ?? ""));
  const [longitude, setLongitude] = useState(String(initial?.lng ?? initial?.location?.coordinates?.[0] ?? ""));
  const [pinAccuracy, setPinAccuracy] = useState<"mapped" | "approximate">(initial?.pinAccuracy ?? "approximate");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(initial?.image ?? "");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [formError, setFormError] = useState("");
  useEffect(() => {
    if (!photo) {
      setPhotoPreview(initial?.image ?? "");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo, initial?.image]);

  const locateAddress = async (form: HTMLFormElement | null) => {
    if (!form) return;
    const values = new FormData(form);
    const query = ["address", "municipality", "province"].map((key) => String(values.get(key) ?? "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
    if (query.replace(/\s/g, "").length < 3) {
      setLookupMessage("Enter a branch address or city first.");
      return;
    }
    setLookupBusy(true);
    setLookupMessage("");
    try {
      const { result } = await api<{ result: { lat: number; lng: number; displayName: string; pinAccuracy: "mapped" | "approximate" } | null }>("/admin/branch-geocode", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      if (!result) {
        setLookupMessage("No address match found. Refine the address or enter coordinates manually.");
        return;
      }
      setLatitude(String(result.lat));
      setLongitude(String(result.lng));
      setPinAccuracy(result.pinAccuracy);
      setLookupMessage(`${result.pinAccuracy === "mapped" ? "Address-level" : "Approximate area"} match: ${result.displayName}`);
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : "Address lookup failed. Enter coordinates manually.");
    } finally {
      setLookupBusy(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || submitting) return;
    const f = new FormData(e.currentTarget);
    const b: any = Object.fromEntries(f);
    b.lat = Number(latitude); b.lng = Number(longitude); b.pinAccuracy = pinAccuracy; b.verified = f.get("verified") === "on";
    Object.keys(b).forEach((k) => b[k] === "" && delete b[k]);
    setFormError("");
    setSubmitting(true);
    let uploadedImageId: string | undefined;
    try {
      if (photo) {
        const uploaded = await api<{ id: string }>("/admin/branch-images", {
          method: "POST",
          headers: { "Content-Type": photo.type },
          body: photo,
        });
        uploadedImageId = uploaded.id;
        b.image = apiAssetUrl(`/public/branch-images/${uploaded.id}`);
      } else if (initial?.image) {
        b.image = initial.image;
      }
      await onSubmit(b);
    } catch (error) {
      if (uploadedImageId) {
        try {
          await api(`/admin/branch-images/${uploadedImageId}`, { method: "DELETE" });
        } catch (cleanupError) {
          console.error("Could not remove the unused branch photo upload.", cleanupError);
        }
      }
      setFormError(error instanceof Error ? error.message : "Could not save the branch.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Enter an address and use Find coordinates, or enter coordinates manually. Review the pin accuracy before making this branch public.</p>
      {BRANCH_FIELDS.map((n) => (
        <label key={n} className={labelCls}>{n}{(n === "code" || n === "name") && <span aria-hidden className="text-red-600"> *</span>}<input name={n} defaultValue={initial?.[n] ?? ""} required={n === "code" || n === "name"} className={input} /></label>
      ))}
      <div className="sm:col-span-2">
        <label className={labelCls}>Branch photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
          const file = e.currentTarget.files?.[0] ?? null;
          if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setFormError("Choose a JPEG, PNG, or WebP image.");
            e.currentTarget.value = "";
            setPhoto(null);
            return;
          }
          if (file && (file.size === 0 || file.size > 5 * 1024 * 1024)) {
            setFormError("Choose a non-empty image smaller than 5 MB.");
            e.currentTarget.value = "";
            setPhoto(null);
            return;
          }
          setFormError("");
          setPhoto(file);
        }} className={`${input} file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700`} /></label>
        <p className="mt-1 text-xs text-slate-500">JPEG, PNG, or WebP · up to 5 MB</p>
        {photoPreview && <img src={photoPreview} alt="Branch photo preview" className="mt-3 h-36 w-full rounded-xl border border-slate-200 object-cover sm:w-64" />}
      </div>
      <div className="flex items-end sm:col-span-2">
        <button type="button" disabled={lookupBusy} onClick={(e) => void locateAddress(e.currentTarget.form)} className={btnGhost}>
          <Icon name="branches" className="h-4 w-4" />{lookupBusy ? "Finding coordinates…" : "Find coordinates from address"}
        </button>
      </div>
      {lookupMessage && <p role="status" className="text-xs leading-5 text-slate-500 sm:col-span-2">{lookupMessage}</p>}
      <label className={labelCls}>Latitude<span aria-hidden className="text-red-600"> *</span><input name="lat" type="number" step="any" min={-90} max={90} required value={latitude} onChange={(e) => setLatitude(e.target.value)} className={input} /></label>
      <label className={labelCls}>Longitude<span aria-hidden className="text-red-600"> *</span><input name="lng" type="number" step="any" min={-180} max={180} required value={longitude} onChange={(e) => setLongitude(e.target.value)} className={input} /></label>
      <label className={labelCls}>Pin accuracy<select name="pinAccuracy" value={pinAccuracy} onChange={(e) => setPinAccuracy(e.target.value as "mapped" | "approximate")} className={input}><option value="mapped">Mapped address</option><option value="approximate">Approximate area</option></select></label>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" name="verified" defaultChecked={!!initial?.verified} className="h-4 w-4 rounded border-slate-300" /> Details and coordinates verified (show publicly)</label>
      <div className="sm:col-span-2"><Err msg={formError || err} /></div>
      <div className="sm:col-span-2"><button disabled={busy || submitting || lookupBusy} className={btnPrimary}>{(busy || submitting) && <Spinner />}{busy || submitting ? "Saving…" : submitLabel}</button></div>
    </form>
  );
}

export function AdminBranches() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = can(user?.role, "branches.edit");
  const { data, isLoading } = useBranches();
  const [q, setQ] = useState("");
  const [vis, setVis] = useState<"all" | "public" | "hidden">("all");
  const [branchStatus, setBranchStatus] = useState<"all" | "active" | "inactive" | "archived">("all");
  const [modal, setModal] = useState<any>(null); // "new" or the branch being edited
  const [ask, setAsk] = useState<{ title: string; message: string; run: () => void } | null>(null);
  const [err, setErr] = useState("");

  const done = (msg: string) => () => { qc.invalidateQueries({ queryKey: ["ab"] }); qc.invalidateQueries({ queryKey: ["dash"] }); setModal(null); setErr(""); toast(msg); };
  const fail = (e: Error) => { setErr(e.message); toast(e.message, "err"); };
  const create = useMutation({ mutationFn: (b: object) => api("/admin/branches", { method: "POST", body: JSON.stringify(b) }), onSuccess: done("Branch added"), onError: fail });
  const update = useMutation({ mutationFn: (v: { id: string; b: object }) => api(`/admin/branches/${v.id}`, { method: "PATCH", body: JSON.stringify(v.b) }), onSuccess: done("Branch updated"), onError: fail });
  const remove = useMutation({ mutationFn: (id: string) => api(`/admin/branches/${id}`, { method: "DELETE" }), onSuccess: done("Branch archived"), onError: fail });

  const items = (data?.items ?? []).filter((b) =>
    (vis === "all" || (vis === "public") === !!b.verified) &&
    (branchStatus === "all" || b.status === branchStatus) &&
    `${b.code} ${b.name} ${b.address ?? ""} ${b.municipality ?? ""} ${b.province ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const pg = usePaged(items, 8);
  const exportCsv = () => downloadCsv("branches.csv", items.map((b) => ({ code: b.code, name: b.name, address: b.address, municipality: b.municipality, province: b.province, phone: b.phone, hours: b.hours, status: b.status, public: b.verified ? "yes" : "no", lat: b.lat, lng: b.lng })));

  return (
    <section>
      <PageHeader title="Branches" subtitle={`${data?.items.length ?? 0} in total`}
        action={<>
          <button className={btnGhost} onClick={exportCsv} disabled={!items.length}><Icon name="download" className="h-4 w-4" />Export CSV</button>
          {canEdit && <button className={btnPrimary} onClick={() => { setErr(""); setModal("new"); }}><Icon name="plus" className="h-4 w-4" />Add branch</button>}
        </>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search branches…" />
        <select value={vis} onChange={(e) => { setVis(e.target.value as typeof vis); pg.setPage(1); }} aria-label="Visibility filter"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
          <option value="all">All visibility</option><option value="public">Public</option><option value="hidden">Hidden</option>
        </select>
        <select value={branchStatus} onChange={(e) => { setBranchStatus(e.target.value as typeof branchStatus); pg.setPage(1); }} aria-label="Branch status filter"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
          <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
        </select>
      </div>

      <div className={`${card} overflow-hidden`}>
        {isLoading ? <Loading /> : !pg.total ? <Empty>{data?.items.length ? "No branches match your filters." : "No branches yet. Add your first one."}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3 font-semibold">Branch</th><th className="px-5 py-3 font-semibold">Location</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Visibility</th>{canEdit && <th className="px-5 py-3 text-right font-semibold">Actions</th>}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pg.rows.map((b) => (
                  <tr key={b._id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {b.image ? <img src={b.image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-400"><Icon name="branches" /></span>}
                        <div><div className="font-medium text-slate-900">{b.name}</div><div className="text-xs text-slate-500">{b.code}</div></div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{[b.municipality, b.province].filter(Boolean).join(", ") || "–"}</td>
                    <td className="px-5 py-3"><Badge tone={b.status === "active" ? "green" : "slate"}>{b.status}</Badge></td>
                    <td className="px-5 py-3">{b.verified ? <Badge tone="green">Public</Badge> : <Badge tone="amber">Hidden · unverified</Badge>}</td>
                    {canEdit && <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button className={iconBtn} title="Edit" aria-label={`Edit ${b.name}`} onClick={() => { setErr(""); setModal(b); }}><Icon name="edit" className="h-4 w-4" /></button>
                        <button className={iconBtn} title={b.verified ? "Hide from public" : "Show publicly"} aria-label={b.verified ? `Hide ${b.name}` : `Show ${b.name}`} onClick={() => {
                          setErr("");
                          update.mutate({
                            id: b._id,
                            b: {
                              code: b.code,
                              name: b.name,
                              address: b.address ?? "",
                              municipality: b.municipality ?? "",
                              province: b.province ?? "",
                              phone: b.phone ?? "",
                              hours: b.hours ?? "",
                              image: b.image ?? "",
                              pinAccuracy: b.pinAccuracy ?? "approximate",
                              lat: b.location.coordinates[1],
                              lng: b.location.coordinates[0],
                              status: b.status,
                              verified: !b.verified,
                            },
                          });
                        }}><Icon name="eye" className="h-4 w-4" /></button>
                        {b.status !== "archived" && <button className={`${iconBtn} text-red-600 hover:bg-red-50 hover:text-red-700`} title="Archive" aria-label={`Archive ${b.name}`}
                          onClick={() => setAsk({ title: "Archive branch?", message: `“${b.name}” will be hidden from the public site. Its inquiries and history will be preserved.`, run: () => remove.mutate(b._id) })}><Icon name="trash" className="h-4 w-4" /></button>}
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager {...pg} />
      </div>

      {canEdit && modal && (
        <Drawer title={modal === "new" ? "Add branch" : `Edit ${modal.name}`} onClose={() => setModal(null)} maxW="max-w-2xl">
          <BranchForm initial={modal === "new" ? undefined : modal} busy={create.isPending || update.isPending} err={err}
            submitLabel={modal === "new" ? "Save branch" : "Save changes"}
            onSubmit={async (b) => {
              if (modal === "new") await create.mutateAsync(b);
              else await update.mutateAsync({ id: modal._id, b });
            }} />
        </Drawer>
      )}
      {ask && <Confirm title={ask.title} message={ask.message} onCancel={() => setAsk(null)} onConfirm={() => { ask.run(); setAsk(null); }} />}
    </section>
  );
}

/* ───────── inquiries ───────── */
export function AdminInquiries() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const canUpdate = can(user?.role, "inquiries.update");
  const canExport = can(user?.role, "inquiries.export");
  const { data, isLoading } = useInquiries();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const set = useMutation({
    mutationFn: (v: { id: string; status: string }) => api<{
      emailNotification: "sent" | "failed" | "not_available" | "not_needed" | "daily_limit_reached";
      smsNotification: "queued" | "failed" | "invalid_credentials" | "device_not_found" | "network_error" | "timeout" | "not_configured" | "not_opted_in" | "not_needed" | "daily_limit_reached";
    }>(`/admin/inquiries/${v.id}/status`, { method: "PATCH", body: JSON.stringify({ status: v.status }) }),
    onSuccess: ({ emailNotification, smsNotification }) => {
      qc.invalidateQueries({ queryKey: ["ai"] }); qc.invalidateQueries({ queryKey: ["dash"] });
      if (emailNotification === "not_needed") return toast("The inquiry already has that status.");
      const emailResult = emailNotification === "sent" ? "Email sent"
        : emailNotification === "failed" ? "Email delivery failed; check the API logs."
        : emailNotification === "daily_limit_reached" ? "Email not sent; the daily paid API limit was reached."
        : "No customer email";
      const smsResult = smsNotification === "queued" ? "SMS queued by TextBee; delivery may still be pending"
        : smsNotification === "failed" ? "TextBee could not queue the SMS; check the API logs."
        : smsNotification === "invalid_credentials" ? "TextBee rejected its API key; replace TEXTBEE_API_KEY and restart the API."
        : smsNotification === "device_not_found" ? "TextBee could not find TEXTBEE_DEVICE_ID for this API key. Verify it belongs to the same TextBee account, or clear it to use the default device."
        : smsNotification === "network_error" ? "The API could not connect to TextBee; check the server internet connection, DNS, or firewall."
        : smsNotification === "timeout" ? "The TextBee request timed out; check TextBee availability and try another status change."
        : smsNotification === "not_configured" ? "TextBee SMS is not configured"
        : smsNotification === "daily_limit_reached" ? "SMS not sent; the daily paid API limit was reached."
        : smsNotification === "not_opted_in" ? "Customer did not opt in to SMS"
        : "";
      toast(`Status updated. ${emailResult}. ${smsResult}.`);
    },
    onError: (e: Error) => toast(e.message, "err"),
  });

  const all = data?.items ?? [];
  const count = (s: string) => (s === "all" ? all.length : all.filter((i) => i.status === s).length);
  const items = all
    .filter((i) => (filter === "all" || i.status === filter) &&
      `${i.reference} ${i.subject} ${i.name} ${i.email ?? ""} ${i.phone ?? ""} ${i.message}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => time(b.createdAt) - time(a.createdAt));
  const pg = usePaged(items, 6);
  const now = Date.now();
  const recentCutoff = now - 24 * 60 * 60 * 1000;
  const isRecent = (createdAt?: string) => {
    const created = time(createdAt);
    return created > recentCutoff && created <= now;
  };
  const recentCount = all.filter((i) => isRecent(i.createdAt)).length;
  const statusStyles: Record<string, string> = {
    new: "border-l-sky-400",
    in_review: "border-l-amber-400",
    contacted: "border-l-violet-400",
    resolved: "border-l-emerald-400",
    closed: "border-l-slate-400",
  };
  const exportCsv = () => downloadCsv("inquiries.csv", items.map((i) => ({ reference: i.reference, date: when(i.createdAt), status: i.status, subject: i.subject, name: i.name, email: i.email, phone: i.phone, message: i.message })));

  return (
    <section>
      <PageHeader title="Inquiries" subtitle={`${all.length} total · ${recentCount} received in the last 24 hours`}
        action={canExport && <button className={btnGhost} onClick={exportCsv} disabled={!items.length}><Icon name="download" className="h-4 w-4" />Export CSV</button>} />

      <div className={`${card} mb-5 space-y-4 p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBox value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search name, reference, message…" />
          <p className="text-sm text-slate-500">{items.length} matching {items.length === 1 ? "inquiry" : "inquiries"}</p>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter inquiries by status">
          {["all", ...STATUSES].map((s) => (
            <button key={s} onClick={() => { setFilter(s); pg.setPage(1); }} aria-pressed={filter === s}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${filter === s ? "bg-navy text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
              {label(s)}
              <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${filter === s ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{count(s)}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <div className={card}><Loading /></div> : !pg.total ? <div className={card}><Empty>{user?.role === "staff" || user?.role === "branch_manager" ? "No inquiries are available for your assigned branches yet. Ask an administrator to review your branch assignments." : "No inquiries match."}</Empty></div> : (
        <div className="space-y-3">
          {pg.rows.map((i) => (
            <article key={i._id} className={`${card} overflow-hidden border-l-4 ${statusStyles[i.status] ?? "border-l-slate-300"} ${isRecent(i.createdAt) ? "bg-amber-50/60 ring-1 ring-amber-200" : ""} transition-shadow hover:shadow-md`}>
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-semibold text-slate-900">{i.subject}</h2>
                      {isRecent(i.createdAt) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Recent</span>}
                      <Badge tone={statusTone[i.status] ?? "slate"}>{label(i.status)}</Badge>
                      {i.category && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{label(i.category)}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="rounded bg-slate-50 px-2 py-1 font-mono font-medium text-slate-600">{i.reference}</span>
                      {i.createdAt && <time dateTime={i.createdAt}>{when(i.createdAt)}</time>}
                    </div>
                  </div>
                  {canUpdate && <label className="block shrink-0">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Update status</span>
                    <select value={i.status} disabled={set.isPending} onChange={(e) => set.mutate({ id: i._id, status: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60 sm:w-40">
                      {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </label>}
                </div>

                <p className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{i.message}</p>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{i.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {i.email && <span className="break-all">{i.email}</span>}
                      {i.phone && <a className="hover:text-brand hover:underline" href={`tel:${i.phone}`}>{i.phone}</a>}
                    </div>
                  </div>
                  {i.branch?.name && <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand/[.04] px-2.5 py-1.5 text-xs font-medium text-brand">
                    <Icon name="branches" className="h-3.5 w-3.5" />{i.branch.name}
                  </span>}
                </div>
              </div>
            </article>
          ))}
          <div className={`${card} overflow-hidden`}>
            <Pager {...pg} showSinglePage />
          </div>
        </div>
      )}
    </section>
  );
}

/* ───────── services / products / faqs ───────── */
const FIELDS: Record<string, { name: string; label: string; area?: boolean; list?: boolean }[]> = {
  services: [{ name: "title", label: "Title" }, { name: "description", label: "Description", area: true }, { name: "price", label: "Price or range" }, { name: "image", label: "Image URL" }],
  products: [{ name: "title", label: "Title" }, { name: "category", label: "Category" }, { name: "description", label: "Description", area: true }, { name: "price", label: "Price" }, { name: "image", label: "Image URL" }, { name: "inclusions", label: "Inclusions (comma separated)", list: true }],
  faqs: [{ name: "question", label: "Question" }, { name: "answer", label: "Answer", area: true }],
};

function ContentForm({ type, initial, busy, err, submitLabel, onSubmit }: { type: ContentType; initial?: any; busy: boolean; err: string; submitLabel: string; onSubmit: (b: object) => void }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const b: any = {};
    FIELDS[type].forEach((x) => { const v = String(f.get(x.name) ?? "").trim(); if (v) b[x.name] = x.list ? v.split(",").map((s) => s.trim()).filter(Boolean) : v; });
    b.published = f.get("published") === "on";
    onSubmit(b);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-xs leading-5 text-slate-500">Fields marked * are required. Unpublished items remain drafts and are not shown on the public site.</p>
      {FIELDS[type].map((x) => {
        const v = initial?.[x.name];
        const dv = Array.isArray(v) ? v.join(", ") : v ?? "";
        return (
          <label key={x.name} className={labelCls}>{x.label}{(x.name === "title" || x.name === "question") && <span aria-hidden className="text-red-600"> *</span>}
            {x.area
              ? <textarea name={x.name} rows={4} defaultValue={dv} className={input} required={x.name !== "description"} />
              : <input name={x.name} defaultValue={dv} className={input} required={x.name === "title" || x.name === "question"} />}
          </label>
        );
      })}
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="published" defaultChecked={!!initial?.published} className="h-4 w-4 rounded border-slate-300" /> Published</label>
      <Err msg={err} />
      <button disabled={busy} className={btnPrimary}>{busy && <Spinner />}{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}

// key={type} resets search, selection and modals when you switch between Services / Products / FAQs
export function AdminContent({ type }: { type: ContentType }) {
  return <ContentPage key={type} type={type} />;
}

function ContentPage({ type }: { type: ContentType }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useContent(type);
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | "published" | "draft">("all");
  const [sel, setSel] = useState<string[]>([]);
  const [modal, setModal] = useState<any>(null); // "new" or the item being edited
  const [ask, setAsk] = useState<{ title: string; message: string; run: () => void } | null>(null);
  const [err, setErr] = useState("");

  const inv = () => { qc.invalidateQueries({ queryKey: ["c", type] }); };
  const fail = (e: Error) => { setErr(e.message); toast(e.message, "err"); };
  const create = useMutation({ mutationFn: (b: object) => api(`/admin/${type}`, { method: "POST", body: JSON.stringify(b) }), onSuccess: () => { inv(); setModal(null); setErr(""); toast("Created"); }, onError: fail });
  const patch = useMutation({ mutationFn: (v: { id: string; b: object; close?: boolean }) => api(`/admin/${type}/${v.id}`, { method: "PATCH", body: JSON.stringify(v.b) }), onSuccess: (_d, v) => { inv(); if (v.close) { setModal(null); setErr(""); } toast("Saved"); }, onError: fail });
  const bulk = useMutation({
    mutationFn: async (v: { ids: string[]; action: "publish" | "unpublish" | "archive" }) => {
      await Promise.all(v.ids.map((id) => v.action === "archive"
        ? api(`/admin/${type}/${id}`, { method: "DELETE" })
        : api(`/admin/${type}/${id}`, { method: "PATCH", body: JSON.stringify({ published: v.action === "publish" }) })));
    },
    onSuccess: (_d, v) => { inv(); setSel([]); toast(`${v.ids.length} item(s) ${v.action === "archive" ? "archived" : v.action + "ed"}`); },
    onError: (e: Error) => toast(e.message, "err"),
  });

  const all = data ?? [];
  const items = all.filter((d) =>
    (state === "all" || (state === "published") === !!d.published) &&
    `${d.title ?? ""} ${d.question ?? ""} ${d.category ?? ""} ${d.description ?? ""} ${d.answer ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const pg = usePaged(items, 10);
  const pageIds = pg.rows.map((d) => d._id as string);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => sel.includes(id));
  const toggleAll = () => setSel(allOnPage ? sel.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...sel, ...pageIds])));
  const archive = (ids: string[], name: string) => setAsk({ title: "Archive?", message: `Archive ${name}? It will no longer be listed.`, run: () => bulk.mutate({ ids, action: "archive" }) });

  return (
    <section>
      <PageHeader title={type} subtitle={`${all.filter((d) => d.published).length} published · ${all.filter((d) => !d.published).length} draft`}
        action={<button className={btnPrimary} onClick={() => { setErr(""); setModal("new"); }}><Icon name="plus" className="h-4 w-4" />Add new</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder={`Search ${type}…`} />
        <select value={state} onChange={(e) => { setState(e.target.value as typeof state); pg.setPage(1); }} aria-label="Status filter"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
          <option value="all">All</option><option value="published">Published</option><option value="draft">Draft</option>
        </select>
      </div>

      {sel.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm text-white">
          <span className="mr-auto font-medium">{sel.length} selected</span>
          <button disabled={bulk.isPending} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20 disabled:opacity-60" onClick={() => bulk.mutate({ ids: sel, action: "publish" })}>{bulk.isPending && <Spinner />}Publish</button>
          <button disabled={bulk.isPending} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20 disabled:opacity-60" onClick={() => bulk.mutate({ ids: sel, action: "unpublish" })}>{bulk.isPending && <Spinner />}Unpublish</button>
          <button className="rounded-lg bg-red-500 px-3 py-1.5 hover:bg-red-600" onClick={() => archive(sel, `${sel.length} item(s)`)}>Archive</button>
          <button className="px-2 py-1.5 text-white/70 hover:text-white" onClick={() => setSel([])}>Clear</button>
        </div>
      )}

      <div className={`${card} overflow-hidden`}>
        {isLoading ? <Loading /> : !pg.total ? <Empty>{all.length ? "Nothing matches your filters." : "Nothing here yet. Click “Add new” to create one."}</Empty> : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" className="h-4 w-4 rounded border-slate-300" />
              <span>{pg.total} item{pg.total === 1 ? "" : "s"}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {pg.rows.map((d) => (
                <li key={d._id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                  <input type="checkbox" checked={sel.includes(d._id)} onChange={() => setSel(sel.includes(d._id) ? sel.filter((x) => x !== d._id) : [...sel, d._id])} aria-label={`Select ${d.title ?? d.question}`} className="h-4 w-4 rounded border-slate-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{d.title ?? d.question}</p>
                    {(d.category || d.price) && <p className="truncate text-xs text-slate-500">{[d.category, d.price].filter(Boolean).join(" · ")}</p>}
                  </div>
                  <Badge tone={d.published ? "green" : "amber"}>{d.published ? "Published" : "Draft"}</Badge>
                  <button className={btnGhost} onClick={() => patch.mutate({ id: d._id, b: { published: !d.published } })}>{d.published ? "Unpublish" : "Publish"}</button>
                  <button className={iconBtn} title="Edit" aria-label={`Edit ${d.title ?? d.question}`} onClick={() => { setErr(""); setModal(d); }}><Icon name="edit" className="h-4 w-4" /></button>
                  <button className={`${iconBtn} text-red-600 hover:bg-red-50 hover:text-red-700`} title="Archive" aria-label={`Archive ${d.title ?? d.question}`} onClick={() => archive([d._id], `“${d.title ?? d.question}”`)}><Icon name="trash" className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pager {...pg} />
      </div>

      {modal && (
        <Drawer title={modal === "new" ? `Add ${type === "faqs" ? "FAQ" : type.slice(0, -1)}` : "Edit item"} onClose={() => setModal(null)}>
          <ContentForm type={type} initial={modal === "new" ? undefined : modal} busy={create.isPending || patch.isPending} err={err}
            submitLabel={modal === "new" ? "Create" : "Save changes"}
            onSubmit={(b) => (modal === "new" ? create.mutate(b) : patch.mutate({ id: modal._id, b, close: true }))} />
        </Drawer>
      )}
      {ask && <Confirm title={ask.title} message={ask.message} onCancel={() => setAsk(null)} onConfirm={() => { ask.run(); setAsk(null); }} />}
    </section>
  );
}
