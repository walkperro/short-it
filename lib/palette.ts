export type Ticker = "MOVE"|"GOLD"|"SILVER"|"WTI"|"US10Y"|"VIX"|"SPY"|"QQQ";

const palette: Record<Ticker,string> = {
  SPY:"#ef4444",
  QQQ:"#eab308",
  VIX:"#60a5fa",
  US10Y:"#22c55e",
  MOVE:"#a78bfa",
  GOLD:"#f97316",
  SILVER:"#67e8f9",
  WTI:"#f472b6"
};

export const colorFor = (t:Ticker) => palette[t];
