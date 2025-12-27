import Link from "next/link";
import { headers } from "next/headers";
import LockedSection from "@/components/LockedSection";

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function IdeaPage({ params }: { params: { slug: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (await getBaseUrl());

  const res = await fetch(`${baseUrl}/api/ideas/${params.slug}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
          This idea couldn&apos;t be loaded.
        </div>
        <div className="mt-4">
          <Link className="underline text-white/80" href="/ideas">
            Back to Ideas
          </Link>
        </div>
      </div>
    );
  }

  const json = await res.json().catch(() => ({} as any));
  const idea = json?.data ?? {};
  const viewer = json?.viewer ?? { plan: "free", is_admin: false };

  const isAdmin = !!viewer.is_admin;
  const plan = viewer.plan ?? "free";

  const lockIdeas = !isAdmin && plan === "free";
  const lockConviction = !isAdmin && plan !== "conviction" && plan !== "macro";
  const lockMacro = !isAdmin && plan !== "macro";

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="mb-6">
        <Link className="text-white/70 underline" href="/ideas">
          ← Back
        </Link>
      </div>

      <h1 className="text-3xl font-semibold">{idea.title}</h1>
      <div className="mt-2 text-sm text-white/60">
        {idea.ticker} • {idea.direction?.toUpperCase?.() ?? idea.direction}
      </div>

      <div className="mt-6 space-y-6">
        {idea.teaser ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-sm font-semibold text-white/70">Teaser</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-white/90">{idea.teaser}</p>
          </section>
        ) : null}

        <LockedSection locked={lockIdeas} label="Idea Thesis (LEVEL I)">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-sm font-semibold text-white/70">Idea Thesis (LEVEL I)</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-white/90">{idea.summary}</p>
          </section>
        </LockedSection>

        <LockedSection locked={lockConviction} label="Conviction (LEVEL II)">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-sm font-semibold text-white/70">Conviction (LEVEL II)</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-white/90">{idea.conviction}</p>
          </section>
        </LockedSection>

        <LockedSection locked={lockMacro} label="Macro (LEVEL III)">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-sm font-semibold text-white/70">Macro (LEVEL III)</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-white/90">{idea.macro_context}</p>
          </section>
        </LockedSection>
      </div>
    </main>
  );
}
