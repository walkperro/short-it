"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import AuthHeader from "@/components/AuthHeader";
import TVChart from "@/components/TVChart";
import { supabase } from "@/lib/supabase";
import { colorFor, type Ticker } from "@/lib/palette";

type Gran = "1D" | "1W" | "1M" | "1Y";
type Combo = { id: string; name: string; tickers: Ticker[] };
type Watch = { id: string; name: string; tickers: Ticker[] };

const UNIVERSE: Ticker[] = ["MOVE","GOLD","SILVER","WTI","US10Y","VIX","SPY","QQQ"];
const uid = (p="id") => `${p}_${Math.random().toString(36).slice(2,9)}`;

export default function Page(){
  // auth
  const [email, setEmail] = useState<string|null>(null);
  const [userId, setUserId] = useState<string|null>(null);
  useEffect(()=>{
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setEmail(sess?.user?.email ?? null);
      setUserId(sess?.user?.id ?? null);
    });
    return ()=>{ sub.subscription.unsubscribe(); };
  },[]);

  // UI state
  const [gran, setGran] = useState<Gran>("1D");
  const [selected, setSelected] = useState<Ticker[]>(["SPY","QQQ"]); // start with 2 visible; user can add more

  // data
  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState<Record<string, { time:number; value:number }[]>>({});

  async function loadData(){
    if (!selected.length) { setSeries({}); return; }
    setLoading(true);
    try{
      const pairs = await Promise.all(selected.map(async s => {
        const r = await fetch(`/api/timeseries?symbol=${s}&gran=${gran}`);
        let data:any[] = [];
        try { const j = await r.json(); data = j?.data ?? []; } catch {}
        return [s, data] as const;
      }));
      const map: any = {};
      pairs.forEach(([k,v]) => map[k] = v);
      setSeries(map);
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ loadData(); /* eslint-disable-next-line */ },[selected, gran]);

  // persistence
  const [combos, setCombos] = useState<Combo[]>([]);
  const [lists, setLists] = useState<Watch[]>([]);
  useEffect(()=>{
    async function loadPersisted(){
      if (!userId) { setLists([]); setCombos([]); return; }
      const { data: wl } = await supabase.from("watchlists").select("*").order("created_at",{ascending:false});
      const { data: cb } = await supabase.from("combos").select("*").order("created_at",{ascending:false});
      setLists((wl || []).map(w=>({ id: w.id, name: w.name, tickers: w.tickers })));
      setCombos((cb || []).map(c=>({ id: c.id, name: c.name, tickers: c.tickers })));
    }
    loadPersisted();
  },[userId]);

  // actions
  const toggle = (t: Ticker) => setSelected(p => p.includes(t) ? p.filter(x=>x!==t) : [...p, t]);

  const requireAuth = () => {
    alert("Please sign in to save Lists or Combos.");
    window.location.href = "/sign-in";
  };

  async function saveCombo(){
    if (!userId) return requireAuth();
    const name = prompt("Combo name?", `Combo ${combos.length+1}`) || `Combo ${combos.length+1}`;
    const { data, error } = await supabase.from("combos").insert({ user_id: userId, name, tickers: selected }).select("*").single();
    if (!error && data) setCombos([{ id: data.id, name: data.name, tickers: data.tickers }, ...combos]);
  }

  async function createList(){
    if (!userId) return requireAuth();
    const name = prompt("List name?", `List ${lists.length+1}`) || `List ${lists.length+1}`;
    const { data } = await supabase.from("watchlists").insert({ user_id: userId, name, tickers: [] }).select("*").single();
    if (data) setLists([{ id: data.id, name: data.name, tickers: data.tickers }, ...lists]);
  }

  async function addToList(id: string, t: Ticker){
    if (!userId) return requireAuth();
    const l = lists.find(x=>x.id===id);
    if (!l) return;
    const tickers = Array.from(new Set([...(l.tickers||[]), t]));
    const { data } = await supabase.from("watchlists").update({ tickers }).eq("id", id).select("*").single();
    if (data) setLists(lists.map(x=> x.id===id ? { id: data.id, name: data.name, tickers: data.tickers } : x));
  }

  async function removeFromList(id: string, t: Ticker){
    if (!userId) return requireAuth();
    const l = lists.find(x=>x.id===id);
    if (!l) return;
    const tickers = (l.tickers||[]).filter(x=>x!==t);
    const { data } = await supabase.from("watchlists").update({ tickers }).eq("id", id).select("*").single();
    if (data) setLists(lists.map(x=> x.id===id ? { id: data.id, name: data.name, tickers: data.tickers } : x));
  }

  async function deleteList(id: string){
    if (!userId) return requireAuth();
    if (!confirm("Delete this list?")) return;
    await supabase.from("watchlists").delete().eq("id", id);
    setLists(lists.filter(l=>l.id!==id));
  }

  async function deleteCombo(id: string){
    if (!userId) return requireAuth();
    if (!confirm("Delete this combo?")) return;
    await supabase.from("combos").delete().eq("id", id);
    setCombos(combos.filter(c=>c.id!==id));
  }

  const shareList = async (l: Watch) => {
    const text = `Short-It Watchlist → ${l.name}: ${l.tickers.join(", ")}`;
    try { await navigator.clipboard.writeText(text); alert("Copied!"); } catch { prompt("Copy:", text); }
  };
  const shareCombo = async (c: Combo) => {
    const text = `Short-It Combo → ${c.name}: ${c.tickers.join(", ")}`;
    try { await navigator.clipboard.writeText(text); alert("Copied!"); } catch { prompt("Copy:", text); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b mb-4" style={{borderColor:"#1e1e22", background:"#111113"}}>
        <div className="py-3 flex items-center gap-3">
          <div className="text-xl font-semibold tracking-tight">SHORT-IT</div>
          <div className="text-xs px-2 py-1 rounded" style={{background:"#7f1d1d"}}>Bear-mode ✦ v0.4</div>
          <AuthHeader />
        </div>
      </header>

      <div className="grid md:grid-cols-4 gap-4">
        {/* Left: Chart + controls */}
        <div className="md:col-span-3 p-3 rounded-xl border" style={{borderColor:"#1e1e22", background:"#111113"}}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm opacity-80">Timeframe:</span>
            {(["1D","1W","1M","1Y"] as Gran[]).map(g=>(
              <button key={g} onClick={()=>setGran(g)} className={clsx("px-2 py-1 rounded border text-sm", gran===g ? "font-semibold" : "opacity-80")} style={{borderColor:"#1e1e22", background: gran===g ? "#7f1d1d" : "transparent"}}>{g}</button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={()=> userId ? saveCombo() : requireAuth()} className="px-3 py-1 rounded border text-sm" style={{borderColor:"#1e1e22"}}>Save Combo</button>
            </div>
          </div>

          <TVChart tickers={selected} seriesMap={series} />
          <div className="text-xs opacity-70 mt-2">{loading ? "Loading data…" : "Live data via /api/timeseries (ETF proxies if needed). Not financial advice."}</div>
        </div>

        {/* Right: Tickers / Lists / Combos */}
        <div className="space-y-4">
          <div className="p-3 rounded-xl border" style={{borderColor:"#1e1e22", background:"#111113"}}>
            <div className="font-semibold mb-2">Tickers</div>
            <div className="grid grid-cols-2 gap-2">
              {UNIVERSE.map(t=>{
                const active = selected.includes(t);
                return (
                  <button
                    key={t}
                    onClick={()=>toggle(t)}
                    className={clsx("px-2 py-1 rounded border text-left", active ? "" : "opacity-70")}
                    style={{borderColor:"#1e1e22", background: active ? colorFor(t)+"22" : "transparent"}}
                  >
                    <span className="text-sm" style={{color: active ? colorFor(t) : "inherit"}}>{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl border" style={{borderColor:"#1e1e22", background:"#111113"}}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Stock Lists</div>
              <button onClick={()=> userId ? createList() : requireAuth()} className="text-xs px-2 py-1 rounded border" style={{borderColor:"#1e1e22"}}>+ New List</button>
            </div>
            {!userId && <div className="text-sm opacity-70">Sign in to create and manage your watchlists.</div>}
            {userId && (
              <div className="space-y-3">
                {lists.map(l=>(
                  <div key={l.id} className="rounded-lg p-2 border" style={{borderColor:"#1e1e22"}}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{l.name}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>shareList(l)} className="text-xs px-2 py-1 rounded border" style={{borderColor:"#1e1e22"}}>Share</button>
                        <button onClick={()=>deleteList(l.id)} className="text-xs px-2 py-1 rounded border" style={{borderColor:"#1e1e22"}}>Delete</button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {l.tickers.map(t=> (
                        <span key={t} className="text-xs px-2 py-1 rounded border flex items-center gap-2" style={{borderColor:"#1e1e22"}}>
                          {t}
                          <button onClick={()=>removeFromList(l.id, t)} className="opacity-70 hover:opacity-100">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {UNIVERSE.map(t=>(
                        <button key={t} onClick={()=>addToList(l.id, t)} className="text-xs px-2 py-1 rounded border opacity-80 hover:opacity-100" style={{borderColor:"#1e1e22"}}>+ {t}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border" style={{borderColor:"#1e1e22", background:"#111113"}}>
            <div className="font-semibold mb-2">Combos</div>
            {!userId && <div className="text-sm opacity-70">Sign in to save and share combos.</div>}
            {userId && (
              <div className="space-y-3">
                {combos.map(c=>(
                  <div key={c.id} className="rounded-lg p-2 border" style={{borderColor:"#1e1e22"}}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{c.name}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>shareCombo(c)} className="text-xs px-2 py-1 rounded border" style={{borderColor:"#1e1e22"}}>Share</button>
                        <button onClick={()=>deleteCombo(c.id)} className="text-xs px-2 py-1 rounded border" style={{borderColor:"#1e1e22"}}>Delete</button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.tickers.map(t=>(
                        <span key={t} className="text-xs px-2 py-1 rounded border" style={{borderColor:"#1e1e22", color: colorFor(t)}}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
