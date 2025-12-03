"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import GridCharts from "@/components/GridCharts";
import { colorFor } from "@/lib/palette";

type T = "MOVE"|"GOLD"|"SILVER"|"WTI"|"US10Y"|"VIX"|"SPY"|"QQQ";
type G = "1D"|"1W"|"1M"|"1Y";
const ALL:T[]=["MOVE","GOLD","SILVER","WTI","US10Y","VIX","SPY","QQQ"];

export default function Page(){
  const [gran, setGran] = useState<G>("1D");
  const [selected, setSelected] = useState<T[]>(["SPY","QQQ","VIX","US10Y"]);
  const [series, setSeries] = useState<Record<string,{time:number;value:number}[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors]   = useState<Record<string, string|undefined>>({});
  const [bumped, setBumped]   = useState<string | null>(null);
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [centerDate, setCenterDate] = useState<number | null>(null); // seconds

  async function load(sym:string, g:G){
    setLoading(p=>({...p,[sym]:true}));
    setErrors(p=>({...p,[sym]:undefined}));
    try{
      const r = await fetch(`/api/timeseries?symbol=${sym}&gran=${g}`, { cache:"no-store" });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      setSeries(p=>({...p,[sym]:Array.isArray(j.series)?j.series:[]}));
    }catch(e:any){
      setErrors(p=>({...p,[sym]:String(e?.message||e)}));
      setSeries(p=>({...p,[sym]:[]}));
    }finally{
      setLoading(p=>({...p,[sym]:false}));
    }
  }

  useEffect(()=>{
    selected.slice(0,4).forEach(s=>load(s,gran));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gran, JSON.stringify(selected.slice(0,4))]);

  const visible = useMemo(()=>selected.slice(0,4),[selected]);

  const toggle=(t:T)=>{
    setSelected(prev=>{
      if(prev.includes(t)) return prev.filter(x=>x!==t);
      if(prev.length<4) return [...prev,t];
      const replaced = prev[3];
      const next=[...prev]; next[3]=t;
      setBumped(replaced);
      if(bumpTimer.current) clearTimeout(bumpTimer.current);
      bumpTimer.current=setTimeout(()=>setBumped(null),1500);
      return next;
    });
  };

  const onPickDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value; // "YYYY-MM-DD" (local)
    if (!v) { setCenterDate(null); return; }
    // convert to UTC midnight seconds
    const [y,m,d] = v.split("-").map(n=>parseInt(n,10));
    const ts = Date.UTC(y, (m-1), d) / 1000;
    setCenterDate(ts);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <style>{`
        @keyframes bump-ring {0%{box-shadow:0 0 0 0 rgba(167,139,250,.9);transform:scale(1)}60%{box-shadow:0 0 0 8px rgba(167,139,250,0);transform:scale(1.02)}100%{box-shadow:0 0 0 0 rgba(167,139,250,0);transform:scale(1)}}
        .bumped-ring { animation: bump-ring 1.2s ease-out 1; }
      `}</style>

      <header className="sticky top-0 z-20 border-b mb-4" style={{borderColor:"#1e1e22",background:"#111113"}}>
        <div className="py-3 flex items-center gap-3">
          <div className="text-xl font-semibold">SHORT-IT</div>
          <div className="text-xs px-2 py-1 rounded" style={{background:"#7f1d1d"}}>Bear-mode ✦ 2×2</div>
        </div>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm opacity-80">Timeframe:</span>
          {(["1D","1W","1M","1Y"] as G[]).map(g=>(
            <button key={g} onClick={()=>setGran(g)}
              className={"px-2 py-1 rounded border text-sm "+(gran===g?"font-semibold":"opacity-80")}
              style={{borderColor:"#1e1e22",background:gran===g?"#7f1d1d":"transparent"}}>{g}</button>
          ))}
          <span className="ml-auto text-xs opacity-70">Synced scroll. Tap ⤢ for fullscreen.</span>
        </div>
      </header>

      <div className="mb-3">
        <GridCharts tickers={visible} seriesMap={series} loading={loading} errors={errors} height={260} centerDate={centerDate}/>
      </div>

      <div className="p-3 mb-6 rounded-xl border flex items-center gap-3" style={{borderColor:"#1e1e22",background:"#111113"}}>
        <span className="text-sm opacity-80">Jump to date:</span>
        <input type="date" onChange={onPickDate}
               className="px-2 py-1 rounded border text-sm"
               style={{borderColor:"#1e1e22", background:"#0b0b0c"}} />
        <span className="text-xs opacity-70">Centers all charts on the nearest bar.</span>
      </div>

      <div className="p-3 rounded-xl border" style={{borderColor:"#1e1e22",background:"#111113"}}>
        <div className="font-semibold mb-2">Tickers</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ALL.map(t=>{
            const active = visible.includes(t);
            const justBumped = bumped === t;
            return (
              <button key={t} onClick={()=>toggle(t)}
                className={"px-2 py-2 rounded border text-left transition " + (active ? "" : "opacity-80") + (justBumped ? " bumped-ring" : "")}
                style={{
                  borderColor:"#1e1e22",
                  background: active ? colorFor(t)+"22" : "transparent",
                  color: active ? colorFor(t) : "inherit"
                }}>
                <span className="text-sm">{t}</span>
                {active && <span className="ml-2 text-xs opacity-70">(shown)</span>}
                {justBumped && <span className="ml-2 text-[11px]" style={{color:"#a78bfa"}}>bumped</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
