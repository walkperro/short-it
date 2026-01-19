from pathlib import Path

p = Path("src/app/subscribe/page.tsx")
s = p.read_text(encoding="utf-8")

if "AGREEMENTS_VERSION" not in s:
    s = s.replace(
        'type Tier = "free" | "ideas" | "conviction" | "macro" | "admin";',
        'type Tier = "free" | "ideas" | "conviction" | "macro" | "admin";\n\nconst AGREEMENTS_VERSION = process.env.NEXT_PUBLIC_AGREEMENTS_VERSION || "2026-01-18";'
    )

# Add state
if "agreed" not in s:
    s = s.replace(
        'const [err, setErr] = useState<string | null>(null);',
        'const [err, setErr] = useState<string | null>(null);\n  const [agreed, setAgreed] = useState(false);\n  const [accepting, setAccepting] = useState(false);'
    )

# When loading plan, set agreed if accepted
needle = "if (json?.plan) setPlan(json.plan as Tier);"
if needle in s and "setAgreed" not in s:
    s = s.replace(
        needle,
        needle
        + '\n              const v = json?.profile?.agreements_version ?? null;\n              const at = json?.profile?.agreements_accepted_at ?? null;\n              if (v === AGREEMENTS_VERSION and at) {\n                setAgreed(true);\n              }'
        .replace("and", "&&")  # python string to TS
    )

# Add accept handler
if "async function acceptAgreements" not in s:
    s = s.replace(
        "async function checkout(tier: Exclude<Tier, \"free\" | \"admin\">) {",
        "async function acceptAgreements() {\n"
        "    setErr(null);\n"
        "    setAccepting(true);\n"
        "    try {\n"
        "      const res = await fetch(\"/api/agreements/accept\", { method: \"POST\" });\n"
        "      const json = await res.json().catch(() => ({}));\n"
        "      if (!res.ok) throw new Error(json?.error ?? \"Failed to accept agreements\");\n"
        "      setAgreed(true);\n"
        "    } catch (e: any) {\n"
        "      setErr(e?.message ?? \"Failed to accept agreements.\");\n"
        "    } finally {\n"
        "      setAccepting(false);\n"
        "    }\n"
        "  }\n\n"
        "  async function checkout(tier: Exclude<Tier, \"free\" | \"admin\">) {"
    )

# Insert agreements UI near top (after intro)
if "AGREEMENTS GATE" not in s:
    insert_after = "<p className=\"mt-2 text-sm text-white/60\">"
    idx = s.find(insert_after)
    if idx == -1:
        raise SystemExit("[ERR] Could not locate intro paragraph to insert agreements UI")

    # Insert after the closing </p> of that paragraph
    end_p = s.find("</p>", idx)
    if end_p == -1:
        raise SystemExit("[ERR] Could not find end of intro paragraph")
    end_p += 4

    gate = """
      {/* AGREEMENTS GATE */}
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-semibold">Before purchase</div>
        <p className="mt-2 text-sm text-white/60">
          You must accept the Terms + Disclaimer to subscribe.
        </p>

        <label className="mt-4 flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            I agree to the{" "}
            <Link href="/legal/terms" className="underline underline-offset-4 hover:text-white">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/disclaimer" className="underline underline-offset-4 hover:text-white">
              Disclaimer
            </Link>
            .
          </span>
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={acceptAgreements}
            disabled={!agreed || accepting}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-semibold transition",
              !agreed || accepting ? "border border-white/10 bg-white/5 text-white/50" : "bg-white text-black hover:opacity-95",
            ].join(" ")}
          >
            {accepting ? "Saving..." : "Accept & Continue"}
          </button>

          <Link
            href="/account"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Back to account
          </Link>
        </div>

        {!agreed ? (
          <div className="mt-3 text-xs text-white/50">
            Subscription buttons will unlock after you accept.
          </div>
        ) : null}
      </div>
"""
    s = s[:end_p] + gate + s[end_p:]

# Disable tier cards until agreed
# We do it by passing disabled={loading || !agreed} to TierCard calls
s = s.replace("disabled={loading}", "disabled={loading || !agreed}")

p.write_text(s, encoding="utf-8")
print("[OK] patched", p)
