import fs from "fs";

const file = "src/app/subscribe/agree/page.tsx";
let s = fs.readFileSync(file, "utf8");

// Replace the whole "Grab GA client_id (best-effort)" block with a clean version
s = s.replace(
  /\/\/ Grab GA client_id \(best-effort\)[\s\S]*?\/\/ proceed to checkout \(or portal redirect \/ switch\)/m,
  `// Grab GA client_id (best-effort)
      let ga_client_id: string | null = getGaClientId();

      // Optional fallback: ask gtag directly (won't block longer than 250ms)
      if (!ga_client_id) {
        try {
          const w: any = typeof window !== "undefined" ? (window as any) : null;
          if (w && typeof w.gtag === "function") {
            await new Promise<void>((resolve) => {
              try {
                w.gtag("get", "G-XXXXXXXXXX", "client_id", (cid: any) => {
                  ga_client_id = cid ? String(cid) : null;
                  resolve();
                });
              } catch {
                resolve();
              }
              setTimeout(resolve, 250);
            });
          }
        } catch {}
      }

      // proceed to checkout (or portal redirect / switch)`,
);

// IMPORTANT: We inserted a placeholder measurement id above. Replace it by removing the gtag fallback entirely
// because it requires knowing the Measurement ID. We'll just rely on cookie.
s = s.replace(
  /\/\/ Optional fallback:[\s\S]*?catch \{\}\s*\}\s*\n\s*\}\s*\n/m,
  "",
);

fs.writeFileSync(file, s);
console.log(
  "[DONE] cleaned agree ga_client_id: cookie-only, no measurementId dependency",
);
