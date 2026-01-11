import Link from "next/link";

type Params = Record<string, string | undefined>;

function buildHref(basePath: string, params: Params, omitKey?: string) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    if (omitKey && k === omitKey) continue;
    sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function FilterChips({
  basePath,
  params,
  labelMap,
  hideValues,
}: {
  basePath: string;
  params: Params;
  labelMap?: Record<string, string>;
  hideValues?: string[]; // keys where you only want to show label, not value
}) {
  const entries = Object.entries(params).filter(([_, v]) => Boolean(v));
  if (entries.length === 0) return null;

  const hide = new Set(hideValues ?? []);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {entries.map(([k, v]) => {
        const label = labelMap?.[k] ?? k.toUpperCase();
        const text = hide.has(k) ? label : `${label}: ${String(v)}`;
        return (
          <Link
            key={k}
            href={buildHref(basePath, params, k)}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            aria-label={`Remove ${label} filter`}
          >
            <span className="tracking-widest">{text}</span>
            <span className="text-white/50">×</span>
          </Link>
        );
      })}

      <Link
        href={basePath}
        className="inline-flex items-center rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
      >
        Clear all
      </Link>
    </div>
  );
}
