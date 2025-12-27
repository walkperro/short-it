import Link from "next/link";
import { headers } from "next/headers";

async function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function IdeaPage({ params }: { params: { slug: string } }) {
  const baseUrl = await getBaseUrl();

  const res = await fetch(`${baseUrl}/api/ideas/${params.slug}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
          This idea couldn&apos;t be loaded. (Likely a database/view or permissions issue.)
        </div>
        <div className="mt-4">
          <Link className="underline" href="/ideas">Back to Ideas</Link>
        </div>
      </div>
    );
  }

  const json = await res.json();
  const idea = json?.data;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <Link className="underline" href="/ideas">← Back</Link>
      </div>

      <h1 className="text-3xl font-semibold">{idea.title}</h1>
      <div className="mt-2 text-sm opacity-70">
        {idea.ticker} • {idea.direction?.toUpperCase?.() ?? idea.direction}
      </div>

      <div className="mt-6 space-y-6">
        {idea.teaser && (
          <section>
            <h2 className="mb-2 text-sm font-semibold opacity-70">Teaser</h2>
            <p className="whitespace-pre-wrap leading-relaxed">{idea.teaser}</p>
          </section>
        )}

        {idea.summary && (
          <section>
            <h2 className="mb-2 text-sm font-semibold opacity-70">Idea Thesis (LEVEL I)</h2>
            <p className="whitespace-pre-wrap leading-relaxed">{idea.summary}</p>
          </section>
        )}

        {idea.conviction && (
          <section>
            <h2 className="mb-2 text-sm font-semibold opacity-70">Conviction (LEVEL II)</h2>
            <p className="whitespace-pre-wrap leading-relaxed">{idea.conviction}</p>
          </section>
        )}

        {idea.macro_context && (
          <section>
            <h2 className="mb-2 text-sm font-semibold opacity-70">Macro (LEVEL III)</h2>
            <p className="whitespace-pre-wrap leading-relaxed">{idea.macro_context}</p>
          </section>
        )}
      </div>
    </div>
  );
}
