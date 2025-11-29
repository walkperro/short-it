export type Ticker = "MOVE"|"GOLD"|"SILVER"|"WTI"|"US10Y"|"VIX"|"SPY"|"QQQ";

const COLORS: Record<string,string> = {
  MOVE:  "#ef4444", // red
  GOLD:  "#f59e0b", // amber
  SILVER:"#14b8a6", // teal
  WTI:   "#d946ef", // fuchsia
  US10Y: "#22c55e", // green
  VIX:   "#60a5fa", // blue
  SPY:   "#f87171", // soft red
  QQQ:   "#eab308", // yellow
};

export function colorFor(sym: string): string {
  return COLORS[sym] ?? "#e5e7eb";
}
