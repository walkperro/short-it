"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, ISeriesApi, UTCTimestamp } from "lightweight-charts";

type SeriesPoint = { time: UTCTimestamp; value: number };
type Ticker = "MOVE" | "GOLD" | "SILVER" | "WTI" | "US10Y" | "VIX" | "SPY" | "QQQ";

function synthSeries(base: number, n: number, stepDays = 1): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const now = Math.floor(Date.now() / 1000);
  let v = base;
  for (let i = n - 1; i >= 0; i--) {
    const idx = n - 1 - i;
    const rnd = Math.sin(idx * 0.23) * 0.7 + Math.cos(idx * 0.11) * 0.5;
    v = Math.max(0.0001, v + rnd + 0.02);
    out.push({ time: (now - i * 86400 * stepDays) as UTCTimestamp, value: Number(v.toFixed(2)) });
  }
  return out;
}

const bases: Record<Ticker, number> = {
  MOVE: 110, GOLD: 1900, SILVER: 24, WTI: 78, US10Y: 4.2, VIX: 16, SPY: 500, QQQ: 430
};

export default function TVChart({
  tickers,
  normalize = true
}: {
  tickers: Ticker[];
  normalize?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<Record<Ticker, ISeriesApi<"Line">>>({} as any);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: "#0b0b0c" }, textColor: "#a0a0a8" },
      grid: { vertLines: { color: "#1e1e22" }, horzLines: { color: "#1e1e22" } },
      rightPriceScale: { borderColor: "#1e1e22" },
      timeScale: { borderColor: "#1e1e22" }
    });

    const palette = ["#ef4444", "#eab308", "#60a5fa", "#22c55e", "#a78bfa", "#f97316", "#67e8f9", "#f472b6"];

    tickers.forEach((t, i) => {
      const s = chart.addLineSeries({ color: palette[i % palette.length], lineWidth: 2 });
      const raw = synthSeries(bases[t], 800);
      if (normalize) {
        const start = raw[0]?.value || 1;
        s.setData(raw.map(p => ({ time: p.time, value: (p.value / start) * 100 })));
      } else {
        s.setData(raw);
      }
      seriesRef.current[t] = s;
    });

    const handleResize = () => chart.applyOptions({ width: ref.current?.clientWidth || 600 });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [tickers, normalize]);

  return <div className="h-[460px] w-full" ref={ref} />;
}
