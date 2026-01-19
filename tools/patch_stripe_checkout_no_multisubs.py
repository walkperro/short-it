from pathlib import Path
import re

p = Path("src/app/api/stripe/checkout/route.ts")
s = p.read_text(encoding="utf-8")

if "stripe.checkout.sessions.create" not in s:
    raise SystemExit("[ERR] Could not find checkout.sessions.create in checkout route.")

# 1) Ensure siteUrl exists before our guard (we'll insert right AFTER siteUrl line)
siteurl_pat = r"const siteUrl\s*=\s*[^;]+;"
m = re.search(siteurl_pat, s)
if not m:
    raise SystemExit("[ERR] Could not find `const siteUrl = ...;` in checkout route.")

siteurl_stmt_end = m.end()

guard_ts = r"""
  // 🔒 Prevent multiple subscriptions:
  // Stripe Checkout in subscription mode ALWAYS creates a new subscription.
  // If this customer already has an active subscription, send them to Billing Portal for upgrades/downgrades.
  const existing = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const hasActive = existing.data.some((sub) =>
    ["active", "trialing", "past_due", "unpaid"].includes(sub.status),
  );

  if (hasActive) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/account`,
    });
    return NextResponse.json({
      url: portal.url,
      note: "Existing subscription found — routed to Billing Portal.",
    });
  }
"""

# Insert guard once
if "Prevent multiple subscriptions" not in s:
    s = s[:siteurl_stmt_end] + "\n" + guard_ts + s[siteurl_stmt_end:]

# 2) Add Stripe’s built-in consent_collection to Checkout session create (terms required)
# Only if not already present
if "consent_collection" not in s:
    s = s.replace(
        'mode: "subscription",',
        'mode: "subscription",\n    consent_collection: { terms_of_service: "required" },',
        1,
    )

p.write_text(s, encoding="utf-8")
print("[OK] patched", p)
