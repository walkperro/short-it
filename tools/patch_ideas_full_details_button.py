from pathlib import Path

p = Path("src/app/ideas/[slug]/page.tsx")
s = p.read_text(encoding="utf-8")

def find_prev(hay: str, needle: str, start: int) -> int:
    i = hay.rfind(needle, 0, start)
    return i

def find_next(hay: str, needle: str, start: int) -> int:
    i = hay.find(needle, start)
    return i

def find_matching_div_end(hay: str, div_start: int) -> int:
    """
    Given index at '<div', find index just AFTER the matching closing </div>.
    Very small scanner that counts <div ...> and </div>.
    """
    i = div_start
    depth = 0
    while i < len(hay):
        open_i = hay.find("<div", i)
        close_i = hay.find("</div>", i)
        if close_i == -1:
            raise ValueError("No closing </div> found while scanning.")

        if open_i != -1 and open_i < close_i:
            depth += 1
            i = open_i + 4
            continue

        # close
        depth -= 1
        i = close_i + len("</div>")
        if depth == 0:
            return i

    raise ValueError("Unbalanced div tags while scanning.")

# --- 1) Remove the FULL DETAILS block (entire mt-5 wrapper that contains 'FULL DETAILS') ---
needle = "FULL DETAILS"
pos = s.find(needle)
if pos == -1:
    raise SystemExit("[ERR] Could not find 'FULL DETAILS' in ideas/[slug]/page.tsx")

# walk back to the nearest '<div className="mt-5"' that wraps this section
wrapper = '<div className="mt-5"'
start = find_prev(s, wrapper, pos)
if start == -1:
    # fallback: any <div className="mt-5"> (older format)
    wrapper2 = '<div className="mt-5">'
    start = find_prev(s, wrapper2, pos)
if start == -1:
    raise SystemExit('[ERR] Could not find the mt-5 wrapper div above "FULL DETAILS".')

# ensure it's really the FULL DETAILS block by checking it contains the needle before it closes
end = find_matching_div_end(s, start)
chunk = s[start:end]
if needle not in chunk:
    raise SystemExit('[ERR] Found an mt-5 div, but it did not contain "FULL DETAILS".')

s2 = s[:start] + "\n" + s[end:]

# --- 2) Insert a button-style CTA OUTSIDE the card: just before </main> ---
insert_marker = "</main>"
mpos = s2.rfind(insert_marker)
if mpos == -1:
    raise SystemExit("[ERR] Could not find </main> insertion marker.")

cta = """
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

s3 = s2[:mpos] + cta + s2[mpos:]

p.write_text(s3, encoding="utf-8")
print("[OK] patched", p)
