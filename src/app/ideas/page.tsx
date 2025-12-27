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
    <main className="mx-auto max-w-5xl p-6 text-white">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Ideas</h1>
          <p className="mt-1 text-sm text-white/60">Published ideas.</p>
        </div>
      </div>

      {errorMsg ? (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {items.map((i) => (
          <Link
            key={i.id}
            href={`/ideas/${i.slug}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">{i.title}</div>
              <div className="text-xs text-white/60">
                {i.ticker} • {i.direction.toUpperCase()}
              </div>
            </div>
            {i.teaser ? (
              <div className="mt-2 text-sm text-white/70">{i.teaser}</div>
            ) : null}
            <div className="mt-3 text-xs text-white/40">
              {new Date(i.created_at).toLocaleString()}
            </div>
          </Link>
        ))}

        {!errorMsg && items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No published ideas yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}
