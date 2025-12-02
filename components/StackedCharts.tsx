"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  ISeriesApi,
  IChartApi,
  UTCTimestamp,
} from "lightweight-charts";
import { colorFor } from "@/lib/palette";

type Point = { time: number; value: number };
type Props = { tickers: string[]; seriesMap: Record<string, Point[]>; height?: number };

export default function StackedCharts({ tickers, seriesMap, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement|null>(null);
  const chartRefs = useRef<Map<string, IChartApi>>(new Map());
  const lineRefs  = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const wrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const suppress  = useRef(false);

  // Create/remove chart wrappers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // remove deselected
    for (const sym of Array.from(chartRefs.current.keys())) {
      if (!tickers.includes(sym)) {
        chartRefs.current.get(sym)!.remove();
        chartRefs.current.delete(sym);
        lineRefs.current.delete(sym);
        wrapperRefs.current.get(sym)?.remove();
        wrapperRefs.current.delete(sym);
      }
    }

    // create new ones
    tickers.forEach((sym) => {
      if (chartRefs.current.has(sym)) return;

      const wrap = document.createElement("div");
      wrap.dataset.sym = sym;
      wrap.style.width = "100%";
      wrap.style.height = `${height}px`;
      wrap.style.marginBottom = "22px";
      wrap.style.paddingTop = "26px";
      wrap.style.border = "1px solid #1e1e22";
      wrap.style.borderRadius = "12px";
      wrap.style.background = "#0b0b0c";
      wrap.style.boxShadow = "0 2px 8px rgba(0,0,0,.35)";
      wrap.style.position = "relative";
      container.appendChild(wrap);
      wrapperRefs.current.set(sym, wrap);

      // chart
      const chart = createChart(wrap, {
        height,
        layout: {
          background: { type: ColorType.Solid, color: "#0b0b0c" },
          textColor: "#c9c9cf",
        },
        grid: {
          vertLines: { color: "#131316" },
          horzLines: { color: "#131316" },
        },
        rightPriceScale: { borderColor: "#1e1e22" },
        timeScale: { borderColor: "#1e1e22" },
        crosshair: { mode: 1 },
      });

      const line = chart.addLineSeries({
        color: colorFor(sym),
        lineWidth: 2,
        priceLineVisible: true,
        priceLineStyle: LineStyle.Dotted,
        lastValueVisible: true,
      });

      chartRefs.current.set(sym, chart);
      lineRefs.current.set(sym, line);

      // ticker badge
      const badge = document.createElement("div");
      badge.textContent = sym;
      badge.style.position = "absolute";
      badge.style.left = "8px";
      badge.style.top = "6px";
      badge.style.zIndex = "5";
      badge.style.padding = "2px 8px";
      badge.style.fontSize = "12px";
      badge.style.borderRadius = "8px";
      badge.style.background = colorFor(sym) + "33";
      badge.style.color = colorFor(sym);
      wrap.appendChild(badge);

      // "No data" overlay (hidden by default)
      const noData = document.createElement("div");
      noData.dataset.noData = "1";
      noData.textContent = "No Data";
      noData.style.position = "absolute";
      noData.style.left = "50%";
      noData.style.top = "50%";
      noData.style.transform = "translate(-50%, -50%)";
      noData.style.color = "#777";
      noData.style.fontSize = "14px";
      noData.style.opacity = "0";           // hidden until needed
      noData.style.pointerEvents = "none";  // allow chart drag even if visible
      noData.style.transition = "opacity 0.25s ease";
      wrap.appendChild(noData);
    });

    const handleResize = () => {
      chartRefs.current.forEach((chart, sym) => {
        const wrap = wrapperRefs.current.get(sym);
        if (wrap) chart.resize(wrap.clientWidth, height);
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [tickers, height]);

  // Update chart data + toggle "No Data"
  useEffect(() => {
    tickers.forEach((sym) => {
      const wrap = wrapperRefs.current.get(sym);
      const line = lineRefs.current.get(sym);
      if (!wrap || !line) return;

      const raw = seriesMap[sym] || [];
      if (!raw.length) {
        // show no data overlay
        const overlay = wrap.querySelector('[data-no-data="1"]') as HTMLDivElement;
        if (overlay) overlay.style.opacity = "1";
        line.setData([]); // clear chart
        return;
      }

      // hide overlay
      const overlay = wrap.querySelector('[data-no-data="1"]') as HTMLDivElement;
      if (overlay) overlay.style.opacity = "0";

      const data = raw.map((p) => ({
        time: Math.floor(p.time / 1000) as UTCTimestamp,
        value: p.value,
      }));
      line.setData(data);
    });

    setTimeout(() => chartRefs.current.forEach((c) => c.timeScale().fitContent()), 0);
  }, [tickers, seriesMap]);

  // sync time ranges
  useEffect(() => {
    const charts = Array.from(chartRefs.current.values());
    const sync = (src: IChartApi) => {
      const range = src.timeScale().getVisibleRange();
      if (!range) return;
      suppress.current = true;
      charts.forEach((c) => { if (c !== src) try { c.timeScale().setVisibleRange(range); } catch {} });
      suppress.current = false;
    };
    charts.forEach((chart) => {
      chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        if (!suppress.current) sync(chart);
      });
    });
    return () => {
      charts.forEach((chart) => {
        try { chart.timeScale().unsubscribeVisibleTimeRangeChange(() => {}); } catch {}
      });
    };
  }, [tickers]);

  return <div ref={containerRef} className="w-full" />;
}
