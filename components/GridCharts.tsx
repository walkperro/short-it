"use client";
import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, LineData } from "lightweight-charts";
import { createChart } from "lightweight-charts";

type Series = { id: string; name: string; color: string; data: LineData[] };
type Props = { symbols: string[]; fetcher: (s: string)=>Promise<Series>; layout?: "grid"|"stacked" };

function Shimmer(){ return <div className="h-full w-full animate-pulse rounded-xl bg-zinc-900/70" />; }

function Panel({title, onFull, children}:{title:string; onFull:()=>void; children:React.ReactNode}){
  return (
    <div className="relative rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
      <span className="absolute left-2 top-2 rounded-lg bg-zinc-800 px-2 py-0.5 text-xs">{title}</span>
      <button onClick={onFull} className="absolute right-2 top-2 rounded-lg bg-zinc-800 px-2 py-0.5 text-xs">⤢</button>
      <div className="mt-5 h-[34dvh] min-h-[220px]">{children}</div>
    </div>
  );
}

export default function GridCharts({ symbols = [], fetcher, layout="grid" }: Props){
  const [loading, setLoading] = useState(true);
  const [firstDone, setFirstDone] = useState(false);

  const charts = useRef(new Map<string, IChartApi>());
  const series = useRef(new Map<string, ISeriesApi<"Line">>());
  const syncing = useRef(false);
  const subs = useRef(new Map<string, ()=>void>());

  // data load
  const [rows,setRows] = useState<Series[]>([]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all((symbols||[]).map(s=>fetcher(s))).then((out)=>{
      if (!live) return;
      setRows(out);
      setLoading(false);
      if (!firstDone) setFirstDone(true);
    });
    return ()=>{ live=false; };
  }, [symbols.join("|")]);

  // mount + fill charts
  useEffect(() => {
    rows.forEach(({id, color, data}) => {
      const el = document.getElementById(`chart-${id}`);
      if (!el || charts.current.get(id)) return;
      const c = createChart(el, {
        layout:{ background:{ color: "#0a0a0a"}, textColor:"#d4d4d4" },
        grid:{ vertLines:{color:"#1a1a1a"}, horzLines:{color:"#1a1a1a"} },
        height: el.clientHeight
      });
      const s = c.addLineSeries({ color, lineWidth: 2 });
      s.setData(data);
      charts.current.set(id, c);
      series.current.set(id, s);
      c.timeScale().fitContent();
    });

    // copy initial range to peers
    const leader = symbols[0];
    const lc = leader ? charts.current.get(leader) : undefined;
    if (lc) {
      const r = lc.timeScale().getVisibleLogicalRange();
      if (r) (symbols||[]).forEach(sid => {
        const cc = charts.current.get(sid);
        if (cc && cc!==lc) try { cc.timeScale().setVisibleLogicalRange(r); } catch {}
      });
    }
  }, [rows.map(r=>r.id).join("|")]);

  // 4-way sync (zoom + scroll)
  useEffect(() => {
    const ids = Array.isArray(symbols) ? symbols : [];
    const list = ids.map(s => [s, charts.current.get(s)] as const).filter(([,c])=>!!c) as [string,IChartApi][];
    if (!list.length) return;

    const on = (id:string, c:IChartApi) => {
      const h = () => {
        if (syncing.current) return;
        const r = c.timeScale().getVisibleLogicalRange(); if (!r) return;
        syncing.current = true;
        list.forEach(([sid, cc]) => { if (sid===id) return; try { cc.timeScale().setVisibleLogicalRange(r); } catch {} });
        requestAnimationFrame(()=>{ syncing.current = false; });
      };
      subs.current.set(id, h);
      c.timeScale().subscribeVisibleLogicalRangeChange(h);
    };
    list.forEach(([id,c])=>on(id,c));
    return () => { list.forEach(([id,c])=>{ const h=subs.current.get(id); if (h) try{ c.timeScale().unsubscribeVisibleLogicalRangeChange(h);}catch{}; subs.current.delete(id); }); }
  }, [symbols.join("|"), Array.from(charts.current.keys()).length]);

  // responsive resize
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      (symbols||[]).forEach(id => {
        const c = charts.current.get(id); const el = document.getElementById(`chart-${id}`);
        if (c && el) c.resize(el.clientWidth, el.clientHeight);
      });
    });
    (symbols||[]).forEach(id => { const el = document.getElementById(`chart-${id}`); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [symbols.join("|")]);

  const gridCls = layout==="grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "space-y-4";

  return (
    <div className={gridCls}>
      {(rows.length? rows : (symbols||[]).map(s=>({id:s,name:s,color:"#999",data:[]} as Series))).map(r => (
        <Panel key={r.id} title={r.id} onFull={()=>document.documentElement.requestFullscreen().catch(()=>{})}>
          {(loading && !firstDone) ? <Shimmer/> : <div id={`chart-${r.id}`} className="h-full w-full" />}
        </Panel>
      ))}
    </div>
  );
}
