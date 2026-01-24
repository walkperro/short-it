import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
let s = fs.readFileSync(file, "utf8");

// We will:
// - Change `const sub = await stripe.subscriptions.retrieve...` to `subForGA = await ...`
// - Add `let subForGA: any = null;` before the subId retrieval
// - Replace the GA send block to compute ga_client_id via pickGaClientId({ sub: subForGA, customerId })

// 1) Add `let subForGA: any = null;` right after subId is declared (only inside invoice.payment_succeeded block)
s = s.replace(
  /const subId\s*=\s*[\s\S]*?\?\s*null;\s*\n/m,
  (m) => m + `\n        let subForGA: any = null;\n`,
);

// 2) Replace `const sub = await stripe.subscriptions.retrieve(` with `subForGA = await stripe.subscriptions.retrieve(`
// (only the first occurrence after invoice block starts — safe enough because this route only retrieves sub here)
s = s.replace(
  /const sub = await stripe\.subscriptions\.retrieve\(/,
  "subForGA = await stripe.subscriptions.retrieve(",
);

// 3) Replace `priceId = (sub.items...` to use subForGA
s = s.replace(
  /priceId = \(sub\.items\.data\[0\]\?\.price as any\)\?\.id \?\? null;/,
  "priceId = (subForGA?.items?.data?.[0]?.price as any)?.id ?? null;",
);

// 4) Fix GA block to compute ga_client_id locally and use it
s = s.replace(
  /\/\/ ✅ GA renewal\/revenue signal\s*[\s\S]*?if \(customerId\) \{\s*[\s\S]*?clientId:\s*ga_client_id,[\s\S]*?\}\);\s*\}\s*/m,
  `// ✅ GA renewal/revenue signal
        try {
          const ga_client_id = await pickGaClientId({
            sub: subForGA,
            customerId,
          });

          if (ga_client_id) {
            await sendGAEvent({
              clientId: ga_client_id,
              name: "invoice_paid",
              params: {
                tier: tier ?? "unknown",
                subscription_id: subId ?? undefined,
                invoice_id: invoice.id,
                amount_paid: (invoice.amount_paid ?? 0) / 100,
                currency: invoice.currency ?? undefined,
                event_source: "invoice.payment_succeeded",
              },
            });
          }
        } catch {
          // swallow
        }
`,
);

fs.writeFileSync(file, s);
console.log("[DONE] fixed invoice.payment_succeeded ga_client_id usage");
