import Link from "next/link";
import { getRequestBaseUrl } from "@/lib/server-url";

type Idea = {
  id: string;
  slug: string;
  title: string;
  ticker: string;
  direction: "long" | "short";
  teaser?: string | null;
  created_at: string;
};

export const runtime = "nodejs";

export default async function IdeasPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (await getRequestBaseUrl());

  let items: Idea[] = [];
  let errorMsg: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/ideas`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      errorMsg = json?.error ?? `Failed to load ideas (${res.status})`;
    } else {
      items = (json?.data ?? []) as Idea[];
    }
  } catch (e: any) {
    errorMsg = e?.message ?? "Failed to load ideas.";
  }

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Ideas</h1>
          <p className="mt-1 text-sm text-white/60">
            High-conviction trade setups. Updated regularly.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      )}

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {items.map((i) => (
          <Link
            key={i.id}
            href={`/ideas/${i.slug}`}
            className="min-w-[320px] max-w-[360px] shrink-0 rounded-2xl border border-white/10 bg-black/40 p-5 transition hover:border-white/20 hover:bg-black/60"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs tracking-widest text-white/50">
                {i.ticker}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  i.direction === "long"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-red-500/15 text-red-400"
                }`}
              >
                {i.direction.toUpperCase()}
              </span>
            </div>

            <div className="mt-3 text-lg font-semibold leading-snug">
              {i.title}
            </div>

            {i.teaser && (
              <p className="mt-3 text-sm text-white/70 line-clamp-3">
                {i.teaser}
              </p>
            )}

            <div className="mt-4 text-xs text-white/40">
              {new Date(i.created_at).toLocaleString()}
            </div>
          </Link>
        ))}

        {!errorMsg && items.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No published ideas yet.
          </div>
        )}
      </div>
    </main>
  );
}
