export type Ga4Event = {
  name: string;
  params?: Record<string, any>;
};

type SendOpts = {
  client_id: string; // required by GA4 MP
  user_id?: string; // optional
  events: Ga4Event[];
  debug?: boolean;
};

function env(name: string) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : null;
}

export async function sendGa4(opts: SendOpts) {
  const measurement_id = env("GA4_MEASUREMENT_ID") || env("NEXT_PUBLIC_GA_ID");
  const api_secret = env("GA4_API_SECRET");
  if (!measurement_id || !api_secret) return;

  const endpointBase = opts.debug
    ? "https://www.google-analytics.com/debug/mp/collect"
    : "https://www.google-analytics.com/mp/collect";

  const url =
    `${endpointBase}?measurement_id=${encodeURIComponent(measurement_id)}` +
    `&api_secret=${encodeURIComponent(api_secret)}`;

  const body = {
    client_id: opts.client_id,
    ...(opts.user_id ? { user_id: opts.user_id } : {}),
    events: (opts.events || []).map((e) => ({
      name: e.name,
      params: e.params || {},
    })),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Debug endpoint returns JSON; normal endpoint returns 2xx empty
    if (opts.debug) {
      const json = await res.json().catch(() => null);
      return { ok: res.ok, debug: json };
    }
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
