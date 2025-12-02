"use client";

import { useEffect, useMemo, useRef } from "react";
import { createChart, ColorType, LineStyle, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { colorFor } from "@/lib/palette";

type Point = { time: number; value: number };
type LoadingMap = Record<string, boolean | undefined>;
type ErrorMap = Record<string, string | undefined>;

export default function GridCharts({
  tickers,
  seriesMap,
  loading = {},
  errors = {},
  height = 260,
}: {
  tickers: string[];
  seriesMap: Record<string, Point[]>;
  loading?: LoadingMap;
  errors?: ErrorMap;
  height?: number;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const chartRefs = useRef(new Map<string, IChartApi>());
  const lineRefs  = useRef(new Map<string, ISeriesApi<"Line">>());
  const cellRefs  = useRef(new Map<string, HTMLDivElement>());
  const roRefs    = useRef(new Map<string, ResizeObserver>());
  const syncing   = useRef(false);

  const visible = useMemo(() => tickers.slice(0, 4), [tickers]);

  const addOverlay = (cell: HTMLDivElement, key: string, styles: Partial<CSSStyleDeclaration>) => {
    const el = document.createElement("div");
    el.dataset[key] = "1";
    Object.assign(el.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%,-50%)",
      fontSize: "13px",
      padding: "6px 10px",
      borderRadius: "8px",
      background: "rgba(0,0,0,.35)",
      color: "#c9c9cf",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity .2s",
      ...styles,
    } as CSSStyleDeclaration);
    cell.appendChild(el);
    return el;
  };

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // remove stale cells
    for (const [sym, cell] of Array.from(cellRefs.current.entries())) {
      if (!visible.includes(sym)) {
        try { roRefs.current.get(sym)?.disconnect(); } catch {}
        roRefs.current.delete(sym);
        try { chartRefs.current.get(sym)?.remove(); } catch {}
        chartRefs.current.delete(sym);
        lineRefs.current.delete(sym);
        try { cell.remove(); } catch {}
        cellRefs.current.delete(sym);
      }
    }

    // add new cells
    visible.forEach((sym) => {
      if (cellRefs.current.has(sym)) return;

      const cell = document.createElement("div");
      Object.assign(cell.style, {
        position: "relative",
        border: "1px solid #1e1e22",
        borderRadius: "12px",
        background: "#0b0b0c",
        boxShadow: "0 2px 8px rgba(0,0,0,.35)",
        overflow: "hidden",
        minHeight: `${height}px`,
      });
      grid.appendChild(cell);
      cellRefs.current.set(sym, cell);

      // badge
      const badge = document.createElement("div");
      badge.textContent = sym;
      Object.assign(badge.style, {
        position: "absolute", left: "8px", top: "6px", zIndex: "5",
        padding: "2px 8px", fontSize: "12px", borderRadius: "8px",
        background: colorFor(sym) + "33", color: colorFor(sym),
      } as CSSStyleDeclaration);
      cell.appendChild(badge);

      const warn = addOverlay(cell, "warn", { background: "#2a1616", color: "#f87171", left: "unset", right: "8px", top: "6px", transform: "none" });
      warn.textContent = "⚠";

      const nodata = addOverlay(cell, "noData", {});
      nodata.textContent = "No Data";

      const loader = addOverlay(cell, "loading", {});
      loader.textContent = "Loading…";

      requestAnimationFrame(() => {
        const rect = cell.getBoundingClientRect();
        const chart = createChart(cell, {
          width: Math.max(10, rect.width),
          height,
          layout: { background: { type: ColorType.Solid, color: "#0b0b0c" }, textColor: "#c9c9cf" },
          grid: { vertLines: { color: "#131316" }, horzLines: { color: "#131316" } },
          rightPriceScale: { borderColor: "#1e1e22" },
          timeScale: { borderColor: "#1e1e22" },
          crosshair: { mode: 1 },
        });
        const line = chart.addLineSeries({
          color: colorFor(sym), lineWidth: 2,
          priceLineVisible: true, priceLineStyle: LineStyle.Dotted,
        });

        chartRefs.current.set(sym, chart);
        lineRefs.current.set(sym, line);

        const ro = new ResizeObserver(() => {
          const r = cell.getBoundingClientRect();
          chart.resize(Math.max(10, r.width), Math.max(10, height));
        });
        ro.observe(cell);
        roRefs.current.set(sym, ro);
      });
    });

    return () => {
      roRefs.current.forEach((r) => { try { r.disconnect(); } catch {} });
      roRefs.current.clear();
    };
  }, [visible, height]);

  // data / overlays / force-fit
  useEffect(() => {
    visible.forEach((sym) => {
      const chart = chartRefs.current.get(sym);
      const line  = lineRefs.current.get(sym);
      const cell  = cellRefs.current.get(sym);
      if (!chart || !line || !cell) return;

      const ldr = cell.querySelector('[data-loading="1"]') as HTMLDivElement | null;
      const nd  = cell.querySelector('[data-noData="1"]') as HTMLDivElement | null;
      const wn  = cell.querySelector('[data-warn="1"]') as HTMLDivElement | null;

      if (ldr) ldr.style.opacity = loading[sym] ? "1" : "0";
      if (wn)  wn.style.opacity  = errors[sym] ? "1" : "0";

      const raw = seriesMap[sym] || [];
      if (!raw.length) {
        if (nd) nd.style.opacity = "1";
        try { line.setData([]); } catch {}
        return;
      }
      if (nd) nd.style.opacity = "0";

      const data = raw.map((p) => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value }));
      try { line.setData(data); } catch {}

      try { chart.timeScale().fitContent(); } catch {}
      requestAnimationFrame(() => { try { chart.timeScale().fitContent(); } catch {} });
    });
  }, [visible, seriesMap, loading, errors]);

  // sync scroll/zoom
  useEffect(() => {
    const charts = visible.map((s) => chartRefs.current.get(s)).filter(Boolean) as IChartApi[];
    const cb = (src: IChartApi) => {
      if (syncing.current) return;
      const r = src.timeScale().getVisibleRange();
      if (!r) return;
      syncing.current = true;
      charts.forEach((c) => { if (c !== src) { try { c.timeScale().setVisibleRange(r); } catch {} } });
      requestAnimationFrame(() => { syncing.current = false; });
    };
    charts.forEach((c) => c.timeScale().subscribeVisibleTimeRangeChange(() => cb(c)));
    return () => charts.forEach((c) => c.timeScale().unsubscribeVisibleTimeRangeChange(() => cb(c)));
  }, [visible]);

  return (
    <div ref={gridRef} className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }} />
  );
}
