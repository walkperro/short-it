import { cacheGet, cacheSet } from "@/lib/cache";

export type TSPoint = { time: number; value: number };
export type Gran = "1D" | "1W" | "1M" | "1Y";

const DAY = 24 * 60 * 60 * 1000;

function bucketize(points: TSPoint[], gran: Gran): TSPoint[] {
  if (!points.length) return points;
  if (gran === "1D") return points;
  const step = gran === "1W" ? 7*DAY : gran === "1M" ? 30*DAY : 365*DAY;
  const out: TSPoint[] = [];
  let acc: TSPoint[] = [];
  let anchor = Math.floor(points[0].time / step) * step;
  for (const p of points) {
    const b = Math.floor(p.time / step) * step;
    if (b !== anchor) {
      if (acc.length) out.push({ time: anchor, value: acc[acc.length-1].value });
      acc = []; anchor = b;
    }
    acc.push(p);
  }
  if (acc.length) out.push({ time: anchor, value: acc[acc.length-1].value });
  return out;
}

async function alphaVantageDaily(symbol: string): Promise<TSPoint[]> {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) throw new Error("ALPHAVANTAGE_API_KEY missing");
  const cacheKey = `av:${symbol}`;
  const hit = cacheGet<TSPoint[]>(cacheKey, 1000*60*5);
  if (hit) return hit;
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_DAILY_ADJUSTED");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "full");
  url.searchParams.set("apikey", key);
  const r = await fetch(url.toString(), { cache: "no-store" });
  const json = await r.json();
  if (!r.ok || !json || json["Error Message"] || json["Note"]) {
    const msg = json?.["Note"] ? "AlphaVantage throttle" : json?.["Error Message"] || "AlphaVantage error";
    throw new Error(msg);
  }
  const ts = json["Time Series (Daily)"];
  if (!ts) throw new Error("AlphaVantage: unexpected payload");
  const out: TSPoint[] = Object.entries(ts).map(([date, o]: any) => ({
    time: new Date(date + "T00:00:00Z").getTime(),
    value: parseFloat(o["5. adjusted close"] || o["4. close"])
  })).sort((a,b)=>a.time-b.time);
  cacheSet(cacheKey, out);
  return out;
}

async function polygonDaily(symbol: string): Promise<TSPoint[]> {
  const key = process.env.POLYGON_API_KEY;
  if (!key) throw new Error("POLYGON_API_KEY missing");
  const cacheKey = `poly:${symbol}`;
  const hit = cacheGet<TSPoint[]>(cacheKey, 1000*60*3);
  if (hit) return hit;
  const to = new Date(); const from = new Date(1990,0,1);
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${from.toISOString().slice(0,10)}/${to.toISOString().slice(0,10)}?adjusted=true&sort=asc&apiKey=${key}`;
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();
  if (!r.ok || !j?.results) throw new Error(j?.error || "Polygon error");
  const out = j.results.map((row: any) => ({ time: row.t, value: row.c }));
  cacheSet(cacheKey, out);
  return out;
}

export async function fetchTimeseries(symbol: string): Promise<TSPoint[]> {
  if (process.env.POLYGON_API_KEY) {
    try { return await polygonDaily(symbol); } catch (e) { /* fallback below */ }
  }
  return alphaVantageDaily(symbol);
}

export function normalize(points: TSPoint[]): TSPoint[] {
  if (!points.length) return points;
  const base = points[0].value || 1;
  return points.map(p => ({ time: p.time, value: (p.value / base) * 100 }));
}

export function resolveSymbol(appSymbol: string): string | null {
  const usingPolygon = !!process.env.POLYGON_API_KEY;

  if (appSymbol === "MOVE") return null; // licensed, skip

  if (usingPolygon) {
    // Valid & reliable Polygon tickers
    // Indices must be prefixed with I:
    const map: Record<string,string> = {
      SPY:"SPY",
      QQQ:"QQQ",
      VIX:"I:VIX",     // CBOE Volatility Index
      US10Y:"I:TNX",   // 10-Year Treasury Yield Index
      GOLD:"GLD",      // safer ETF fallback
      SILVER:"SLV",
      WTI:"USO"        // oil ETF fallback
    };
    return map[appSymbol] || appSymbol;
  }

  // AlphaVantage ETF fallbacks
  const map: Record<string,string> = {
    SPY:"SPY", QQQ:"QQQ", VIX:"VIXY",
    US10Y:"IEF", WTI:"USO", GOLD:"GLD", SILVER:"SLV"
  };
  return map[appSymbol] || appSymbol;
}

export function resample(points: TSPoint[], gran: Gran): TSPoint[] {
  return bucketize(points, gran);
}
