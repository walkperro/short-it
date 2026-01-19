from pathlib import Path
import re

p = Path("src/app/api/stripe/checkout/route.ts")
s = p.read_text(encoding="utf-8")

# 1) Ensure Stripe import exists (you already have stripe from "@/lib/stripe/stripe")
if 'stripe.billingPortal.sessions.create' in s:
    raise SystemExit("[ERR] Looks like portal redirect already exists in checkout route.")

# 2) Insert "active subscription check" after customerId is ensured, before checkout session creation.
marker = "const siteUrl ="
idx = s.find(marker)
if idx == -1:
    raise SystemExit("[ERR] Could not find insertion point: 'const siteUrl ='")

insert = r'''
  // ✅ If user already has an active subscription, do NOT create another one.
  // Send them to Billing Portal to upgrade/downgrade instead.
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  const hasActive = (subs.data || []).some((sub) =>
    ["trialing", "active", "past_due", "unpaid"].includes(sub.status),
  );

  if (hasActive) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/account?sync=1`,
    });
    return NextResponse.json({ url: portal.url, mode: "portal" });
  }

'''

# We need siteUrl available for return_url, so insert after siteUrl is declared.
# We'll insert a second insertion right after "const siteUrl = ..."
m = re.search(r'(const siteUrl\s*=\s*[^;]+;\s*)', s)
if not m:
    raise SystemExit("[ERR] Could not locate full 'const siteUrl = ...;' statement.")

site_decl = m.group(1)
s2 = s.replace(site_decl, site_decl + insert)

p.write_text(s2, encoding="utf-8")
print("[OK] patched", p)
