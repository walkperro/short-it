import fs from "node:fs";

const file = "src/app/api/billing/sync/route.ts";
if (!fs.existsSync(file)) {
  console.error("❌ Missing:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");
if (s.includes("export async function GET")) {
  console.log("ℹ️ GET already exists for billing sync");
  process.exit(0);
}

const postRe = /export\s+async\s+function\s+POST\s*\(/;
if (!postRe.test(s)) {
  console.error("❌ Could not find POST() in billing sync route.");
  process.exit(1);
}

// Add a GET handler that calls POST
s += `

export async function GET(req: Request) {
  // convenience for debugging in browser
  return POST(req as any);
}
`;

fs.writeFileSync(file, s, "utf8");
console.log("✅ Added GET support to /api/billing/sync");
