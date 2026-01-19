from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def die(msg: str):
    raise SystemExit("[ERR] " + msg)

def write_if_changed(p: Path, s: str):
    old = p.read_text(encoding="utf-8")
    if old == s:
        print("[OK] no change", p)
        return
    p.write_text(s, encoding="utf-8")
    print("[OK] patched", p)

# 1) conviction/[slug]/full: add Back to Convictions link
conv_full = ROOT / "src/app/conviction/[slug]/full/page.tsx"
if not conv_full.exists():
    die(f"missing {conv_full}")

s = conv_full.read_text(encoding="utf-8")
if "Back to Convictions" not in s:
    block = """
      <div className="mt-6">
        <Link
          href="/conviction"
          className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
        >
          Back to Convictions
        </Link>
      </div>
"""
    idx = s.rfind("</main>")
    if idx == -1:
        die("Could not find </main> in conviction/[slug]/full/page.tsx")
    s = s[:idx] + block + s[idx:]
    write_if_changed(conv_full, s)
else:
    print("[OK] already has Back to Convictions", conv_full)

# 2) ideas/[slug] teaser: add “see rest of fields” link (full idea if unlocked, subscribe if locked)
idea_teaser = ROOT / "src/app/ideas/[slug]/page.tsx"
if not idea_teaser.exists():
    die(f"missing {idea_teaser}")

t = idea_teaser.read_text(encoding="utf-8")

if "To see the rest of the fields" not in t:
    # Insert right after the PREVIEW paragraph block
    # We target the closing </p> of the preview paragraph and inject after it.
    injection = r"""
            </p>
            <div className="mt-4">
              {isLockedForViewer ? (
                <Link
                  href="/subscribe"
                  className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
                >
                  To see the rest of the fields (target, strike, exp, and full details), subscribe here
                </Link>
              ) : (
                <Link
                  href={`/ideas/${idea.slug}/full`}
                  className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
                >
                  To see the rest of the fields (target, strike, exp, and full details), click here
                </Link>
              )}
            </div>
"""
    # Find the preview paragraph close in the teaser card
    pat = r'(<div className="text-xs tracking-widest text-white/40">PREVIEW</div>\s*<p[^>]*>\s*{teaser}\s*)</p>'
    m = re.search(pat, t, flags=re.S)
    if not m:
        die("Could not locate the PREVIEW paragraph in ideas/[slug]/page.tsx to insert the full-link block.")
    t = re.sub(pat, r"\1" + injection, t, flags=re.S, count=1)
    write_if_changed(idea_teaser, t)
else:
    print("[OK] already has teaser full-fields link", idea_teaser)

# 3) conviction/[slug] teaser: add CTA to read full conviction (subscribe if not allowed)
conv_teaser = ROOT / "src/app/conviction/[slug]/page.tsx"
if not conv_teaser.exists():
    die(f"missing {conv_teaser}")

c = conv_teaser.read_text(encoding="utf-8")

if "Subscribe to read the whole conviction" not in c and "Read the full conviction →" not in c:
    # Put CTA under the teaser card content (inside the main card wrapper, near the bottom)
    # We'll inject right AFTER the teaser card closing </div> that wraps the teaser text,
    # but BEFORE the {!allowed ? (...locked upsell...) : null} block.
    cta_block = """
      <div className="mt-5">
        {allowed ? (
          <Link
            href={`/conviction/${slug}/full`}
            className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
          >
            Read the full conviction →
          </Link>
        ) : (
          <Link
            href="/subscribe"
            className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
          >
            Subscribe to read the whole conviction →
          </Link>
        )}
      </div>
"""
    anchor = r'(</div>\s*</div>\s*)(\s*{!allowed\s*\?\s*\()'
    if not re.search(anchor, c, flags=re.S):
        die("Could not find insertion point in conviction/[slug]/page.tsx (before the locked upsell block).")
    c = re.sub(anchor, r"\1" + cta_block + r"\2", c, flags=re.S, count=1)
    write_if_changed(conv_teaser, c)
else:
    print("[OK] already has conviction teaser CTA", conv_teaser)

print("[DONE] Patched conviction full back-link + ideas teaser full-fields link + conviction teaser subscribe/read link.")
