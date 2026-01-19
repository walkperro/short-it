from pathlib import Path

p = Path("src/app/subscribe/page.tsx")
s = p.read_text(encoding="utf-8")

if "openPortal" in s:
    raise SystemExit("[ERR] portal helper already exists in subscribe page")

# Insert helper near checkout()
needle = "async function checkout"
pos = s.find(needle)
if pos == -1:
    raise SystemExit("[ERR] Could not find checkout() function")

helper = r'''
  async function openPortal() {
    setErr(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to open billing portal");
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message ?? "Failed to open billing portal");
    }
  }

'''
s2 = s[:pos] + helper + s[pos:]

# Change onClick handlers to: if currentRank>0 -> openPortal else checkout(tier)
s2 = s2.replace('onClick={() => checkout("ideas")}', 'onClick={() => (currentRank > 0 ? openPortal() : checkout("ideas"))}')
s2 = s2.replace('onClick={() => checkout("conviction")}', 'onClick={() => (currentRank > 0 ? openPortal() : checkout("conviction"))}')
s2 = s2.replace('onClick={() => checkout("macro")}', 'onClick={() => (currentRank > 0 ? openPortal() : checkout("macro"))}')

p.write_text(s2, encoding="utf-8")
print("[OK] patched", p)
