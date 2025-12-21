import { supabase } from "@/lib/supabase/client";

export default async function IdeasPage() {
  const { data, error } = await supabase
    .from("ideas_public")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return <div className="p-6">Error: {error.message}</div>;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Ideas</h1>
      <p className="text-sm text-black/70 mt-1">
        3–4 ideas per month. Upgrade to unlock conviction + macro.
      </p>

      <div className="mt-6 grid gap-4">
        {(data ?? []).map((idea) => (
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
