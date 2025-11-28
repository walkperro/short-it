import type { NextRequest } from "next/server";

// Unified output shape
export type TSPoint = { time: number; value: number }; // time = ms epoch
export type Gran = "1D" | "1W" | "1M" | "1Y";

const DAY = 24 * 60 * 60 * 1000;

// Helper to resample/aggregate by granularity
function bucketize(points: TSPoint[], gran: Gran): TSPoint[] {
  if (gran === "1D") return points;
  const step = gran === "1W" ? 7*DAY : gran === "1M" ? 30*DAY : 365*DAY;
  const out: TSPoint[] = [];
  let acc: TSPoint[] = [];
  let anchor = Math.floor(points[0]?.time / step) * step;
  for (const p of points) {
    const b = Math.floor(p.time / step) * step;
    if (b !== anchor && acc.length) {
      // simple close average
      out.push({ time: anchor, value: acc[acc.length-1].value });
      acc = [];
      anchor = b;
    }
    acc.push(p);
  }
  if (acc.length) out.push({ time: anchor, value: acc[acc.length-1].value });
  return out;
}

// --- Alpha Vantage (free-ish) ---
async function alphaVantageDaily(symbol: string): Promise<TSPoint[]> {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) throw new Error("ALPHAVANTAGE_API_KEY missing");
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_DAILY_ADJUSTED");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "full");
  url.searchParams.set("apikey", key);
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) throw new Error("AlphaVantage: bad response");
  const json = await r.json();
  const ts = json["Time Series (Daily)"];
  if (!ts) throw new Error("AlphaVantage: unexpected payload");
  const out: TSPoint[] = Object.entries(ts).map(([date, o]: any) => ({
    time: new Date(date + "T00:00:00Z").getTime(),
    value: parseFloat(o["5. adjusted close"] || o["4. close"])
  }));
  out.sort((a,b)=>a.time-b.time);
  return out;
}

// --- Polygon (optional; better intraday/indices/ETFs) ---
async function polygonDaily(symbol: string): Promise<TSPoint[]> {
  const key = process.env.POLYGON_API_KEY;
  if (!key) throw new Error("POLYGON_API_KEY missing");
  // from 1990-01-01 to today
  const to = new Date();
  const from = new Date(1990,0,1);
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${from.toISOString().slice(0,10)}/${to.toISOString().slice(0,10)}?adjusted=true&sort=asc&apiKey=${key}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Polygon: bad response");
  const j = await r.json();
  if (!j.results) throw new Error("Polygon: no results");
  return j.results.map((row: any) => ({ time: row.t, value: row.c }));
}

// Simple router choose-first-available provider
export async function fetchTimeseries(symbol: string): Promise<TSPoint[]> {
  // Try Polygon first if configured, else Alpha Vantage
  if (process.env.POLYGON_API_KEY) {
    try { return await polygonDaily(symbol); } catch (e) { /* fallback */ }
  }
  return alphaVantageDaily(symbol);
}

// Normalize to index=100 (for overlay)
export function normalize(points: TSPoint[]): TSPoint[] {
  if (!points.length) return points;
  const base = points[0].value || 1;
  return points.map(p => ({ time: p.time, value: (p.value / base) * 100 }));
}

// Map friendly tickers to provider symbols
export function resolveSymbol(appSymbol: string): string {
  // Adjust as needed (ETFs are easiest for many)
  const map: Record<string,string> = {
    SPY: "SPY",
    QQQ: "QQQ",
    VIX: "^VIX",     // AlphaVantage does NOT support ^VIX => use Polygon or substitute VIXY ETF (VIXY) for MVP
    US10Y: "US10Y:IND", // Polygon supports indices, AlphaVantage does not; fallback to ETF IEF or ^TNX proxy
    WTI: "CL=F",     // AlphaVantage futures coverage is limited; Polygon or Tiingo better; fallback to USO ETF
    GOLD: "XAUUSD",  // AlphaVantage supports FX; metals are messy; consider GLD ETF for MVP
    SILVER: "XAGUSD",
    MOVE: ""         // Licensed index; consider proxy ETF or custom upload
  };
  // Pragmatic ETF fallbacks for Alpha Vantage:
  if (!process.env.POLYGON_API_KEY) {
    if (appSymbol === "VIX") return "VIXY";     // ETF proxy
    if (appSymbol === "US10Y") return "IEF";    // 7-10y treasury ETF
    if (appSymbol === "WTI") return "USO";      // oil ETF
    if (appSymbol === "GOLD") return "GLD";     // gold ETF
    if (appSymbol === "SILVER") return "SLV";   // silver ETF
  }
  return map[appSymbol] || appSymbol;
}

export function resample(points: TSPoint[], gran: Gran): TSPoint[] {
  return bucketize(points, gran);
}
