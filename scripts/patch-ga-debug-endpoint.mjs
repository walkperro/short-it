import fs from "fs";

const file = "src/lib/analytics/ga.ts";
let s = fs.readFileSync(file, "utf8");

// Replace URL line to switch between debug + normal
s = s.replace(
  /const url = `https:\/\/www\.google-analytics\.com\/mp\/collect\?measurement_id=\$\{measurementId\}&api_secret=\$\{apiSecret\}`;/m,
  `const base = process.env.GA_DEBUG === "1"
    ? "https://www.google-analytics.com/debug/mp/collect"
    : "https://www.google-analytics.com/mp/collect";
  const url = \`\${base}?measurement_id=\${measurementId}&api_secret=\${apiSecret}\`;`,
);

// Add debug_mode param injection (safe if already present)
if (!s.includes("debug_mode")) {
  s = s.replace(/params = \{\},/m, `params = {},`);
  s = s.replace(
    /events:\s*\[\{\s*name,\s*params\s*\}\],/m,
    `events: [{ name, params: { ...(process.env.GA_DEBUG === "1" ? { debug_mode: 1 } : {}), ...params } }],`,
  );
}

fs.writeFileSync(file, s);
console.log("[DONE] patched GA: debug endpoint + debug_mode when GA_DEBUG=1");
