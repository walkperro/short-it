"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { colorFor, type Ticker } from "@/lib/palette";

type Point = { time: number; value: number }; // time = ms epoch

export default function TVChart({
  tickers,
  seriesMap
}: {
  tickers: Ticker[];
  seriesMap: Record<string, Point[]>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const lineSeriesRef = useRef<Record<string, ISeriesApi<"Line">>>({});

  useEffect(() => {
    if (!ref.current) return;
    // init once
    if (!chartRef.current) {
      chartRef.current = createChart(ref.current, {
        layout: { background: { type: ColorType.Solid, color: "#0b0b0c" }, textColor: "#a0a0a8" },
        grid: { vertLines: { color: "#1e1e22" }, horzLines: { color: "#1e1e22" } },
        rightPriceScale: { borderColor: "#1e1e22" },
        timeScale: { borderColor: "#1e1e22" }
      });
      const handleResize = () =>
        chartRef.current?.applyOptions({ width: ref.current?.clientWidth || 600 });
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        chartRef.current?.remove();
        chartRef.current = null;
      };
    }
  }, []);

  // create/remove line series when tickers change
  useEffect(() => {
    if (!chartRef.current) return;

    // remove series that are no longer selected
    for (const key of Object.keys(lineSeriesRef.current)) {
      if (!tickers.includes(key as Ticker)) {
        lineSeriesRef.current[key]?.priceScale()?.unsubscribeAll();
        chartRef.current.removeSeries(lineSeriesRef.current[key]);
        delete lineSeriesRef.current[key];
      }
    }
    // add any missing series
    tickers.forEach((t) => {
      if (!lineSeriesRef.current[t]) {
        lineSeriesRef.current[t] = chartRef.current!.addLineSeries({
          color: colorFor(t),
          lineWidth: 2
        });
      }
    });
  }, [tickers]);

  // push data whenever seriesMap changes
  useEffect(() => {
    if (!chartRef.current) return;
    tickers.forEach((t) => {
      const s = lineSeriesRef.current[t];
      const data = seriesMap[t] || [];
      if (!s || !data.length) return;
      // lightweight-charts expects seconds, convert ms → s
      s.setData(data.map((p) => ({ time: (p.time / 1000) as UTCTimestamp, value: p.value })));
    });
  }, [seriesMap, tickers]);

  return <div className="h-[460px] w-full" ref={ref} />;
}
