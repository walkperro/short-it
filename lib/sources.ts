export type Provider = "polygon" | "fred";
export type Source = { provider: Provider; id: string };

export const TickerMap: Record<string, Source> = {
  // Equities (Polygon)
  SPY:   { provider: "polygon", id: "SPY" },
  QQQ:   { provider: "polygon", id: "QQQ" },

  // Metals (Polygon currencies feed)
  GOLD:  { provider: "polygon", id: "C:XAUUSD" },
  SILVER:{ provider: "polygon", id: "C:XAGUSD" },

  // Rates / Macro (FRED)
  US10Y: { provider: "fred", id: "DGS10" },      // 10Y yield (%)
  VIX:   { provider: "fred", id: "VIXCLS" },     // VIX close
  WTI:   { provider: "fred", id: "DCOILWTICO" }, // WTI spot

  // MOVE Index (FRED has series "MOVE")
  MOVE:  { provider: "fred", id: "MOVE" },
};

export function resolveSource(symbol: string): Source {
  const up = (symbol || "").toUpperCase();
  const src = TickerMap[up];
  if (!src) throw new Error(`Unknown symbol: ${symbol}`);
  return src;
}
