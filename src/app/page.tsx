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

export default async function HomePage() {
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

  // show a clean “most recent” slice
  const recent = items.slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-white">
      <div className="max-w-2xl">
        <div className="text-xs tracking-[0.35em] text-white/40">SHORT-IT</div>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          Trade ideas<span className="text-red-500">.</span>
        </h1>

        {/* NEW subtitle */}
        <p className="mt-4 text-base text-white/60">
  Curated setups based on historical market structure.
  <br />
  <em className="text-white/50">Educational use only.</em>
</p>
      </div>

      {errorMsg && (
        <div className="mt-8 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-semibold tracking-widest text-white/70">
            MOST RECENT
          </h2>
          <Link
            href="/ideas"
            className="text-sm text-white/60 underline underline-offset-4 hover:text-white"
          >
            View all
          </Link>
        </div>

        <div className="mt-5 grid gap-4">
          {recent.map((i) => (
            <Link
              key={i.id}
              href={`/ideas/${i.slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs tracking-widest text-white/50">{i.ticker}</div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    i.direction === "long"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {i.direction.toUpperCase()}
                </span>
              </div>

              <div className="mt-3 text-lg font-semibold leading-snug">
                {i.title}
              </div>

              {i.teaser ? (
                <p className="mt-2 text-sm text-white/70 line-clamp-2">{i.teaser}</p>
              ) : null}

              <div className="mt-4 text-xs text-white/40">
                {new Date(i.created_at).toLocaleString()}
              </div>
            </Link>
          ))}

          {!errorMsg && recent.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              No published ideas yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
