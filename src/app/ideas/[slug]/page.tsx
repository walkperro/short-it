import { notFound } from "next/navigation";
import { getRequestBaseUrl } from "@/lib/server-url";

export const runtime = "nodejs";

export default async function IdeaDetailPage({ params }: { params: { slug: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (await getRequestBaseUrl());
  const slug = params.slug;

  try {
    const res = await fetch(`${baseUrl}/api/ideas/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (res.status === 404) return notFound();
    if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);

    const idea = json?.data;
    if (!idea) return notFound();

    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="text-xs text-white/60">
          {idea.ticker} • {String(idea.direction ?? "").toUpperCase()}
        </div>
        <h1 className="mt-2 text-3xl font-semibold">{idea.title}</h1>

        {idea.teaser ? <p className="mt-4 text-white/80">{idea.teaser}</p> : null}

        <div className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          {idea.summary ? (
            <section>
              <h2 className="text-sm font-semibold text-white/70">Thesis</h2>
              <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{idea.summary}</p>
            </section>
          ) : null}

          {idea.conviction ? (
            <section>
              <h2 className="text-sm font-semibold text-white/70">Conviction</h2>
              <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{idea.conviction}</p>
            </section>
          ) : null}

          {idea.macro_context ? (
            <section>
              <h2 className="text-sm font-semibold text-white/70">Macro</h2>
              <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{idea.macro_context}</p>
            </section>
          ) : null}
        </div>
      </main>
    );
  } catch {
    // If your API/view is misconfigured, don’t hard-crash the whole page.
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          This idea couldn’t be loaded. (Likely a database/view or permissions issue.)
        </div>
      </main>
    );
  }
}
