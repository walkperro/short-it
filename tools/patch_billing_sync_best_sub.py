from pathlib import Path
import re

p = Path("src/app/api/billing/sync/route.ts")
s = p.read_text(encoding="utf-8")

# We replace the loop logic with a rank-based compare that updates BOTH tier and subId together.
old_block_pat = re.compile(
    r"let bestTier: string \| null = null;\s*let bestSubId: string \| null = null;\s*for \(const sub of subs\.data\) \{.*?bestSubId = sub\.id;\s*\}",
    re.S
)

if not old_block_pat.search(s):
    raise SystemExit("[ERR] Could not find expected bestTier/bestSubId loop block in billing/sync route.")

new_block = """\
  let bestTier: string | null = null;
  let bestSubId: string | null = null;

  const rank: Record<string, number> = { free: 0, ideas: 1, conviction: 2, macro: 3, admin: 99 };

  for (const sub of subs.data) {
    // Treat these as “has access”
    const okStatus = ["trialing", "active", "past_due", "unpaid"].includes(sub.status);
    if (!okStatus) continue;

    const priceId = (sub.items?.data?.[0]?.price as any)?.id ?? null;
    const tier = tierFromPriceId(priceId);
    if (!tier) continue;

    const currentBest = bestTier ?? "free";
    if (rank[tier] > rank[currentBest]) {
      bestTier = tier;
      bestSubId = sub.id;
    }
  }\
"""

s = old_block_pat.sub(new_block, s, count=1)
p.write_text(s, encoding="utf-8")
print("[OK] patched", p)
