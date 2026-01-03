import Link from "next/link";
import LockIcon from "@/components/LockIcon";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { canAccess, normalizePlan, type Plan } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtIdeaNo(n?: number | null) {
  if (!n) return "—";
  return String(n).padStart(3, "0");
}

function LockedFull() {
  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-xl font-semibold">Locked</div>
        <p className="mt-2 text-sm text-white/60">
          Upgrade to unlock the Conviction section.
        </p>
        <Link
          href="/subscribe"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Upgrade <LockIcon className="h-4 w-4" />
        </Link>
      </div>

      <Link
        href="/conviction"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        Back to Conviction
      </Link>
    </main>
  );
}

export default async function ConvictionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // viewer (server auth) — no internal /api/me fetch
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let plan: Plan = "free";
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan,is_admin")
      .eq("id", user.id)
      .maybeSingle();

    plan = normalizePlan(profile?.plan ?? "free") as Plan;
    isAdmin = isAdminEmail(user.email ?? null) || Boolean(profile?.is_admin);
  }

  const allowed = isAdmin || canAccess("conviction", plan);
  if (!allowed) return <LockedFull />;

  // Find idea then conviction
  const { data: idea, error: ideaErr } = await supabaseAdmin
    .from("ideas")
    .select("id,slug,idea_no,ticker,kind,created_at,published_at,status")
    .eq("slug", slug)
    .maybeSingle();

  if (ideaErr || !idea || idea.status !== "published") {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          This conviction couldn't be loaded.
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
          <span className="text-white/60">Slug:</span>{" "}
          <span className="font-mono">{slug}</span>
        </div>
        <Link
          href="/conviction"
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          Back to Conviction
        </Link>
      </main>
    );
  }

  const { data: conv, error: convErr } = await supabaseAdmin
    .from("convictions")
    .select("id,idea_id,status,body,created_at,published_at")
    .eq("idea_id", idea.id)
    .eq("status", "published")
    .maybeSingle();

  if (convErr || !conv) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          This conviction couldn't be loaded.
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
          <span className="text-white/60">Slug:</span>{" "}
          <span className="font-mono">{slug}</span>
        </div>
        <Link
          href="/conviction"
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          Back to Conviction
        </Link>
      </main>
    );
  }

  const when = conv.published_at || conv.created_at;
  const ideaWhen = idea.published_at || idea.created_at;

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="level-fade text-xs tracking-[0.35em] text-white/40">LEVEL II</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {idea.ticker ?? "—"} <span className="text-white/40">•</span>{" "}
            {idea.kind ?? "Conviction"}
          </h1>
          <div className="mt-2 text-xs text-white/40">
            IDEA #{fmtIdeaNo(idea.idea_no)} • {new Date(ideaWhen).toLocaleString()}
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">
          {new Date(when).toLocaleString()}
        </span>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="text-xs tracking-widest text-white/40">Conviction</div>
        <div className="mt-3 whitespace-pre-wrap text-sm text-white/80">
          {conv.body || "—"}
        </div>
      </div>

      <Link
        href="/conviction"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        Back to Conviction
      </Link>
    </main>
  );
}
