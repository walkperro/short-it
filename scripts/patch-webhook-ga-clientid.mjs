import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
let s = fs.readFileSync(file, "utf8");

// Guard: must contain sendGAEvent import
if (!s.includes("sendGAEvent")) {
  console.log("[ERR] sendGAEvent not found in webhook route. Aborting.");
  process.exit(1);
}

// 1) Insert helpers (idempotent)
if (!s.includes("async function getCustomerGaClientId")) {
  // Find stripe init block and insert after it
  const anchor = "const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {";
  const idx = s.indexOf(anchor);
  if (idx === -1) {
    console.log("[ERR] Could not locate Stripe init block.");
    process.exit(1);
  }
  const insertAt = s.indexOf("});", idx);
  if (insertAt === -1) {
    console.log("[ERR] Could not locate end of Stripe init block.");
    process.exit(1);
  }

  const helpers = `

async function getCustomerGaClientId(customerId: string) {
  try {
    const c = await stripe.customers.retrieve(customerId);
    if ("deleted" in c) return null;
    const v = (c.metadata as any)?.ga_client_id ?? null;
    return typeof v === "string" && v.length ? v : null;
  } catch {
    return null;
  }
}

async function pickGaClientId(input: {
  session?: Stripe.Checkout.Session | null;
  sub?: Stripe.Subscription | null;
  customerId?: string | null;
}) {
  const fromSession = (input.session?.metadata as any)?.ga_client_id ?? null;
  if (typeof fromSession === "string" && fromSession.length) return fromSession;

  const fromSub = (input.sub?.metadata as any)?.ga_client_id ?? null;
  if (typeof fromSub === "string" && fromSub.length) return fromSub;

  const cid = input.customerId ?? null;
  if (cid) return await getCustomerGaClientId(cid);

  return null;
}
`;

  s = s.slice(0, insertAt + 3) + helpers + s.slice(insertAt + 3);
  console.log("[OK] inserted GA client id helpers");
} else {
  console.log("[OK] GA client id helpers already present");
}

// 2) Replace GA send blocks to use ga_client_id instead of customerId
// checkout.session.completed block
s = s.replace(
  /\/\/ ✅ GA event \(non-blocking\)[\s\S]*?await sendGAEvent\(\{[\s\S]*?clientId:\s*customerId,[\s\S]*?\}\);\s*\}\s*\n/s,
  `// ✅ GA event (non-blocking)
      try {
        const ga_client_id = await pickGaClientId({ session, customerId });
        if (ga_client_id) {
          await sendGAEvent({
            clientId: ga_client_id,
            name: "subscription_created",
            params: {
              tier,
              plan_label: planLabel(tier),
              event_source: "checkout.session.completed",
            },
          });
        }
      } catch {}
`,
);

// subscription events section: replace any sendGAEvent clientId: customerId -> clientId: ga_client_id (plus compute once)
if (!s.includes("const ga_client_id = await pickGaClientId({ sub, customerId"));
{
  // Add a single computed ga_client_id at top of subscription event GA try block
  s = s.replace(
    /\/\/ ✅ GA events \(non-blocking\)\s*\n\s*try\s*\{\s*\n\s*if\s*\(customerId\)\s*\{/,
    `// ✅ GA events (non-blocking)
      try {
        const ga_client_id = await pickGaClientId({ sub, customerId });
        if (ga_client_id) {`,
  );

  // Replace clientId: customerId occurrences inside that GA try block
  s = s.replace(/clientId:\s*customerId/g, "clientId: ga_client_id");

  // Close if block stays correct (your code already closes try/catch)
  console.log("[OK] patched subscription event GA clientId usage");
}

// invoice.payment_succeeded: replace clientId: customerId with computed ga_client_id
s = s.replace(
  /\/\/ ✅ GA renewal\/revenue signal[\s\S]*?if\s*\(customerId\)\s*\{\s*\n\s*await sendGAEvent\(\{[\s\S]*?clientId:\s*customerId,[\s\S]*?\}\);\s*\n\s*\}\s*\n/s,
  `// ✅ GA renewal/revenue signal
      try {
        const ga_client_id = await pickGaClientId({ customerId });
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
      } catch {}
`,
);

fs.writeFileSync(file, s);
console.log("[DONE] webhook patched");
