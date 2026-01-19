from pathlib import Path
import re

p = Path("src/app/info/InfoClient.tsx")
s = p.read_text(encoding="utf-8")

# 1) Expand tab union
s = s.replace(
    'useState<"about" | "faq" | "contact">("about")',
    'useState<"about" | "faq" | "legal" | "contact">("about")'
)

# 2) Add Legal tab button between FAQ and Contact
if 'setTab("legal")' not in s:
    s = s.replace(
        '<TabButton active={tab === "faq"} onClick={() => setTab("faq")}>\n                                      FAQ                                             </TabButton>',
        '<TabButton active={tab === "faq"} onClick={() => setTab("faq")}>\n                                      FAQ                                             </TabButton>\n'
        '                                      <TabButton active={tab === "legal"} onClick={() => setTab("legal")}>\n'
        '                                        Legal\n'
        '                                      </TabButton>'
    )

# 3) Render Legal component
if "{tab === \"legal\"" not in s:
    s = s.replace(
        '{tab === "faq" && <FAQ />}                        {tab === "contact" && <Contact />}',
        '{tab === "faq" && <FAQ />}                        {tab === "legal" && <Legal />}                        {tab === "contact" && <Contact />}'
    )

# 4) Append Legal() component near FAQ/Contact (simple)
if "function Legal()" not in s:
    insert_point = s.rfind("function Contact()")
    if insert_point == -1:
        raise SystemExit("[ERR] Could not find insertion point before Contact()")

    legal_fn = """
function Legal() {
  return (
    <section className="space-y-5">
      <GlassCard title="Terms of Service (summary)">
        Short-It provides educational market commentary. Content is informational only and is not
        investment advice. You are responsible for your own decisions and risk management.
      </GlassCard>

      <GlassCard title="Risk Disclosure / Disclaimer">
        Trading and investing involve substantial risk, including possible total loss. Past performance
        does not guarantee future results. Nothing on Short-It constitutes a recommendation to buy or
        sell any security.
      </GlassCard>

      <GlassCard title="Refunds & Cancellation">
        You can cancel anytime from your Account page via Manage billing. Cancellation stops future
        renewals; access remains active until the end of your current billing period. Unless explicitly
        stated otherwise, we do not provide refunds or prorated credits.
      </GlassCard>

      <GlassCard title="Need the full agreement text?">
        The current membership agreement is shown during checkout and must be accepted before purchase.
      </GlassCard>
    </section>
  );
}
"""
    s = s[:insert_point] + legal_fn + "\n\n" + s[insert_point:]

p.write_text(s, encoding="utf-8")
print("[OK] added Legal tab to /info")
