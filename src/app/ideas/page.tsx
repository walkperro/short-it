import { getRequestBaseUrl } from "@/lib/server-url";

export const dynamic = "force-dynamic";

type Idea = {
  id: string;
  slug: string;
  title: string;
  ticker: string;
  direction: "long" | "short";
  start_date: string;
  end_date: string;
  target_price: number;
  teaser: string | null;
  created_at: string;
  published_at: string | null;
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default async function IdeasPage() {
  const baseUrl = getRequestBaseUrl();
  const res = await fetch(`${baseUrl}/api/ideas`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) return <div className="p-6 text-white">Error: {json.error ?? "Failed to load ideas"}</div>;

  const ideas: Idea[] = json.data ?? [];

  return (
    <main className="p-6 max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-semibold">Ideas</h1>
      <p className="text-sm text-white/70 mt-1">
        Public sees the teaser. LEVEL I unlocks the full thesis.
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

            <div className="mt-2 text-sm text-white/70 flex flex-wrap gap-x-3 gap-y-1">
              <span>Target: {idea.target_price}</span>
              <span>·</span>
              <span>{idea.start_date} → {idea.end_date}</span>
              <span>·</span>
              <span>Posted: {fmt(idea.published_at ?? idea.created_at)}</span>
            </div>

            <div className="mt-3 text-sm text-white/80 whitespace-pre-wrap">{idea.teaser ?? "—"}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
