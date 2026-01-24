import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LockIcon from "@/components/LockIcon";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { canAccess, normalizePlan, type Plan } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtIdeaNo(n?: number | null) {
  if (!n) return "—";
  return String(n).padStart(3, "0");
}

function fmtNY(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
}

function dirBadge(direction?: string | null, optionSide?: string | null) {
  const raw = (direction ?? optionSide ?? "—") as any;
  const up = String(raw).toUpperCase();
  const cls =
    raw === "long" || raw === "call"
      ? "bg-emerald-500/15 text-emerald-400"
      : raw === "short" || raw === "put"
        ? "bg-red-500/15 text-red-400"
        : "bg-white/10 text-white/80";
  return { up, cls };
}

function LockedFull() {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
      <div className="flex items-center gap-2 text-xs text-white/60">
        <LockIcon className="h-4 w-4 text-white/60" /> Locked
      </div>
      <div className="mt-2 text-xl font-semibold">
        Upgrade to unlock full Conviction
      </div>
      <p className="mt-2 text-sm text-white/70">
        This page is available to Conviction+ members.
      </p>
      <div className="mt-5 flex gap-3">
        <Link
          href="/subscribe"
          className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black"
        >
          Upgrade
        </Link>
        <Link
          href="/conviction"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10"
        >
          Back
        </Link>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const { data } = await supabaseAdmin
    .from("ideas_public")
    .select("ticker,idea_no,summary,context")
    .eq("slug", slug)
    .maybeSingle();

  const titleCore = data?.ticker ? `${data.ticker} — Conviction` : "Conviction";
  const title = data?.idea_no
    ? `${titleCore} #${fmtIdeaNo(Number(data.idea_no))}`
    : titleCore;
  const description = (
    data?.summary ??
    data?.context ??
    "Full conviction write-up."
  ).slice(0, 160);

  return {
    title,
    description,
    robots: { index: false, follow: false }, // FULL pages should not be indexed
    alternates: { canonical: `/conviction/${slug}` },
  };
}

export default async function ConvictionFullPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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

  const allowed = isAdmin || canAccess(plan, "conviction");

  const { data, error } = await supabaseAdmin
    .from("convictions")
    .select(
      "id,idea_id,status,body,created_at,published_at,ideas:idea_id!inner(slug,idea_no,ticker,kind,direction,option_side,created_at,published_at,status)",
    )
    .eq("status", "published")
    .eq("ideas.slug", slug)
    .limit(1)
    .maybeSingle();

  if (error || !data) return notFound();
  if (!allowed) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="text-xs tracking-[0.35em] text-white/40">LEVEL II</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Conviction
        </h1>
        <LockedFull />
      </main>
    );
  }

  const idea = (data as any).ideas ?? null;
  const when = (data as any).published_at || (data as any).created_at;
  const b = dirBadge(idea?.direction ?? null, idea?.option_side ?? null);

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.35em] text-white/40">
            LEVEL II
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {idea?.ticker || "—"} <span className="text-white/40">•</span>{" "}
            Conviction #{fmtIdeaNo(idea?.idea_no)}
          </h1>
          <div className="mt-2 text-xs text-white/40">{fmtNY(when)}</div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${b.cls}`}
          >
            {b.up}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        <p className="mt-3 text-sm text-white/75 whitespace-pre-wrap">
          {(data as any).body || "—"}
        </p>
      </div>

      <div className="mt-6">
        <Link
          href="/conviction"
          className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
        >
          Back to Convictions
        </Link>
      </div>
    </main>
  );
}
