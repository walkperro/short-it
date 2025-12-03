export type Provider = "polygon" | "fred";
export type Source = { provider: Provider; id: string };

export const TickerMap: Record<string, Source> = {
  SPY:    { provider: "polygon", id: "SPY" },
  QQQ:    { provider: "polygon", id: "QQQ" },
  GOLD:   { provider: "polygon", id: "C:XAUUSD" },
  SILVER: { provider: "polygon", id: "C:XAGUSD" },
  US10Y:  { provider: "fred",    id: "DGS10" },      // 10Y Yield (%)
  VIX:    { provider: "fred",    id: "VIXCLS" },     // VIX Close
  WTI:    { provider: "fred",    id: "DCOILWTICO" }, // WTI Spot
  MOVE:   { provider: "fred",    id: "MOVE" },       // ICE BofA MOVE Index
};

export function resolveSource(symbol: string): Source {
  const up = (symbol || "").toUpperCase();
  const src = TickerMap[up];
  if (!src) throw new Error(`Unknown symbol: ${symbol}`);
  return src;
}
