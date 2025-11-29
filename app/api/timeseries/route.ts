import { NextRequest, NextResponse } from "next/server";

type Gran = "1D" | "1W" | "1M" | "1Y";

// Map our macro tickers to tradeable price proxies so values are REAL prices (no indexing)
const PROXY: Record<string, string> = {
  // core equities
  SPY: "SPY",
  QQQ: "QQQ",
  // volatility proxy
  VIX: "VIXY",     // ETF tracking short-term VIX futures (Polygon doesn't serve ^VIX directly on all accounts)
  // commodities
  GOLD: "GLD",
  SILVER: "SLV",
  WTI: "USO",
  // rates
  US10Y: "IEF",    // 7–10Y Treasury ETF (price level proxy, not yield)
  // rate vol proxy (MOVE has no direct price on Polygon)
  MOVE: "TLT",     // long-duration Treasuries as a rough proxy for rate vol regime
};

function rangeFor(gran: Gran) {
  const now = new Date();
  const to = now.toISOString().slice(0,10);
  const start = new Date(now);
  let multiplier = 1;
  let timespan: "day" | "week" | "month" = "day";

  switch (gran) {
    case "1D":
      start.setMonth(start.getMonth() - 3);            // ~3 months of D1
      multiplier = 1; timespan = "day"; break;
    case "1W":
      start.setFullYear(start.getFullYear() - 3);      // ~3 years of W1
      multiplier = 1; timespan = "week"; break;
    case "1M":
      start.setFullYear(start.getFullYear() - 10);     // ~10 years of M1
      multiplier = 1; timespan = "month"; break;
    case "1Y":
      start.setFullYear(start.getFullYear() - 20);     // long history as M1
      multiplier = 1; timespan = "month"; break;
  }
  const from = start.toISOString().slice(0,10);
  return { from, to, multiplier, timespan };
}

// NO NORMALIZATION: return raw closing prices
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase() || "SPY";
  const gran = (searchParams.get("gran") as Gran) || "1D";

  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing POLYGON_API_KEY" }, { status: 500 });
  }

  const ticker = PROXY[symbol] || symbol;  // fall back to the given symbol if present
  const { from, to, multiplier, timespan } = rangeFor(gran);

  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
    ticker
  )}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;

  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ error: `Polygon ${r.status}: ${txt}` }, { status: 500 });
    }
    const j = await r.json();

    const results = (j?.results ?? []) as Array<{ t: number; c: number }>;
    const data = results.map(pt => ({ time: pt.t, value: pt.c })); // raw close

    return NextResponse.json({ data, proxy: ticker, gran });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
