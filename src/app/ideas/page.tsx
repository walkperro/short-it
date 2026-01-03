import Link from "next/link";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { normalizePlan, type Plan } from "@/lib/entitlements";

type Idea = {
  id: string;
  slug: string;
  idea_no?: number | null;
  status?: string;
  locked?: boolean;
  created_at: string;
  published_at?: string | null;
  kind?: string | null;
  ticker: string;
  direction?: "long" | "short" | null;
  entry?: string | null;
  reach?: string | null;
  option_side?: "call" | "put" | null;
  strike?: string | null;
  exp?: string | null;
  teaser?: string | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function sp(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : (v ?? "");
}

function isOptionKind(kind: string | null | undefined) {
  return kind === "Buy Option" || kind === "Sell Option";
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

export default async function IdeasPage(props: {
  searchParams?: Promise<{ kind?: string | string[]; from?: string | string[]; to?: string | string[] }>;
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

    plan = normalizePlan(profile?.plan ?? "free");
    isAdmin = isAdminEmail(user.email ?? null) || Boolean(profile?.is_admin);
  }

  const isFree = !isAdmin && plan === "free";

  const kindParam = sp(searchParams.kind) || "all";
  const fromParam = sp(searchParams.from);
  const toParam = sp(searchParams.to);

  // ideas list (direct query; no /api fetch)
  let items: Idea[] = [];
  let errorMsg: string | null = null;

  let q = supabaseAdmin
    .from("ideas_public")
    .select(
      "id,slug,idea_no,status,locked,created_at,published_at,kind,ticker,direction,entry,reach,option_side,strike,exp,summary,context",
    )
    .order("published_at", { ascending: false, nullsFirst: false });

  // filters (server-side)
  if (kindParam && kindParam !== "all") {
    q = q.ilike("kind", kindParam);
  }
  if (fromParam) {
    const isoFrom = toDayStartISO(fromParam);
    if (isoFrom) q = q.gte("published_at", isoFrom);
  }
  if (toParam) {
    const isoTo = nextDayStartISO(toParam);
    if (isoTo) q = q.lt("published_at", isoTo);
  }

  const { data, error } = await q;

  if (error) errorMsg = error.message;
  items = (data ?? []).map((r: any) => ({
    ...r,
    teaser: r.summary ?? r.context ?? null,
  })) as Idea[];

  // FREE users: show first 4 ideas (1st unlocked UI, rest locked UI)
  // PAID users: show all
  const visible = items;
  const kindSample = Array.from(
    new Set(items.map((x: any) => x.kind).filter(Boolean)),
  ).slice(0, 10);
  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-end justify-between">
        <div>
          <div className="level-fade text-xs tracking-[0.35em] text-white/40">LEVEL I</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ideas</h1>
          <p className="mt-1 text-sm text-white/60">
            {isFree
              ? "Upgrade to see more trade ideas."
              : "Trade Ideas updated regularly."}
          </p>
        </div>

        {isFree ? (
          <Link
            href="/subscribe"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            Upgrade
          </Link>
        ) : null}
      </div>

      {/* Filters */}
      <form
        action="/ideas"
        method="get"
        className="mt-6 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-end md:justify-between"
      >
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
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
            href="/ideas"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Clear
          </Link>
        </div>
      </form>



{errorMsg ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {visible.map((i, idx) => {
          // lock based on admin "locked" toggle
          const locked = isFree && Boolean(i.locked);
          if (locked) return <LockedCard key={i.id} ideaNo={i.idea_no} />;
          return (
            <Link
              key={i.id}
              href={`/ideas/${i.slug}`}
              className="block rounded-3xl border border-white/10 bg-black/40 p-5 hover:border-white/20 hover:bg-black/60 transition"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-widest text-white/50">
                  IDEA #{i.idea_no ? pad3(Number(i.idea_no)) : "—"}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    i.direction === "long"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {(i.direction ?? i.option_side ?? "—").toUpperCase()}
                </span>
              </div>

              <div className="mt-3 text-xs text-white/40">
                {new Date(
                  (i.published_at ?? i.created_at) as any,
                ).toLocaleString()}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3">
                <Field label="Ticker" value={i.ticker || "—"} strong />
                <Field label="Type" value={(i.kind ?? "—") as any} />
                <Field
                  label="Direction"
                  value={(i.direction ?? i.option_side ?? "—").toUpperCase()}
                  strong
                />
                <Field label="Entry" value={(i.entry ?? "—") as any} />
                <Field label="Target" value={(i.reach ?? "—") as any} />
                {isOptionKind(i.kind) ? (
                  <>
                    <Field label="Strike" value={(i.strike ?? "—") as any} />
                    <Field label="Exp" value={(i.exp ?? "—") as any} />
                  </>
                ) : null}
              </div>

              {i.teaser ? (
                <div className="mt-4">
                  <div className="text-xs tracking-widest text-white/40">
                    Context
                  </div>
                  <p className="mt-2 text-sm text-white/70">{i.teaser}</p>
                </div>
              ) : null}
            </Link>
          );
        })}

        {!errorMsg && items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No published ideas yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs tracking-widest text-white/40">{label}</div>
      <div
        className={strong ? "text-sm font-semibold" : "text-sm text-white/80"}
      >
        {value}
      </div>
    </div>
  );
}

function LockedCard({ ideaNo }: { ideaNo?: number | null }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs tracking-widest text-white/50">
        IDEA #{ideaNo ? pad3(Number(ideaNo)) : "—"}
      </div>

      <div className="mt-4 h-4 w-40 rounded bg-white/10" />
      <div className="mt-3 h-4 w-64 rounded bg-white/10" />
      <div className="mt-2 h-4 w-56 rounded bg-white/10" />

      <div className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur">
        <div className="text-center">
          <div className="text-sm font-semibold text-white">Locked</div>
          <Link
            href="/subscribe"
            className="mt-3 inline-flex rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-black"
          >
            Upgrade to unlock
          </Link>
        </div>
      </div>
    </div>
  );
}
