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
  summary: string;
  created_at: string;
};

export default async function IdeasPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/ideas`, {
    cache: "no-store",
  }).catch(() => null);

  // If NEXT_PUBLIC_SITE_URL isn't set, fall back to relative fetch (works on Vercel)
  const res2 =
    res ??
    (await fetch("/api/ideas", {
      cache: "no-store",
    }));

  const json = await res2.json();
  if (!res2.ok) return <div className="p-6">Error: {json.error ?? "Failed to load ideas"}</div>;

  const ideas: Idea[] = json.data ?? [];

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Ideas</h1>
      <p className="text-sm text-black/70 mt-1">
        3–4 ideas per month. Upgrade to unlock conviction + macro.
      </p>

      <div className="mt-6 grid gap-4">
        {ideas.map((idea) => (
          <a
            key={idea.id}
            href={`/ideas/${idea.slug}`}
            className="rounded-2xl border p-4 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{idea.title}</div>
              <div className="text-sm text-black/70">
                {idea.ticker} · {idea.direction.toUpperCase()}
              </div>
            </div>
            <div className="mt-2 text-sm text-black/70">
              Target: {idea.target_price} · {idea.start_date} → {idea.end_date}
            </div>
            <div className="mt-3 text-sm">{idea.summary}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
