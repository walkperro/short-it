import { notFound } from "next/navigation";

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

export default async function IdeaDetail({ params }: { params: { slug: string } }) {
  const res = await fetch(`/api/ideas/${params.slug}`, { cache: "no-store" });
  const json = await res.json();

  if (!res.ok || !json.data) return notFound();

  const data: Idea = json.data;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <div className="text-sm text-black/70 mt-1">
            {data.ticker} · {data.direction.toUpperCase()} · Target {data.target_price}
          </div>
        </div>

        <a
          href="/subscribe"
          className="rounded-2xl border px-4 py-2 text-sm hover:shadow-sm transition"
        >
          Upgrade
        </a>
      </div>

      <section className="mt-6">
        <h2 className="font-medium">Summary</h2>
        <p className="mt-2 text-sm">{data.summary}</p>
      </section>

      <section className="mt-8 rounded-2xl border p-4">
        <h3 className="font-medium">Locked: Conviction + Macro</h3>
        <p className="mt-2 text-sm text-black/70">
          Upgrade to see the technical/fundamental thesis and the macro regime view.
        </p>
      </section>
    </main>
  );
}
