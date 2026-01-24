import fs from "node:fs";

const file = "src/app/api/stripe/webhook/route.ts";
let s = fs.readFileSync(file, "utf8");

// 1) Insert helpers after stripe init if missing
if (!s.includes("function tierValueUSD(")) {
  const anchor = "const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {";
  const idx = s.indexOf(anchor);
  if (idx === -1) throw new Error("Could not find Stripe init anchor");

  // insert right AFTER stripe init block (best-effort: after the first '});' following init)
  const afterInit = s.indexOf("});", idx);
  if (afterInit === -1) throw new Error("Could not find end of Stripe init");
  const insertPos = afterInit + 3;

  const helpers = `

function tierValueUSD(tier: string | null) {
  if (tier === "ideas") return 29.99;
  if (tier === "conviction") return 79.99;
  if (tier === "macro") return 199.99;
  return undefined;
}

async function getCustomerUserId(customerId: string) {
  try {
    const c = await stripe.customers.retrieve(customerId);
    if ("deleted" in c) return null;
    const v = (c.metadata as any)?.userId ?? null;
    return typeof v === "string" && v.length ? v : null;
  } catch {
    return null;
  }
}
`;
  s = s.slice(0, insertPos) + helpers + s.slice(insertPos);
  console.log("[OK] inserted tierValueUSD + getCustomerUserId helpers");
} else {
  console.log("[OK] helpers already present");
}

// 2) Ensure sendGAEvent calls include userId + value/currency where obvious
// We will patch specific known events by name to avoid breaking structure.

// subscription_created in checkout.session.completed
s = s.replace(
  /await sendGAEvent\(\{\s*clientId:\s*ga_client_id,\s*name:\s*"subscription_created",\s*params:\s*\{\s*([\s\S]*?)\s*\},\s*\}\);/m,
  (m, inner) => {
    if (m.includes("userId:")) return m; // already patched
    return `await sendGAEvent({
              clientId: ga_client_id,
              userId: userIdForGA,
              name: "subscription_created",
              params: {
                ${inner.trim()}
                value: tierValueUSD(tier),
                currency: "USD",
              },
            });`;
  },
);

// Add userIdForGA definition in checkout.session.completed block if missing
if (!s.includes("const userIdForGA")) {
  s = s.replace(
    /const customerId = session\.customer\?\.\s*toString\(\)\s*\?\?\s*null;\s*/m,
    (m) =>
      m +
      `\n      const userIdForGA =\n        (session.metadata?.userId as string) ||\n        (customerId ? await getCustomerUserId(customerId) : null);\n`,
  );
  console.log("[OK] added userIdForGA in checkout.session.completed");
} else {
  console.log("[OK] userIdForGA already present");
}

// subscription_created in customer.subscription.created
s = s.replace(
  /await sendGAEvent\(\{\s*clientId:\s*ga_client_id,\s*name:\s*"subscription_created",\s*params:\s*\{\s*([\s\S]*?)\s*\},\s*\}\);/m,
  (m, inner) => {
    if (m.includes("userId:")) return m;
    return `await sendGAEvent({
              clientId: ga_client_id,
              userId: customerId ? await getCustomerUserId(customerId) : null,
              name: "subscription_created",
              params: {
                ${inner.trim()}
                value: tierValueUSD(tier ?? null),
                currency: "USD",
              },
            });`;
  },
);

// subscription_canceled
s = s.replace(
  /await sendGAEvent\(\{\s*clientId:\s*ga_client_id,\s*name:\s*"subscription_canceled",\s*params:\s*\{\s*event_source:\s*"customer\.subscription\.deleted"\s*\},\s*\}\);/m,
  (m) => {
    if (m.includes("userId:")) return m;
    return `await sendGAEvent({
              clientId: ga_client_id,
              userId: customerId ? await getCustomerUserId(customerId) : null,
              name: "subscription_canceled",
              params: {
                event_source: "customer.subscription.deleted",
              },
            });`;
  },
);

// subscription_upgraded / subscription_downgraded
s = s.replace(
  /await sendGAEvent\(\{\s*clientId:\s*ga_client_id,\s*name:\s*upgrading\s*\?\s*"subscription_upgraded"\s*:\s*"subscription_downgraded",\s*params:\s*\{\s*([\s\S]*?)\s*\},\s*\}\);/m,
  (m, inner) => {
    if (m.includes("from_value:") || m.includes("userId:")) return m;
    return `await sendGAEvent({
                clientId: ga_client_id,
                userId: customerId ? await getCustomerUserId(customerId) : null,
                name: upgrading ? "subscription_upgraded" : "subscription_downgraded",
                params: {
                  ${inner.trim()}
                  from_value: tierValueUSD(prevTier),
                  to_value: tierValueUSD(newTier),
                  value: tierValueUSD(newTier),
                  currency: "USD",
                },
              });`;
  },
);

// subscription_updated (generic)
s = s.replace(
  /await sendGAEvent\(\{\s*clientId:\s*ga_client_id,\s*name:\s*"subscription_updated",\s*params:\s*\{\s*([\s\S]*?)\s*\},\s*\}\);/m,
  (m, inner) => {
    if (m.includes("userId:")) return m;
    return `await sendGAEvent({
                  clientId: ga_client_id,
                  userId: customerId ? await getCustomerUserId(customerId) : null,
                  name: "subscription_updated",
                  params: {
                    ${inner.trim()}
                  },
                });`;
  },
);

// invoice_paid: ensure value/currency uppercase and userId
s = s.replace(
  /await sendGAEvent\(\{\s*clientId:\s*ga_client_id,\s*name:\s*"invoice_paid",\s*params:\s*\{\s*([\s\S]*?)\s*\},\s*\}\);/m,
  (m, inner) => {
    if (m.includes("userId:") && m.includes("value:")) return m;
    // Remove old amount_paid if present and replace with value
    let body = inner.replace(/amount_paid:\s*\([\s\S]*?\),\s*/m, "").trim();
    return `await sendGAEvent({
            clientId: ga_client_id,
            userId: customerId ? await getCustomerUserId(customerId) : null,
            name: "invoice_paid",
            params: {
              ${body}
              value: (invoice.amount_paid ?? 0) / 100,
              currency: String(invoice.currency ?? "usd").toUpperCase(),
            },
          });`;
  },
);

fs.writeFileSync(file, s);
console.log("[DONE] webhook GA events enriched (userId/value/currency)");
