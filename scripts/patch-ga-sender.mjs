import fs from "node:fs";

const file = "src/lib/analytics/ga.ts";

const next = `export async function sendGAEvent({
  clientId,
  name,
  params = {},
  userId,
}: {
  clientId: string;
  name: string;
  params?: Record<string, any>;
  userId?: string | null;
}) {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;
  const apiSecret = process.env.GA_MEASUREMENT_SECRET;
  if (!measurementId || !apiSecret) return;

  const url = \`https://www.google-analytics.com/mp/collect?measurement_id=\${measurementId}&api_secret=\${apiSecret}\`;

  const debug =
    String(process.env.GA_DEBUG || "")
      .trim()
      .toLowerCase() === "true";

  // Never throw up the stack in a webhook
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        ...(userId ? { user_id: userId } : {}),
        events: [
          {
            name,
            params: {
              ...params,
              ...(debug ? { debug_mode: true } : {}),
            },
          },
        ],
      }),
    });
  } catch {
    // swallow
  }
}
`;

fs.writeFileSync(file, next);
console.log("[DONE] ga.ts replaced with debug_mode + user_id support");
