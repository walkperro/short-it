"use client";
import { useEffect, useMemo, useRef } from "react";
import {
  createChart, ColorType, LineStyle,
  IChartApi, ISeriesApi, UTCTimestamp
} from "lightweight-charts";
import { colorFor } from "@/lib/palette";

type Pt = { time: number; value: number };
type LoadMap = Record<string, boolean | undefined>;
type ErrMap  = Record<string, string  | undefined>;

export default function GridCharts({
  tickers, seriesMap, loading = {}, errors = {}, height = 260, centerDate,
}: {
  tickers: string[];
  seriesMap: Record<string, Pt[]>;
  loading?: LoadMap;
  errors?: ErrMap;
  height?: number;
  centerDate?: number | null; // UNIX seconds
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const charts  = useRef(new Map<string, IChartApi>());
  const lines   = useRef(new Map<string, ISeriesApi<"Line">>());
  const cells   = useRef(new Map<string, HTMLDivElement>());
  const ro      = useRef(new Map<string, ResizeObserver>());
  const sub     = useRef(new Map<string, () => void>());
  const syncing = useRef(false);

  const visible = useMemo(() => tickers.slice(0, 4), [tickers]);

  const makeFullscreenBtn = (cell: HTMLDivElement) => {
    const btn = document.createElement("button");
    btn.textContent = "⤢";
    btn.ariaLabel = "Fullscreen";
    Object.assign(btn.style, {
      position: "absolute", right: "8px", top: "8px", zIndex: "6",
      padding: "2px 6px", borderRadius: "8px",
      background: "#1a1a1d", color: "#c9c9cf", fontSize: "12px",
      border: "1px solid #2a2a2e", cursor: "pointer",
    } as CSSStyleDeclaration);
    btn.onclick = () => {
      // @ts-ignore vendor prefixes tolerated
      (cell.requestFullscreen ||
       cell.webkitRequestFullscreen ||
       cell.msRequestFullscreen ||
       cell.mozRequestFullScreen)?.call(cell);
    };
    return btn;
  };

  const attachSync = (id: string, c: IChartApi) => {
    const h = () => {
      if (syncing.current) return;
      const r = c.timeScale().getVisibleLogicalRange();
      if (!r) return;
      syncing.current = true;
      visible.forEach((sid) => {
        if (sid === id) return;
        const cc = charts.current.get(sid);
        if (!cc) return;
        try { cc.timeScale().setVisibleLogicalRange(r); } catch {}
      });
      requestAnimationFrame(() => { syncing.current = false; });
    };
    // cleanup previous if exists
    try {
      const prev = sub.current.get(id);
      if (prev) c.timeScale().unsubscribeVisibleLogicalRangeChange(prev);
    } catch {}
    sub.current.set(id, h);
    c.timeScale().subscribeVisibleLogicalRangeChange(h);
  };

  useEffect(() => {
    const grid = gridRef.current; if (!grid) return;

    // remove stale panes
    for (const [sym, cell] of Array.from(cells.current.entries())) {
      if (!visible.includes(sym)) {
        try { const ch = charts.current.get(sym); const h = sub.current.get(sym); if (ch && h) ch.timeScale().unsubscribeVisibleLogicalRangeChange(h); } catch {}
        sub.current.delete(sym);
        try { ro.current.get(sym)?.disconnect(); } catch {}
        ro.current.delete(sym);
        try { charts.current.get(sym)?.remove(); } catch {}
        charts.current.delete(sym);
        lines.current.delete(sym);
        try { cell.remove(); } catch {}
        cells.current.delete(sym);
      }
    }

    // add new panes
    visible.forEach((sym) => {
      if (cells.current.has(sym)) return;

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
      cells.current.set(sym, cell);

      // badge
      const badge = document.createElement("div");
      badge.textContent = sym;
      Object.assign(badge.style, {
        position: "absolute", left: "8px", top: "6px", zIndex: "5",
        padding: "2px 8px", fontSize: "12px", borderRadius: "8px",
        background: colorFor(sym) + "33", color: colorFor(sym),
      } as CSSStyleDeclaration);
      cell.appendChild(badge);

      // fullscreen
      cell.appendChild(makeFullscreenBtn(cell));

      // shimmer ON by default
      const shimmer = document.createElement("div");
      shimmer.dataset.shimmer = "1";
      Object.assign(shimmer.style, {
        position: "absolute", inset: "0",
        background: "linear-gradient(90deg, rgba(30,30,34,0) 0%, rgba(40,40,46,.7) 50%, rgba(30,30,34,0) 100%)",
        backgroundSize: "200% 100%",
        animation: "shortit-shimmer 1.2s infinite",
        opacity: "1",
        transition: "opacity .2s",
        pointerEvents: "none",
      } as CSSStyleDeclaration);
      cell.appendChild(shimmer);

      // no-data
      const nod = document.createElement("div");
      nod.dataset.nodata = "1";
      nod.textContent = "No Data";
      Object.assign(nod.style, {
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        fontSize: "13px", padding: "6px 10px", borderRadius: "8px",
        background: "rgba(0,0,0,.35)", color: "#c9c9cf", opacity: "0",
        pointerEvents: "none", transition: "opacity .2s",
      } as CSSStyleDeclaration);
      cell.appendChild(nod);

      // warn
      const warn = document.createElement("div");
      warn.dataset.warn = "1";
      warn.textContent = "⚠";
      Object.assign(warn.style, {
        position: "absolute", right: "8px", top: "6px",
        fontSize: "12px", padding: "2px 6px", borderRadius: "8px",
        background: "#2a1616", color: "#f87171", opacity: "0",
        transition: "opacity .2s",
      } as CSSStyleDeclaration);
      cell.appendChild(warn);

      // chart
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
          color: colorFor(sym), lineWidth: 2, priceLineVisible: true, priceLineStyle: LineStyle.Dotted,
        });
        charts.current.set(sym, chart);
        lines.current.set(sym, line);

        // resize
        const robs = new ResizeObserver(() => {
          try {
            const rr = cell.getBoundingClientRect();
            chart.resize(Math.max(10, rr.width), Math.max(10, height));
          } catch {}
        });
        robs.observe(cell);
        ro.current.set(sym, robs);

        // attach sync RIGHT NOW so late panes (BR) join the ring
        attachSync(sym, chart);
      });
    });
  }, [visible, height]);

  // data + overlays + fit + mirror initial logical range to peers
  useEffect(() => {
    visible.forEach((sym) => {
      const cell  = cells.current.get(sym);
      const chart = charts.current.get(sym);
      const line  = lines.current.get(sym);
      if (!cell || !chart || !line) return;

      const shimmer = cell.querySelector('[data-shimmer="1"]') as HTMLDivElement | null;
      const nod     = cell.querySelector('[data-nodata="1"]')  as HTMLDivElement | null;
      const warn    = cell.querySelector('[data-warn="1"]')    as HTMLDivElement | null;

      const isDone = loading[sym] === false;
      if (shimmer) shimmer.style.opacity = isDone ? "0" : "1";

      const hasErr = Boolean(errors[sym]);
      if (warn) warn.style.opacity = hasErr ? "1" : "0";

      const pts = seriesMap[sym] || [];
      if (!pts.length && isDone) {
        if (nod) nod.style.opacity = "1";
        try { line.setData([]); } catch {}
        return;
      }
      if (nod) nod.style.opacity = "0";

      const data = pts.map(p => ({ time: p.time as UTCTimestamp, value: p.value }));
      try { line.setData(data); } catch {}

      // fit and then mirror to peers so all start identical
      try { chart.timeScale().fitContent(); } catch {}
      requestAnimationFrame(() => {
        try {
          const r = chart.timeScale().getVisibleLogicalRange();
          if (r) {
            visible.forEach((sid) => {
              const cc = charts.current.get(sid);
              if (cc && cc !== chart) { try { cc.timeScale().setVisibleLogicalRange(r); } catch {} }
            });
          }
        } catch {}
      });
    });
  }, [visible, seriesMap, loading, errors]);

  // external: center all charts on a target date (keep zoom width)
  useEffect(() => {
    if (!centerDate) return;
    visible.forEach((sym) => {
      const chart = charts.current.get(sym);
      const arr   = seriesMap[sym] || [];
      if (!chart || !arr.length) return;
      const target = centerDate * 1000; // ms
      // nearest index
      let lo = 0, hi = arr.length - 1, ans = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid].time * 1000 <= target) { ans = mid; lo = mid + 1; }
        else { hi = mid - 1; }
      }
      const r = chart.timeScale().getVisibleLogicalRange();
      if (!r) return;
      const width = r.to - r.from;
      const mid = ans; // logical index ~ data index
      const next = { from: mid - width / 2, to: mid + width / 2 };
      try { chart.timeScale().setVisibleLogicalRange(next); } catch {}
    });
  }, [centerDate, visible.join("|")]);

  return (
    <>
      <style>{`@keyframes shortit-shimmer{0%{background-position:0% 0}100%{background-position:200% 0}}`}</style>
      <div ref={gridRef} className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }} />
    </>
  );
}
