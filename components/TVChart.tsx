"use client";

import { useEffect, useMemo, useRef } from "react";
import { createChart, ColorType, LineStyle, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { colorFor } from "@/lib/palette";

type Point = { time: number; value: number };
type Props = {
  tickers: string[];                                  // active selection (e.g., ["SPY","QQQ","VIX"])
  seriesMap: Record<string, Point[]>;                 // data per ticker [{time(ms), value}]
};

export default function TVChart({ tickers, seriesMap }: Props) {
  const elRef = useRef<HTMLDivElement|null>(null);
  const chartRef = useRef<ReturnType<typeof createChart>|null>(null);
  const linesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  // init
  useEffect(() => {
    if (!elRef.current || chartRef.current) return;

    const chart = createChart(elRef.current, {
      height: 420,
      layout: { background: { type: ColorType.Solid, color: "#0b0b0c" }, textColor: "#c9c9cf" },
      grid: { vertLines: { color: "#131316" }, horzLines: { color: "#131316" } },
      rightPriceScale: { borderColor: "#1e1e22" },
      timeScale: { borderColor: "#1e1e22" },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const onResize = () => {
      if (!elRef.current || !chartRef.current) return;
      const w = elRef.current.clientWidth;
      chartRef.current.resize(Math.max(280, w), 420);
    };
    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      linesRef.current.clear();
    };
  }, []);

  // sync series when selection or data changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const lines = linesRef.current;

    // remove series that are no longer selected
    for (const [sym, s] of Array.from(lines.entries())) {
      if (!tickers.includes(sym)) {
        chart.removeSeries(s);
        lines.delete(sym);
      }
    }

    // add/update each selected symbol
    tickers.forEach((sym, idx) => {
      let s = lines.get(sym);
      if (!s) {
        s = chart.addLineSeries({
          color: colorFor(sym),
          lineWidth: 2,
          priceLineVisible: true,
          priceLineStyle: LineStyle.Dotted,
          lastValueVisible: true,
        });
        lines.set(sym, s);
      } else {
        s.applyOptions({ color: colorFor(sym) });
      }

      const raw = seriesMap[sym] || [];
      // convert ms -> seconds for LW charts
      const data = raw.map(p => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value }));
      if (data.length) s.setData(data);
    });

    chart.timeScale().fitContent();
  }, [tickers, seriesMap]);

  return <div ref={elRef} className="w-full rounded-lg overflow-hidden" />;
}
