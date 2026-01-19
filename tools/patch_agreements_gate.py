from pathlib import Path

def write(path: str, content: str):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print("[OK] wrote", p)

# 1) active agreement endpoint
write("src/app/api/agreements/active/route.ts", """\
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("active_agreement")
    .select("version,title,body,created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No active agreement set" }, { status: 404 });

  return NextResponse.json({ agreement: data });
}
""")

# 2) accept agreement endpoint
write("src/app/api/agreements/accept/route.ts", """\
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { version } = await req.json().catch(() => ({} as any));
  if (!version) return NextResponse.json({ error: "Missing agreement version" }, { status: 400 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const userAgent = req.headers.get("user-agent") ?? null;

  const { error } = await supabaseAdmin.from("agreement_acceptances").insert({
    user_id: user.id,
    agreement_version: version,
    ip,
    user_agent: userAgent,
  });

  // if they already accepted, treat as OK
  if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
""")

# 3) Subscribe Agree page (client)
write("src/app/subscribe/agree/page.tsx", """\
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Tier = "ideas" | "conviction" | "macro";

export default function AgreePage() {
  const [tier, setTier] = useState<Tier>("ideas");
  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);

  const allChecked = useMemo(() => c1 && c2 && c3, [c1, c2, c3]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tier");
    if (t === "ideas" || t === "conviction" || t === "macro") setTier(t);

    (async () => {
      try {
        setErr(null);
        const res = await fetch("/api/agreements/active", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to load agreement");
        setAgreement(json.agreement);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load agreement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function acceptAndCheckout() {
    try {
      setErr(null);
      if (!agreement?.version) throw new Error("Missing agreement version");

      // record acceptance
      const a = await fetch("/api/agreements/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: agreement.version }),
      });
      const aj = await a.json().catch(() => ({}));
      if (!a.ok) throw new Error(aj?.error ?? "Failed to record acceptance");

      // proceed to checkout
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Checkout failed");
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.35em] text-white/40">AGREEMENT</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Before you purchase</h1>
          <p className="mt-2 text-sm text-white/60">
            You must accept the terms to continue to checkout.
          </p>
        </div>
        <Link
          href="/subscribe"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
        >
          Back
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : err ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {err}
          </div>
        ) : (
          <>
            <div className="text-xs tracking-widest text-white/50">PLAN</div>
            <div className="mt-2 text-lg font-semibold capitalize">{tier}</div>

            <div className="mt-6 text-xs tracking-widest text-white/50">
              {agreement?.title ?? "Terms"}
            </div>
            <div className="mt-3 max-h-[40vh] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/75 leading-relaxed">
              {agreement?.body ?? ""}
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={c1}
                  onChange={(e) => setC1(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>I agree to the Terms of Service and understand this is educational content.</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={c2}
                  onChange={(e) => setC2(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>I understand trading involves risk and I’m responsible for my own decisions.</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={c3}
                  onChange={(e) => setC3(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>I agree to the refund/cancellation policy as described in the agreement.</span>
              </label>
            </div>

            <button
              disabled={!allChecked || loading}
              onClick={acceptAndCheckout}
              className={[
                "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                allChecked ? "bg-white text-black hover:opacity-95" : "border border-white/10 bg-white/5 text-white/50",
                "disabled:opacity-60",
              ].join(" ")}
            >
              Continue to checkout
            </button>

            <div className="mt-3 text-xs text-white/40">
              Agreement version: {agreement?.version ?? "—"}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
""")

# 4) Patch /subscribe page to route purchases through /subscribe/agree?tier=...
sub = Path("src/app/subscribe/page.tsx").read_text(encoding="utf-8")

# Replace TierCard onClick to navigate instead of calling checkout() directly.
# We'll keep checkout() for now (could still be used elsewhere) but route buttons to agree.
sub = sub.replace('onClick={() => checkout("ideas")}', 'onClick={() => (window.location.href = "/subscribe/agree?tier=ideas")}')
sub = sub.replace('onClick={() => checkout("conviction")}', 'onClick={() => (window.location.href = "/subscribe/agree?tier=conviction")}')
sub = sub.replace('onClick={() => checkout("macro")}', 'onClick={() => (window.location.href = "/subscribe/agree?tier=macro")}')

Path("src/app/subscribe/page.tsx").write_text(sub, encoding="utf-8")
print("[OK] patched src/app/subscribe/page.tsx")

# 5) Block checkout unless accepted current active agreement
checkout_path = Path("src/app/api/stripe/checkout/route.ts")
cs = checkout_path.read_text(encoding="utf-8")

if "agreement_acceptances" not in cs:
    block = r"""
  // ✅ Require agreement acceptance before purchase
  const { data: activeAgreement, error: activeErr } = await supabaseAdmin
    .from("active_agreement")
    .select("version")
    .maybeSingle();

  if (activeErr) {
    return NextResponse.json({ error: "Agreement lookup failed" }, { status: 500 });
  }
  const activeVersion = (activeAgreement as any)?.version ?? null;
  if (!activeVersion) {
    return NextResponse.json({ error: "No active agreement set" }, { status: 500 });
  }

  const { data: accepted, error: accErr } = await supabaseAdmin
    .from("agreement_acceptances")
    .select("id")
    .eq("user_id", user.id)
    .eq("agreement_version", activeVersion)
    .maybeSingle();

  if (accErr) {
    return NextResponse.json({ error: "Agreement acceptance check failed" }, { status: 500 });
  }
  if (!accepted) {
    return NextResponse.json(
      { error: "Please accept the agreement before purchase.", code: "AGREEMENT_REQUIRED" },
      { status: 403 },
    );
  }
"""

    # Insert block right after we confirm user exists
    marker = "if (!user) {"
    idx = cs.find(marker)
    if idx == -1:
        raise SystemExit("[ERR] Could not find `if (!user) {` in checkout route.")
    # Insert after that whole block closes (first occurrence of "}" after it)
    end = cs.find("}", idx)
    end = cs.find("\n", end)  # after that line
    cs = cs[:end] + "\n" + block + cs[end:]
    checkout_path.write_text(cs, encoding="utf-8")
    print("[OK] patched agreement gate in", checkout_path)
else:
    print("[OK] agreement gate already present in", checkout_path)
