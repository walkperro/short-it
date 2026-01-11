import Link from "next/link";
import { FilterChips } from "@/components/FilterChips";
import LockIcon from "@/components/LockIcon";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { canAccess, normalizePlan, type Plan } from "@/lib/entitlements";

type ConvictionItem = {
  id: string;
  idea_id: string;
  status: string;
  body: string | null;
  created_at: string;
  published_at: string | null;
  ideas?: {
    slug: string | null;
    idea_no?: number | null;
    ticker: string | null;
    kind: string | null;
    created_at: string;
    published_at: string | null;
    status: string;
  } | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function sp(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : (v ?? "");
}

function toDayStartISO(yyyy_mm_dd: string) {
  if (!yyyy_mm_dd) return "";
  const dt = new Date(`${yyyy_mm_dd}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
}

function nextDayStartISO(yyyy_mm_dd: string) {
  if (!yyyy_mm_dd) return "";
  const dt = new Date(`${yyyy_mm_dd}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) return "";
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString();
}

function fmtIdeaNo(n?: number | null) {
  if (!n) return "—";
  return String(n).padStart(3, "0");
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

function LockedCard() {
  return (
    <div className="relative min-w-[320px] max-w-[360px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-5">
      <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-[6px]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 rounded bg-white/10" />
          <div className="h-6 w-20 rounded-full bg-white/10" />
        </div>
        <div className="mt-4 h-5 w-3/4 rounded bg-white/10" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-11/12 rounded bg-white/10" />
          <div className="h-3 w-2/3 rounded bg-white/10" />
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <LockIcon className="h-4 w-4 text-white/60" /> Locked
          </div>
          <Link
            href="/subscribe"
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 transition"
          >
            Upgrade to unlock{" "}
            <span className="ml-2 inline-flex items-center">
              <LockIcon className="h-4 w-4 text-white/80" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ConvictionPage(props: {
  searchParams?: Promise<{ kind?: string | string[]; ticker?: string | string[]; from?: string | string[]; to?: string | string[] }>;
}) {
  const searchParams = (props.searchParams ? await props.searchParams : {}) as any;

  // viewer (server auth)
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

  const kindParam = sp(searchParams.kind) || "all";
  const tickerParam = sp(searchParams.ticker);
  const fromParam = sp(searchParams.from);
  const toParam = sp(searchParams.to);

  let items: ConvictionItem[] = [];
  let errorMsg: string | null = null;

  let q = supabaseAdmin
    .from("convictions")
    .select(
      "id,idea_id,status,body,created_at,published_at,ideas:idea_id!inner(slug,idea_no,ticker,kind,direction,option_side,created_at,published_at,status)",
    )
    .eq("status","published").eq("ideas.status","published").order("published_at", { ascending: false, nullsFirst: false });

  
  if (tickerParam) {
    q = q.ilike("ideas.ticker", `%${tickerParam}%`);
  }
// filters (server-side) — same behavior as /ideas
  if (kindParam && kindParam !== "all") {
    q = q.ilike("ideas.kind", kindParam);
  }
  if (fromParam) {
    const isoFrom = toDayStartISO(fromParam);
    if (isoFrom) q = q.gte("ideas.published_at", isoFrom);
  }
  if (toParam) {
    const isoTo = nextDayStartISO(toParam);
    if (isoTo) q = q.lt("ideas.published_at", isoTo);
  }

  const { data, error } = await q;
  if (error) errorMsg = error.message;
  items = (data ?? []) as any;

  const visible = items;

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div>
        <div className="level-fade text-xs tracking-[0.35em] text-white/40">LEVEL II</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Conviction</h1>
        <p className="mt-1 text-sm text-white/60">Unlocked for Conviction+ members.</p>
      </div>

      {/* Filters */}
      <form
        action="/conviction"
        method="get"
        className="mt-6 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-end md:justify-between"
      >
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs tracking-widest text-white/50">TYPE</div>
            <select
              name="kind"
              defaultValue={kindParam || "all"}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
            >
              <option value="all">All</option>
              <option value="Equity">Equity</option>
              <option value="ETF">ETF</option>
              <option value="Commodity">Commodity</option>
              <option value="Buy Option">Buy Option</option>
              <option value="Sell Option">Sell Option</option>
            </select>
            </div>

            <div>
              <div className="text-xs tracking-widest text-white/50">TICKER</div>
              <input
                name="ticker"
                placeholder="SPY"
                defaultValue={tickerParam || ""}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
              />
            </div>

          <div>
            <div className="text-xs tracking-widest text-white/50">FROM</div>
            <input
              type="date"
              name="from"
              defaultValue={fromParam || ""}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
            />
          </div>

          <div>
            <div className="text-xs tracking-widest text-white/50">TO</div>
            <input
              type="date"
              name="to"
              defaultValue={toParam || ""}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black"
          >
            Apply
          </button>
          <Link
            href="/conviction"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Clear
          </Link>
        </div>
      </form>

      <FilterChips
        basePath="/conviction"
        params={{
          kind: kindParam && kindParam !== "all" ? kindParam : undefined,
          from: fromParam || undefined,
          to: toParam || undefined,
          ticker: tickerParam || undefined,
        }}
        labelMap={{ kind: "TYPE", from: "FROM", to: "TO" }}
      />

      {errorMsg ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {visible.map((c) => {
          if (!allowed) return <LockedCard key={`locked-${c.id}`} />;

          const idea = c.ideas ?? null;
          const slug = idea?.slug ?? "";
          const when = c.published_at || c.created_at;

          return (
            <Link
              key={c.id}
              href={slug ? `/conviction/${slug}` : "/conviction"}
              className="min-w-[320px] max-w-[360px] shrink-0 rounded-2xl border border-white/10 bg-black/40 p-5 transition hover:border-white/20 hover:bg-black/60"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-widest text-white/50">
                  IDEA #{fmtIdeaNo(idea?.idea_no)} • {idea?.ticker || "—"}
                </div>
                {(() => {
  const b = dirBadge((idea as any)?.direction ?? null, (idea as any)?.option_side ?? null);
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.cls}`}>{b.up}</span>
  );
})()}
              </div>

              <div className="mt-3 text-lg font-semibold leading-snug">
                {idea?.ticker || "—"} <span className="text-white/40">•</span> {idea?.kind || "Conviction"}
              </div>

              <p className="mt-3 text-sm text-white/70 line-clamp-4">{c.body || "—"}</p>

              <div className="mt-4 text-xs text-white/40">{new Date(when).toLocaleString()}</div>
            </Link>
          );
        })}

        {!errorMsg && items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No published convictions yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}
