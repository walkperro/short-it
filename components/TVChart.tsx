"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { colorFor, type Ticker } from "@/lib/palette";

type Point = { time: number; value: number }; // ms epoch

export default function TVChart({
  tickers,
  seriesMap
}: {
  tickers: Ticker[];
  seriesMap: Record<string, Point[]>;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const linesRef = useRef<Record<string, ISeriesApi<"Line">>>({});

  // init chart once
  useEffect(() => {
    if (!mountRef.current || chartRef.current) return;

    const chart = createChart(mountRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0b0b0c" }, textColor: "#a0a0a8" },
      grid: { vertLines: { color: "#1e1e22" }, horzLines: { color: "#1e1e22" } },
      rightPriceScale: { borderColor: "#1e1e22" },
      timeScale: { borderColor: "#1e1e22" }
    });
    chartRef.current = chart;

    const onResize = () =>
      chart.applyOptions({ width: mountRef.current?.clientWidth || 600, height: 460 });
    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      linesRef.current = {};
    };
  }, []);

  // sync selected tickers with line series (add/remove)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // remove any series not selected
    Object.keys(linesRef.current).forEach((key) => {
      if (!tickers.includes(key as Ticker)) {
        chart.removeSeries(linesRef.current[key]);
        delete linesRef.current[key];
      }
    });

    // add missing series
    tickers.forEach((t) => {
      if (!linesRef.current[t]) {
        const s = chart.addLineSeries({ color: colorFor(t), lineWidth: 2 });
        linesRef.current[t] = s;

        // if we already have data for it, set immediately
        const data = seriesMap[t] || [];
        if (data.length) {
          s.setData(data.map((p) => ({ time: (p.time / 1000) as UTCTimestamp, value: p.value })));
        }
      } else {
        // ensure color stays in sync with palette changes
        linesRef.current[t].applyOptions({ color: colorFor(t) });
      }
    });
  }, [tickers, seriesMap]);

  // push data whenever it updates
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    tickers.forEach((t) => {
      const s = linesRef.current[t];
      const data = seriesMap[t] || [];
      if (!s || !data.length) return;
      s.setData(data.map((p) => ({ time: (p.time / 1000) as UTCTimestamp, value: p.value })));
    });
  }, [seriesMap, tickers]);

  return <div className="h-[460px] w-full" ref={mountRef} />;
}
