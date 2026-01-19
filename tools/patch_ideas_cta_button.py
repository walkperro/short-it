from pathlib import Path
import re

p = Path("src/app/ideas/[slug]/page.tsx")
s = p.read_text(encoding="utf-8")

old = r"""
<div className="mt-4">
\s*{isLockedForViewer \? \(
\s*<Link[\s\S]*?subscribe here[\s\S]*?</Link>
\s*\) : \(
\s*<Link[\s\S]*?click here[\s\S]*?</Link>
\s*\)}
\s*</div>
"""

new = """
<div className="mt-6 flex justify-center">
  {isLockedForViewer ? (
    <Link
      href="/subscribe"
      className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10 hover:border-white/25 transition"
    >
      Click to see full details
    </Link>
  ) : (
    <Link
      href={`/ideas/${idea.slug}/full`}
      className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10 hover:border-white/25 transition"
    >
      Click to see full details
    </Link>
  )}
</div>
"""

s2, n = re.subn(old, new, s, flags=re.X)
if n == 0:
    raise SystemExit("[ERR] Could not find the existing details link block")

p.write_text(s2, encoding="utf-8")
print("[OK] Ideas teaser CTA converted to button:", p)
