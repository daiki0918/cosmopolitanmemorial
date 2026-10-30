export default function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-brand/10 bg-white">
          <div className="h-44 w-full animate-pulse bg-slate-200" />
          <div className="space-y-2 p-5"><div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" /><div className="h-3 w-full animate-pulse rounded bg-slate-100" /><div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" /></div>
        </li>
      ))}
    </ul>
  );
}
