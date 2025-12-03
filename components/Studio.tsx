"use client";
import { useEffect, useState, useRef } from "react";
import GridCharts from "./GridCharts";

export default function Studio({ symbols, fetcher }:{symbols:string[]; fetcher:(s:string)=>Promise<any>}){
  const [open,setOpen] = useState(false);
  const [layout,setLayout] = useState<"grid"|"stacked">("grid");
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      container.current?.querySelectorAll<HTMLElement>("[id^='chart-']").forEach(el=>{
        el.dispatchEvent(new Event("resize"));
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, layout]);

  if (!open) return (
    <button onClick={()=>setOpen(true)} className="rounded-xl bg-zinc-800 px-3 py-2 text-sm">Open Studio</button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/90 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="text-xl font-bold">Studio</div>
        <div className="flex-1" />
        <button onClick={()=>setLayout(l=>l==="grid"?"stacked":"grid")} className="rounded-xl bg-zinc-800 px-3 py-1.5 text-sm">{layout==="grid"?"Stacked":"2×2"}</button>
        <button onClick={()=>setOpen(false)} className="rounded-xl bg-red-600 px-3 py-1.5 text-sm text-black">Exit</button>
      </div>
      <div ref={container} className="h-[92dvh] overflow-auto">
        <GridCharts symbols={symbols} fetcher={fetcher} layout={layout}/>
      </div>
    </div>
  );
}
