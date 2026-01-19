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

# 1) Fix CTA component: title + subtitle each 1 line (truncate), arrow stays
cta_path = ROOT / "src/components/ReadFullConvictionCta.tsx"
if not cta_path.exists():
    die(f"missing {cta_path}")

cta_new = """import Link from "next/link";

export default function ReadFullConvictionCta({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "group mt-8 block rounded-3xl border border-white/10 bg-white/5",
        "px-6 py-5 backdrop-blur-xl transition",
        "hover:bg-white/7 hover:border-white/15",
        "hover:-translate-y-[1px]",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight text-white truncate">
            READ THE FULL CONVICTION
          </div>

          <div className="mt-2 text-xs tracking-[0.35em] text-white/40 truncate">
            Thesis • Time Expectations • Catalysts
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/70 transition group-hover:bg-black/40 group-hover:text-white/85">
          <span className="text-lg leading-none">→</span>
        </div>
      </div>
    </Link>
  );
}
"""
write_if_changed(cta_path, cta_new)

# 2) ideas/[slug]/full: add CTA + Back to Ideas (only if a conviction exists)
idea_full = ROOT / "src/app/ideas/[slug]/full/page.tsx"
if not idea_full.exists():
    die(f"missing {idea_full}")

s = idea_full.read_text(encoding="utf-8")

if 'from "@/components/ReadFullConvictionCta"' not in s:
    # insert after next/link import if present, else after first import block
    if 'import Link from "next/link";' in s:
        s = s.replace(
            'import Link from "next/link";',
            'import Link from "next/link";\nimport ReadFullConvictionCta from "@/components/ReadFullConvictionCta";'
        )
    else:
        s = s.replace(
            "import type { Metadata } from \"next\";",
            "import type { Metadata } from \"next\";\nimport ReadFullConvictionCta from \"@/components/ReadFullConvictionCta\";"
        )

# Add conviction existence query after we have idea loaded & i defined
# We'll place it right after: const i = idea as any as IdeaRow;
if "const hasConviction" not in s:
    s = s.replace(
        "const i = idea as any as IdeaRow;",
        "const i = idea as any as IdeaRow;\n\n  const { data: conv } = await supabaseAdmin\n    .from(\"convictions\")\n    .select(\"id\")\n    .eq(\"status\", \"published\")\n    .eq(\"idea_id\", (idea as any).id)\n    .maybeSingle();\n\n  const hasConviction = Boolean(conv?.id);"
    )

# Insert CTA + Back-to-Ideas before closing </main> (only once)
cta_block = """
      {hasConviction ? (
        <ReadFullConvictionCta href={`/conviction/${i.slug}/full`} />
      ) : null}

      <div className="mt-6">
        <Link
          href="/ideas"
          className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
        >
          Back to Ideas
        </Link>
      </div>
"""
if "ReadFullConvictionCta href={`/conviction/${i.slug}/full`}" not in s:
    # place before the final </main> inside the return
    m = re.search(r"\n\s*</main>\s*\)\s*;\s*\n\}\s*$", s, flags=re.M)
    if not m:
        die("Could not find </main> marker to insert CTA + Back link in ideas/[slug]/full")
    insert_at = m.start()
    s = s[:insert_at] + cta_block + s[insert_at:]

write_if_changed(idea_full, s)

# 3) conviction/[slug] teaser: add Back to Convictions at bottom
conv_teaser = ROOT / "src/app/conviction/[slug]/page.tsx"
if not conv_teaser.exists():
    die(f"missing {conv_teaser}")

c = conv_teaser.read_text(encoding="utf-8")

back_block = """
      <div className="mt-6">
        <Link
          href="/conviction"
          className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
        >
          Back to Convictions
        </Link>
      </div>
"""

if "Back to Convictions" not in c:
    m = re.search(r"\n\s*</main>\s*\)\s*;\s*\n\}\s*$", c, flags=re.M)
    if not m:
        die("Could not find </main> marker to insert Back to Convictions in conviction/[slug]")
    insert_at = m.start()
    c = c[:insert_at] + back_block + c[insert_at:]
    write_if_changed(conv_teaser, c)
else:
    print("[OK] already has Back to Convictions", conv_teaser)

print("[DONE] UI round2 patches applied.")
