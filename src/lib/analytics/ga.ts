export async function sendGAEvent({
  clientId,
  name,
  params = {},
}: {
  clientId: string;
  name: string;
  params?: Record<string, any>;
}) {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;
  const apiSecret = process.env.GA_MEASUREMENT_SECRET;

  if (!measurementId || !apiSecret) return;

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  // Never throw up the stack in a webhook
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name, params }],
      }),
    });
  } catch {
    // swallow
  }
}
