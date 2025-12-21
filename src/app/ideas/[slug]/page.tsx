import { supabase } from "@/lib/supabase/client";
import { notFound } from "next/navigation";

export default async function IdeaDetail({ params }: { params: { slug: string } }) {
  const { data, error } = await supabase
    .from("ideas_public")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (error || !data) return notFound();

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
