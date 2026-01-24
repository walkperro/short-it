import fs from "fs";

const file = "src/app/subscribe/agree/page.tsx";
let s = fs.readFileSync(file, "utf8");

// Add getGaClientId helper near top if missing
if (!s.includes("function getGaClientId()")) {
  s = s.replace(
    /type Tier = "ideas" \| "conviction" \| "macro";\s*/m,
    `function getGaClientId() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\\s*)_ga=([^;]+)/);
  if (!m) return null;
  const v = decodeURIComponent(m[1] || "");
  const parts = v.split(".");
  if (parts.length >= 4) return \`\${parts[parts.length - 2]}.\${parts[parts.length - 1]}\`;
  return v || null;
}

type Tier = "ideas" | "conviction" | "macro";

`,
  );
}

// Patch the checkout fetch body to include ga_client_id
s = s.replace(
  /body:\s*JSON\.stringify\(\{\s*tier\s*\}\),/m,
  `body: JSON.stringify({
        tier,
        ga_client_id: getGaClientId() || undefined,
      }),`,
);

fs.writeFileSync(file, s);
console.log("[DONE] patched agree page to include ga_client_id");
