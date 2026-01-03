import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequestBaseUrl } from "@/lib/server-url";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { normalizePlan, type Plan } from "@/lib/entitlements";

type Idea = {
  id: string;
  slug: string;
  idea_no: number | null;
  created_at: string;
  published_at: string | null;
  status: string;
  locked: boolean;
  kind: string | null;
  ticker: string | null;
  direction: string | null;
  option_side: string | null;
  entry: string | null;
  reach: string | null;
  strike: string | null;
  exp: string | null;
  context: string | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-xl font-semibold">Sign in required</div>
          <p className="mt-2 text-sm text-white/60">
            Please sign in to view this idea.
          </p>
          <Link
            href="/account"
            className="mt-5 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            Go to Account
          </Link>
        </div>

        <Link
          href="/ideas"
          className="mt-6 inline-block text-sm underline underline-offset-4"
        >
          Back to Ideas
        </Link>
      </main>
    );
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const plan: Plan = normalizePlan(profile?.plan ?? "free");
  const isAdmin = isAdminEmail(user.email ?? null) || Boolean(profile?.is_admin);

  // exact match first
  let { data: idea, error } = await supabaseAdmin
    .from("ideas")
    .select(
      "id,slug,idea_no,created_at,published_at,status,locked,kind,ticker,direction,option_side,entry,reach,strike,exp,context",
    )
    .eq("slug", rawSlug)
    .maybeSingle();

  // fallback: prefix match if slug got truncated somewhere (e.g. spy-1767042)
  if ((!idea || error) && rawSlug && rawSlug.length >= 6) {
    const res2 = await supabaseAdmin
      .from("ideas")
      .select(
        "id,slug,idea_no,created_at,published_at,status,locked,kind,ticker,direction,option_side,entry,reach,strike,exp,context",
      )
      .ilike("slug", `${rawSlug}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (res2.data?.slug && res2.data.slug !== rawSlug) {
      redirect(`/ideas/${res2.data.slug}`);
    }
    idea = res2.data ?? idea;
    error = res2.error ?? error;
  }

  if (error || !idea || idea.status !== "published") {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          This idea couldn't be loaded.
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
          <span className="text-white/60">Slug:</span>{" "}
          <span className="font-mono">{rawSlug}</span>
        </div>
        <Link
          href="/ideas"
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          Back to Ideas
        </Link>
      </main>
    );
  }

  const isLocked = !isAdmin && plan === "free" && Boolean(idea.locked);
  if (isLocked) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-xl font-semibold">Locked</div>
          <p className="mt-2 text-sm text-white/60">
            Upgrade to unlock full details.
          </p>
          <Link
            href="/subscribe"
            className="mt-5 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            Upgrade
          </Link>
        </div>
        <Link
          href="/ideas"
          className="mt-6 inline-block text-sm underline underline-offset-4"
        >
          Back to Ideas
        </Link>
      </main>
    );
  }

  // CTA: check if a published conviction exists for this idea (so we can link directly)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (await getRequestBaseUrl());
  let hasConviction = false;
  try {
    const res = await fetch(`${baseUrl}/api/convictions/${idea.slug}`, {
      cache: "no-store",
    });
    hasConviction = res.ok;
  } catch {}

  const badge = (idea.direction ?? idea.option_side ?? "—").toUpperCase();

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="level-fade text-xs tracking-[0.35em] text-white/40">LEVEL I</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {idea.ticker ?? "—"} <span className="text-white/40">•</span>{" "}
            {idea.kind ?? "Idea"}
          </h1>
          <div className="mt-2 text-xs text-white/40">
            {new Date(idea.published_at ?? idea.created_at).toLocaleString()}
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">
          {badge}
        </span>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
  <Field label="Ticker" value={idea.ticker ?? "—"} />
  <Field label="Type" value={idea.kind ?? "—"} />
  <Field label="Direction" value={badge} />
  <Field label="Entry" value={idea.entry ?? "—"} />
  <Field label="Target" value={idea.reach ?? "—"} />
  {isOptionKind(idea.kind) ? (
    <>
      <Field label="Strike" value={idea.strike ?? "—"} />
      <Field label="Exp" value={idea.exp ?? "—"} />
    </>
  ) : null}
</div>

{idea.context ? (
          <div className="mt-6">
            <div className="text-xs tracking-widest text-white/40">Context</div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
              {idea.context}
            </p>
          </div>
        ) : null}
      </div>

      {/* CTA (Option 1): TITLE = ALL CAPS + bigger, subtitle = smaller + subtle + normal case */}
      <Link
        href={hasConviction ? `/conviction/${idea.slug}` : "/conviction"}
        className="group mt-5 block rounded-3xl border border-white/10 bg-white/5 p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-[1px] hover:border-white/25 hover:bg-white/[0.06] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(255,255,255,0.04)] active:translate-y-0"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-70" />

        <div className="flex items-center justify-between">
          <div className="text-base font-semibold tracking-tight uppercase">
            Read the full conviction
          </div>
          <span className="inline-block text-white/50 transition-transform duration-300 group-hover:translate-x-0.5">
            →
          </span>
        </div>

        <div className="mt-2 text-[11px] tracking-[0.22em] text-white/35">
  Thesis • Time Expectations • Catalysts
</div>
      </Link>

      <Link
        href="/ideas"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        Back to Ideas
      </Link>
    </main>
  );
}

function isOptionKind(kind: string | null | undefined) {
  return kind === "Buy Option" || kind === "Sell Option";
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs tracking-widest text-white/40">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
