export type Gran = "1D"|"1W"|"1M"|"1Y";
export type Source = { kind:"polygon"|"fred"; series?: string; ticker?: string; color: string; name: string };

export const TickerMap: Record<string, Source> = {
  SPY:  { kind:"polygon", ticker:"SPY", name:"SPY", color:"#ff3737" },
  QQQ:  { kind:"polygon", ticker:"QQQ", name:"QQQ", color:"#f97316" },
  GOLD: { kind:"polygon", ticker:"C:XAUUSD", name:"Gold Spot", color:"#eab308" },
  SILV: { kind:"polygon", ticker:"C:XAGUSD", name:"Silver Spot", color:"#cbd5e1" },
  WTI:  { kind:"fred",    series:"DCOILWTICO", name:"WTI Crude", color:"#a78bfa" },
  US10Y:{ kind:"fred",    series:"DGS10", name:"US 10Y", color:"#22d3ee" },
  VIX:  { kind:"fred",    series:"VIXCLS", name:"VIX", color:"#34d399" },
  MOVE: { kind:"fred",    series:"MOVE", name:"MOVE Index", color:"#f43f5e" }, // many FRED mirrors use MOVE
};

export function resolveSource(symbol: string): Source | null {
  const key = symbol.toUpperCase();
  return TickerMap[key] ?? null;
}
