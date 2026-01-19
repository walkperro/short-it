from pathlib import Path
import re

p = Path("src/app/subscribe/page.tsx")
s = p.read_text(encoding="utf-8")

# 1) Replace legal links with /info (no 404)
s = s.replace('href="/legal/terms"', 'href="/info"')
s = s.replace('href="/legal/disclaimer"', 'href="/info"')

# 2) Make acceptAgreements POST include active agreement version (optional) by first fetching active
# If already present, skip.
if "fetch(\"/api/agreements/active\"" not in s:
    # Inject fetch active inside acceptAgreements
    s = re.sub(
        r"async function acceptAgreements\(\) \{\s*setErr\(null\);\s*setAccepting\(true\);\s*try \{\s*const res = await fetch\(\"/api/agreements/accept\", \{ method: \"POST\" \}\);\s*const json = await res\.json\(\)\.catch\(\(\) => \(\{\}\)\);\s*if \(!res\.ok\)\s*throw new Error\(json\?\.error \?\? \"Failed to accept agreements\"\);\s*setAgreed\(true\);\s*\} catch",
        "async function acceptAgreements() {\n"
        "    setErr(null);\n"
        "    setAccepting(true);\n"
        "    try {\n"
        "      // Always accept the currently active agreement version\n"
        "      const a = await fetch(\"/api/agreements/active\", { cache: \"no-store\" });\n"
        "      const aj = await a.json().catch(() => ({}));\n"
        "      const activeVersion = aj?.agreement?.version ?? null;\n"
        "\n"
        "      const res = await fetch(\"/api/agreements/accept\", {\n"
        "        method: \"POST\",\n"
        "        headers: { \"Content-Type\": \"application/json\" },\n"
        "        body: JSON.stringify(activeVersion ? { version: activeVersion } : {}),\n"
        "      });\n"
        "      const json = await res.json().catch(() => ({}));\n"
        "      if (!res.ok)\n"
        "        throw new Error(json?.error ?? \"Failed to accept agreements\");\n"
        "      setAgreed(true);\n"
        "    } catch",
        s,
        count=1,
        flags=re.DOTALL
    )

# 3) Fix redirect for agreement-required in checkout(): it points to /agreements but your page is /subscribe/agree
s = s.replace(
    "window.location.href = `/agreements?next=${encodeURIComponent(next)}&tier=${encodeURIComponent(tier)}`;",
    "window.location.href = `/subscribe/agree?tier=${encodeURIComponent(tier)}`;"
)

p.write_text(s, encoding="utf-8")
print("[OK] patched subscribe page accept flow + fixed legal links + fixed redirect to /subscribe/agree")
