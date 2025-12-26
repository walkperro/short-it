export const dynamic = "force-dynamic";

import { getRequestBaseUrl } from "@/lib/server-url";

type Idea = {
  id: string;
  slug: string;
  title: string;
  ticker: string;
  direction: "long" | "short";
  start_date: string;
  end_date: string;
  target_price: number;
  summary: string;
  created_at: string;
};

export default async function IdeasPage() {
  const baseUrl = getRequestBaseUrl();

  const res = await fetch(`${baseUrl}/api/ideas`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return <div className="p-6 text-white">Error: {json.error ?? "Failed to load ideas"}</div>;
  }

  const ideas: Idea[] = json.data ?? [];

  return (
    <main className="p-6 max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-semibold">Ideas</h1>
      <p className="text-sm text-white/70 mt-1">
        3–4 ideas per month. Upgrade to unlock Conviction + Macro.
      </p>

      <div className="mt-6 grid gap-4">
        {ideas.map((idea) => (
          <a
            key={idea.id}
            href={`/ideas/${idea.slug}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{idea.title}</div>
              <div className="text-sm text-white/70">
                {idea.ticker} · {idea.direction.toUpperCase()}
              </div>
            </div>

            <div className="mt-2 text-sm text-white/70">
              Target: {idea.target_price} · {idea.start_date} → {idea.end_date}
            </div>

            <div className="mt-3 text-sm text-white/80">{idea.summary}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
