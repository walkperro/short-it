"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
type ErrorMap = Record<string, string | undefined>;
type LoadingMap = Record<string, boolean | undefined>;

type Props = {
  tickers: string[];                                   // selection order
  seriesMap: Record<string, Point[]>;                  // data per ticker
  loading?: LoadingMap;                                // symbol -> loading?
  errors?: ErrorMap;                                   // symbol -> error text
  height?: number;                                     // per-cell height
  pageSize?: number;                                   // always 4 for 2x2
};

export default function GridCharts({
  tickers,
  seriesMap,
  loading = {},
  errors = {},
  height = 260,
  pageSize = 4,
}: Props) {
  // pagination: show 4 at a time
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(Math.max(0, tickers.length) / pageSize));
  useEffect(() => {
    if (page > pages - 1) setPage(0);
  }, [tickers.length, page, pages]);

  const visible = useMemo(() => {
    const start = page * pageSize;
    return tickers.slice(start, start + pageSize);
  }, [tickers, page, pageSize]);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const chartRefs = useRef<Map<string, IChartApi>>(new Map());
  const lineRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const suppress = useRef(false);

  // fullscreen state
  const [fsSymbol, setFsSymbol] = useState<string | null>(null);

  // Create/destroy charts for visible symbols only
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // remove charts no longer visible
    for (const sym of Array.from(chartRefs.current.keys())) {
      if (!visible.includes(sym)) {
        chartRefs.current.get(sym)!.remove();
        chartRefs.current.delete(sym);
        lineRefs.current.delete(sym);
        const cell = cellRefs.current.get(sym);
        cell?.remove();
        cellRefs.current.delete(sym);
      }
    }

    // create charts for newly visible
    visible.forEach((sym) => {
      if (chartRefs.current.has(sym)) return;

      const cell = document.createElement("div");
      cell.dataset.sym = sym;
      cell.style.position = "relative";
      cell.style.border = "1px solid #1e1e22";
      cell.style.borderRadius = "12px";
      cell.style.background = "#0b0b0c";
      cell.style.boxShadow = "0 2px 8px rgba(0,0,0,.35)";
      cell.style.overflow = "hidden";
      cell.style.height = `${height}px`;
      grid.appendChild(cell);
      cellRefs.current.set(sym, cell);

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
      cell.appendChild(badge);

      // fullscreen icon
      const fs = document.createElement("button");
      fs.innerHTML = "⤢";
      fs.title = "Fullscreen";
      fs.style.position = "absolute";
      fs.style.right = "8px";
      fs.style.top = "6px";
      fs.style.zIndex = "6";
      fs.style.padding = "0 6px";
      fs.style.fontSize = "14px";
      fs.style.lineHeight = "20px";
      fs.style.borderRadius = "6px";
      fs.style.background = "#1a1a1d";
      fs.style.color = "#c9c9cf";
      fs.style.border = "1px solid #25252a";
      fs.onclick = (e) => { e.stopPropagation(); setFsSymbol(sym); };
      cell.appendChild(fs);

      // warn icon (shown on error)
      const warn = document.createElement("div");
      warn.dataset.warn = "1";
      warn.innerHTML = "⚠";
      warn.title = "Data error";
      warn.style.position = "absolute";
      warn.style.right = "36px";
      warn.style.top = "6px";
      warn.style.zIndex = "6";
      warn.style.padding = "0 6px";
      warn.style.fontSize = "14px";
      warn.style.lineHeight = "20px";
      warn.style.borderRadius = "6px";
      warn.style.background = "#2a1616";
      warn.style.color = "#f87171";
      warn.style.border = "1px solid #502222";
      warn.style.opacity = "0";
      warn.style.pointerEvents = "none";
      warn.style.transition = "opacity .2s";
      cell.appendChild(warn);

      // loading shimmer
      const shimmer = document.createElement("div");
      shimmer.dataset.shimmer = "1";
      shimmer.style.position = "absolute";
      shimmer.style.inset = "0";
      shimmer.style.background = "linear-gradient(90deg, rgba(25,25,28,0) 0%, rgba(40,40,45,.6) 50%, rgba(25,25,28,0) 100%)";
      shimmer.style.backgroundSize = "200% 100%";
      shimmer.style.animation = "shortit-shimmer 1.2s linear infinite";
      shimmer.style.opacity = "0";
      shimmer.style.transition = "opacity .2s";
      cell.appendChild(shimmer);

      // no data overlay
      const nodata = document.createElement("div");
      nodata.dataset.noData = "1";
      nodata.textContent = "No Data";
      nodata.style.position = "absolute";
      nodata.style.left = "50%";
      nodata.style.top = "50%";
      nodata.style.transform = "translate(-50%, -50%)";
      nodata.style.color = "#777";
      nodata.style.fontSize = "14px";
      nodata.style.opacity = "0";
      nodata.style.pointerEvents = "none";
      nodata.style.transition = "opacity .25s ease";
      cell.appendChild(nodata);

      // no timeframe overlay (secondary hint)
      const notf = document.createElement("div");
      notf.dataset.noTf = "1";
      notf.textContent = "Unavailable in selected timeframe";
      notf.style.position = "absolute";
      notf.style.left = "50%";
      notf.style.top = "calc(50% + 18px)";
      notf.style.transform = "translate(-50%, -50%)";
      notf.style.color = "#555";
      notf.style.fontSize = "12px";
      notf.style.opacity = "0";
      notf.style.pointerEvents = "none";
      notf.style.transition = "opacity .25s ease";
      cell.appendChild(notf);

      // chart
      const chart = createChart(cell, {
        height,
        layout: { background: { type: ColorType.Solid, color: "#0b0b0c" }, textColor: "#c9c9cf" },
        grid: { vertLines: { color: "#131316" }, horzLines: { color: "#131316" } },
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
    });

    // resize
    const handleResize = () => {
      visible.forEach((sym) => {
        const cell = cellRefs.current.get(sym);
        const chart = chartRefs.current.get(sym);
        if (cell && chart) chart.resize(cell.clientWidth, height);
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [visible, height]);

  // push data, toggle states (loading/error/no-data)
  useEffect(() => {
    visible.forEach((sym) => {
      const cell = cellRefs.current.get(sym);
      const line = lineRefs.current.get(sym);
      if (!cell || !line) return;

      // toggles
      const shimmer = cell.querySelector('[data-shimmer="1"]') as HTMLDivElement;
      const warn = cell.querySelector('[data-warn="1"]') as HTMLDivElement;
      const nodata = cell.querySelector('[data-no-data="1"]') as HTMLDivElement;
      const notf = cell.querySelector('[data-no-tf="1"]') as HTMLDivElement | null; // we tagged as data-noTf

      // loading
      const isLoading = !!loading[sym];
      if (shimmer) shimmer.style.opacity = isLoading ? "1" : "0";

      // errors
      const hasErr = !!errors[sym];
      if (warn) warn.style.opacity = hasErr ? "1" : "0";

      // data
      const raw = seriesMap[sym] || [];
      if (!raw.length) {
        if (nodata) nodata.style.opacity = "1";
        if (notf) notf.style.opacity = "1";
        line.setData([]);
        return;
      } else {
        if (nodata) nodata.style.opacity = "0";
        if (notf) notf.style.opacity = "0";
      }

      const data = raw.map((p) => ({
        time: Math.floor(p.time / 1000) as UTCTimestamp,
        value: p.value,
      }));
      line.setData(data);
    });

    setTimeout(() => {
      // fit visible only
      visible.forEach((sym) => chartRefs.current.get(sym)?.timeScale().fitContent());
    }, 0);
  }, [visible, seriesMap, loading, errors]);

  // sync time range among visible charts
  useEffect(() => {
    const charts = visible.map((s) => chartRefs.current.get(s)).filter(Boolean) as IChartApi[];
    const sync = (src: IChartApi) => {
      const range = src.timeScale().getVisibleRange();
      if (!range) return;
      suppress.current = true;
      charts.forEach((c) => { if (c !== src) try { c.timeScale().setVisibleRange(range); } catch {} });
      suppress.current = false;
    };
    charts.forEach((chart) => {
      chart.timeScale().subscribeVisibleTimeRangeChange(() => { if (!suppress.current) sync(chart); });
    });
    return () => {
      charts.forEach((chart) => {
        try { chart.timeScale().unsubscribeVisibleTimeRangeChange(() => {}); } catch {}
      });
    };
  }, [visible]);

  // fullscreen single chart overlay
  useEffect(() => {
    if (!fsSymbol) return;
    const sym = fsSymbol;
    const data = seriesMap[sym] || [];
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,.75)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    const box = document.createElement("div");
    box.style.width = "min(1200px, 96vw)";
    box.style.height = "min(70vh, 680px)";
    box.style.background = "#0b0b0c";
    box.style.border = "1px solid #1e1e22";
    box.style.borderRadius = "16px";
    box.style.boxShadow = "0 10px 30px rgba(0,0,0,.6)";
    box.style.position = "relative";
    overlay.appendChild(box);

    const close = document.createElement("button");
    close.innerHTML = "✕";
    close.title = "Close";
    close.style.position = "absolute";
    close.style.right = "10px";
    close.style.top = "10px";
    close.style.zIndex = "10";
    close.style.padding = "4px 10px";
    close.style.fontSize = "16px";
    close.style.borderRadius = "8px";
    close.style.background = "#1a1a1d";
    close.style.color = "#c9c9cf";
    close.style.border = "1px solid #25252a";
    close.onclick = () => setFsSymbol(null);
    box.appendChild(close);

    const label = document.createElement("div");
    label.textContent = sym;
    label.style.position = "absolute";
    label.style.left = "12px";
    label.style.top = "10px";
    label.style.padding = "2px 10px";
    label.style.fontSize = "12px";
    label.style.borderRadius = "8px";
    label.style.background = colorFor(sym) + "33";
    label.style.color = colorFor(sym);
    label.style.zIndex = "10";
    box.appendChild(label);

    const chart = createChart(box, {
      height: box.clientHeight,
      width: box.clientWidth,
      layout: { background: { type: ColorType.Solid, color: "#0b0b0c" }, textColor: "#c9c9cf" },
      grid: { vertLines: { color: "#131316" }, horzLines: { color: "#131316" } },
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
    if (data.length) {
      line.setData(
        data.map((p) => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value }))
      );
      chart.timeScale().fitContent();
    } else {
      // empty state text
      const msg = document.createElement("div");
      msg.textContent = "No Data";
      msg.style.position = "absolute";
      msg.style.left = "50%";
      msg.style.top = "50%";
      msg.style.transform = "translate(-50%, -50%)";
      msg.style.color = "#777";
      msg.style.fontSize = "14px";
      box.appendChild(msg);
    }

    const onResize = () => {
      chart.resize(box.clientWidth, box.clientHeight);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFsSymbol(null); };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) setFsSymbol(null); });

    document.body.appendChild(overlay);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      overlay.remove();
    };
  }, [fsSymbol, seriesMap]);

  return (
    <>
      {/* shimmer keyframes once per page */}
      <style>{`@keyframes shortit-shimmer { 0%{background-position: 200% 0} 100%{background-position: -200% 0} }`}</style>

      {/* pager header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm opacity-70">Grid: showing {visible.length} of {tickers.length} tickers</div>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-2 py-1 text-sm rounded border"
              style={{ borderColor: "#1e1e22", background: "#111113" }}
            >
              Prev
            </button>
            <div className="text-xs opacity-70">Page {page + 1}/{pages}</div>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              className="px-2 py-1 text-sm rounded border"
              style={{ borderColor: "#1e1e22", background: "#111113" }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* 2x2 grid */}
      <div
        ref={gridRef}
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      />
    </>
  );
}
