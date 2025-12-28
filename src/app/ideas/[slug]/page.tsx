import Link from "next/link";
import { headers, cookies } from "next/headers";
import LockedSection from "@/components/LockedSection";

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function IdeaPage({ params }: { params: { slug: string } }) {
  const base = await getBaseUrl();
  const cookieHeader = cookies().toString();

  const res = await fetch(`${base}/api/ideas/${params.slug}`, {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  const json = await res.json().catch(() => null);
  const idea = json?.data;

  if (!res.ok || !idea) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-white/90">
          This idea couldn't be loaded.
        </div>
        <div className="mt-4">
          <Link className="text-white/70 underline underline-offset-4 hover:text-white" href="/ideas">
            Back to Ideas
          </Link>
        </div>
      </main>
    );
  }

  const userPlan = json?.viewer?.plan ?? "free";
  const isAdmin = json?.viewer?.is_admin ?? false;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-widest text-white/50">{idea.ticker} • {idea.direction?.toUpperCase?.() ?? ""}</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">{idea.title}</h1>
          {idea.teaser ? <p className="mt-3 text-white/70">{idea.teaser}</p> : null}
        </div>

        <Link
          href="/subscribe"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          View plans
        </Link>
      </div>

      <div className="mt-8 grid gap-6">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs tracking-widest text-white/50">LEVEL I</div>
          <h2 className="mt-2 text-lg font-semibold text-white">Idea Thesis</h2>
          <div className="prose prose-invert mt-3 max-w-none text-white/80">
            <p className="whitespace-pre-wrap">{idea.summary}</p>
          </div>
        </section>

        <LockedSection
          locked={!isAdmin && userPlan !== "conviction" && userPlan !== "macro"}
          label="Conviction"
        >
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs tracking-widest text-white/50">LEVEL II</div>
            <h2 className="mt-2 text-lg font-semibold text-white">Conviction</h2>
            <div className="prose prose-invert mt-3 max-w-none text-white/80">
              <p className="whitespace-pre-wrap">{idea.conviction}</p>
            </div>
          </section>
        </LockedSection>

        <LockedSection
          locked={!isAdmin && userPlan !== "macro"}
          label="Macro"
        >
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs tracking-widest text-white/50">LEVEL III</div>
            <h2 className="mt-2 text-lg font-semibold text-white">Macro</h2>
            <div className="prose prose-invert mt-3 max-w-none text-white/80">
              <p className="whitespace-pre-wrap">{idea.macro_context}</p>
            </div>
          </section>
        </LockedSection>

        <div className="pt-2">
          <Link className="text-white/60 underline underline-offset-4 hover:text-white" href="/ideas">
            Back to Ideas
          </Link>
        </div>
      </div>
    </main>
  );
}
