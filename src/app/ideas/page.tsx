import Link from "next/link";
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
  option_side?: "call" | "put" | null;
  entry?: string | null;
  reach?: string | null;
  teaser?: string | null;
};

export const runtime = "nodejs";

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export default async function IdeasPage() {
  // ✅ Relative fetch (Next forwards cookies automatically)
  const meRes = await fetch("/api/me/plan", { cache: "no-store" }).catch(() => null);
  const meJson = await meRes?.json().catch(() => null);

  const plan: Plan = normalizePlan(meJson?.plan ?? meJson?.profile?.plan ?? "free");
  const isAdmin = !!(meJson?.is_admin ?? meJson?.profile?.is_admin);
  const isFree = plan === "free" && !isAdmin;

  // ideas list (public view)
  let items: Idea[] = [];
  let errorMsg: string | null = null;

  try {
    const res = await fetch("/api/ideas", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) errorMsg = json?.error ?? `Failed to load ideas (${res.status})`;
    else items = (json?.data ?? []) as Idea[];
  } catch (e: any) {
    errorMsg = e?.message ?? "Failed to load ideas.";
  }

  // FREE users: show first 4 (first unlocked, rest locked UI)
  const visible = isFree ? items.slice(0, 4) : items;

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Ideas</h1>
          <p className="mt-1 text-sm text-white/60">
            {isFree ? "Upgrade to see more trade ideas." : "Trade ideas updated regularly."}
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

      {errorMsg ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {visible.map((i, idx) => {
          const locked = isFree && idx > 0;
          if (locked) return <LockedCard key={i.id} num={idx + 1} />;

          return (
            <Link
              key={i.id}
              href={`/ideas/${i.slug}`}
              className="block rounded-3xl border border-white/10 bg-black/40 p-5 transition hover:border-white/20 hover:bg-black/60"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-widest text-white/50">IDEA #{pad3(idx + 1)}</div>
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

              <div className="mt-3 text-xs text-white/40">{new Date(i.created_at).toLocaleString()}</div>

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
              </div>

              {i.teaser ? (
                <div className="mt-4">
                  <div className="text-xs tracking-widest text-white/40">Context</div>
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
      <div className={strong ? "text-sm font-semibold" : "text-sm text-white/80"}>{value}</div>
    </div>
  );
}

function LockedCard({ num }: { num: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs tracking-widest text-white/50">
        IDEA #{String(num).padStart(3, "0")}
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
