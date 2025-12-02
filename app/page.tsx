"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import AuthHeader from "@/components/AuthHeader";
import GridCharts from "@/components/GridCharts";
import { supabase } from "@/lib/supabase";
import { colorFor, type Ticker } from "@/lib/palette";

type Gran = "1D" | "1W" | "1M" | "1Y";
const UNIVERSE: Ticker[] = ["MOVE","GOLD","SILVER","WTI","US10Y","VIX","SPY","QQQ"];

export default function Page(){
  const [userId, setUserId] = useState<string|null>(null);
  useEffect(()=>{
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setUserId(sess?.user?.id ?? null));
    return ()=>{ sub.subscription.unsubscribe(); };
  },[]);

  const [gran, setGran] = useState<Gran>("1D");
  const [selected, setSelected] = useState<Ticker[]>(["SPY","QQQ","VIX","US10Y"]);
  const [bumped, setBumped] = useState<Ticker | null>(null);

  const [series, setSeries] = useState<Record<string, { time:number; value:number }[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string|undefined>>({});

  async function fetchOne(sym: string, g: Gran) {
    setLoading(prev => ({ ...prev, [sym]: true }));
    setErrors(prev => ({ ...prev, [sym]: undefined }));
    try{
      const r = await fetch(`/api/timeseries?symbol=${sym}&gran=${g}`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(()=>({}));
        const msg = j?.error?.hint || j?.error?.message || `Data error (${r.status})`;
        setErrors(prev => ({ ...prev, [sym]: msg }));
        setSeries(prev => ({ ...prev, [sym]: [] }));
      } else {
        const j = await r.json();
        const data = j?.data || [];
        setSeries(prev => ({ ...prev, [sym]: data }));
      }
    } catch(err: any) {
      setErrors(prev => ({ ...prev, [sym]: String(err?.message || err) }));
      setSeries(prev => ({ ...prev, [sym]: [] }));
    } finally {
      setLoading(prev => ({ ...prev, [sym]: false }));
    }
  }

  useEffect(()=>{
    (async ()=>{
      const syms = [...selected];
      await Promise.all(syms.map(s => fetchOne(s, gran)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, gran]);

  // custom toggle: if adding a new one and already at 4, replace index 3 and mark bumped
  const toggle = (t: Ticker) => {
    setBumped(null);
    setSelected(prev => {
      if (prev.includes(t)) {
        // remove it
        return prev.filter(x => x !== t);
      }
      // add it
      if (prev.length < 4) {
        return [...prev, t];
      } else {
        const next = [...prev];
        const out = next[3];
        next[3] = t;
        setBumped(out);
        setTimeout(() => setBumped(null), 2000);
        return next;
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <header className="sticky top-0 z-20 border-b mb-4" style={{borderColor:"#1e1e22", background:"#111113"}}>
        <div className="py-3 flex items-center gap-3">
          <div className="text-xl font-semibold tracking-tight">SHORT-IT</div>
          <div className="text-xs px-2 py-1 rounded" style={{background:"#7f1d1d"}}>Bear-mode ✦ v0.8 (2×2)</div>
          <AuthHeader />
        </div>
      </header>

      {/* Controls */}
      <div className="p-3 mb-3 rounded-xl border" style={{borderColor:"#1e1e22", background:"#111113"}}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm opacity-80">Timeframe:</span>
          {(["1D","1W","1M","1Y"] as Gran[]).map(g=>(
            <button key={g} onClick={()=>setGran(g)} className={clsx("px-2 py-1 rounded border text-sm", gran===g ? "font-semibold" : "opacity-80")} style={{borderColor:"#1e1e22", background: gran===g ? "#7f1d1d" : "transparent"}}>{g}</button>
          ))}
          <span className="ml-auto text-xs opacity-70">2×2 grid, synced scroll. Tap ⤢ for fullscreen.</span>
        </div>
      </div>

      {/* Grid charts (max 4) */}
      <div className="mb-6">
        <GridCharts
          tickers={selected.slice(0,4)}
          seriesMap={series}
          loading={loading}
          errors={errors}
          height={260}
        />
      </div>

      {/* Ticker picker */}
      <div className="p-3 rounded-xl border" style={{borderColor:"#1e1e22", background:"#111113"}}>
        <div className="font-semibold mb-2">Tickers</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {UNIVERSE.map(t=>{
            const active = selected.includes(t);
            const bumpedStyle = bumped === t ? { outline: `2px solid ${colorFor(t)}`, outlineOffset: "2px" } : {};
            return (
              <button key={t}
                onClick={()=>toggle(t)}
                className={"px-2 py-1 rounded border text-left transition " + (active ? "" : "opacity-80")}
                style={{borderColor:"#1e1e22", background: active ? colorFor(t)+"22" : "transparent", color: active ? colorFor(t) : "inherit", ...bumpedStyle}}
              >
                <span className="text-sm">{t}</span>
                {active && <span className="ml-2 text-xs opacity-70">(shown)</span>}
                {bumped === t && <span className="ml-2 text-xs" style={{ color: colorFor(t) }}>bumped</span>}
              </button>
            );
          })}
        </div>
        {selected.length > 4 && (
          <div className="text-xs mt-2 opacity-70">Showing first 4 charts. New selections replace slot #4.</div>
        )}
      </div>
    </div>
  );
}
