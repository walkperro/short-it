import fs from "node:fs";

function patch(file) {
  let s = fs.readFileSync(file, "utf8");
  if (!s.includes("checkout.sessions.create")) return false;
  if (s.includes("allow_promotion_codes")) return false;

  // Insert allow_promotion_codes near `mode:` if present
  const re = /(\bmode\s*:\s*["'][^"']+["']\s*,)/;
  if (!re.test(s)) return false;

  s = s.replace(re, `$1\n      allow_promotion_codes: true,`);
  fs.writeFileSync(file, s, "utf8");
  console.log("✅ Enabled allow_promotion_codes in", file);
  return true;
}

// try likely files first, then fallback to a small scan
const candidates = [
  "src/app/api/billing/checkout/route.ts",
  "src/app/api/checkout/route.ts",
  "src/app/api/stripe/checkout/route.ts",
];

let did = false;
for (const f of candidates) {
  if (fs.existsSync(f)) did = patch(f) || did;
}

if (!did) {
  // scan api routes shallowly
  const apiDir = "src/app/api";
  const stack = [apiDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      const p = `${dir}/${name}`;
      const st = fs.statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (p.endsWith("route.ts")) did = patch(p) || did;
    }
  }
}

if (!did) {
  console.error("❌ Couldn't find a checkout.sessions.create file to patch.");
  process.exit(1);
}
