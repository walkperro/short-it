export type Gran = "1D" | "1W" | "1M" | "1Y";
export type SourceType = "polygon-stock" | "polygon-forex" | "fred";

export type MapRow = { label: string; source: SourceType; symbol: string };

export const TickerMap: Record<string, MapRow> = {
  // Equities (Polygon)
  SPY:   { label: "S&P 500 (SPY)",    source: "polygon-stock", symbol: "SPY" },
  QQQ:   { label: "NASDAQ 100 (QQQ)", source: "polygon-stock", symbol: "QQQ" },

  // Metals spot via Polygon FOREX
  GOLD:  { label: "Gold Spot (XAUUSD)",   source: "polygon-forex", symbol: "C:XAUUSD" },
  SILVER:{ label: "Silver Spot (XAGUSD)", source: "polygon-forex", symbol: "C:XAGUSD" },

  // Macro via FRED
  WTI:   { label: "WTI Spot (FRED)",  source: "fred", symbol: "DCOILWTICO" },
  US10Y: { label: "US 10Y Yield %",   source: "fred", symbol: "DGS10" },
  VIX:   { label: "VIX Index",        source: "fred", symbol: "VIXCLS" },
  // Try modern series first, then legacy alias as fallback
  MOVE:  { label: "MOVE Index",       source: "fred", symbol: "MOVEINDXM|MOVE" },
};

// helper: timeframe windows
export function dateRangeForGran(gran: Gran): { fromISO: string; toISO: string } {
  const to = new Date();
  const from = new Date(to);
  if (gran === "1D") from.setFullYear(to.getFullYear() - 1);
  if (gran === "1W") from.setFullYear(to.getFullYear() - 2);
  if (gran === "1M") from.setFullYear(to.getFullYear() - 5);
  if (gran === "1Y") from.setFullYear(to.getFullYear() - 10);
  const iso = (d: Date) => d.toISOString().slice(0,10);
  return { fromISO: iso(from), toISO: iso(to) };
}
