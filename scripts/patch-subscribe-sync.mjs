import fs from "node:fs";

const file = "src/app/subscribe/page.tsx";
let s = fs.readFileSync(file, "utf8");

// 1) Insert syncPlan() right after the plan state declaration (only if missing)
if (!s.includes("async function syncPlan()")) {
  const planDeclRe =
    /const\s*\[\s*plan\s*,\s*setPlan\s*\]\s*=\s*useState<[^>]*>\(\s*["']free["']\s*\)\s*;\s*/;

  const m = s.match(planDeclRe);
  if (!m) {
    console.error("❌ Could not find: const [plan, setPlan] = useState(...\"free\");");
    process.exit(1);
  }

  const insert = `${m[0]}
  async function syncPlan() {
    try {
      await fetch("/api/billing/sync", { method: "POST" });
    } catch {}
  }

`;
  s = s.replace(planDeclRe, insert);
}

// 2) Replace existing useEffect (the one that fetches /api/me/plan) with sync+fetch
const useEffectRe =
  /useEffect\(\(\)\s*=>\s*\{\s*\(async\s*\(\)\s*=>\s*\{[\s\S]*?fetch\(\s*["']\/api\/me\/plan["'][\s\S]*?\}\)\(\)\s*;\s*\}\s*,\s*\[\s*\]\s*\)\s*;/m;

if (!useEffectRe.test(s)) {
  // fallback: if it doesn't match, try to find ANY useEffect that calls /api/me/plan
  const altRe =
    /useEffect\(\(\)\s*=>\s*\{[\s\S]*?fetch\(\s*["']\/api\/me\/plan["'][\s\S]*?\}\s*,\s*\[\s*\]\s*\)\s*;/m;
  if (altRe.test(s)) {
    s = s.replace(altRe, `useEffect(() => {
    (async () => {
      try {
        // ✅ restore purchases if Stripe says you are subscribed
        await syncPlan();
        const res = await fetch("/api/me/plan", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (json?.plan) setPlan(json.plan);
      } catch {}
    })();
  }, []);`);
  } else {
    console.error("❌ Could not find a useEffect that fetches /api/me/plan to replace.");
    process.exit(1);
  }
} else {
  s = s.replace(useEffectRe, `useEffect(() => {
    (async () => {
      try {
        // ✅ restore purchases if Stripe says you are subscribed
        await syncPlan();
        const res = await fetch("/api/me/plan", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (json?.plan) setPlan(json.plan);
      } catch {}
    })();
  }, []);`);
}

fs.writeFileSync(file, s, "utf8");
console.log("✅ Patched /subscribe to auto-sync plan");
