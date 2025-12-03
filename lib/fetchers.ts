import type { LineData } from "lightweight-charts";
import { resolveSource } from "./sources";

const POLY = process.env.POLYGON_API_KEY!;
const FRED = process.env.FRED_API_KEY!;

export type TS = { id: string; name: string; color: string; data: LineData[] };

function toISO(d: Date){ return d.toISOString().slice(0,10); }

export async function fetchTimeseriesRaw(symbol: string, gran: "1D"|"1W"|"1M"|"1Y"): Promise<TS> {
  const src = resolveSource(symbol);
  if (!src) throw new Error("Unknown symbol");

  const end = new Date();
  const start = new Date();
  if (gran === "1Y") start.setFullYear(end.getFullYear()-10);
  else if (gran === "1M") start.setFullYear(end.getFullYear()-3);
  else if (gran === "1W") start.setFullYear(end.getFullYear()-2);
  else start.setFullYear(end.getFullYear()-1);

  if (src.kind === "polygon") {
    const res = await fetch(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(src.ticker!)}/range/1/day/${toISO(start)}/${toISO(end)}?adjusted=true&sort=asc&limit=50000&apiKey=${POLY}`, { cache:"no-store" });
    if (!res.ok) throw new Error("Polygon failed");
    const j = await res.json();
    const data: LineData[] = (j.results ?? []).map((r: any) => ({ time: Math.floor(r.t/1000), value: r.c }));
    return { id: symbol, name: src.name, color: src.color, data };
  } else {
    const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${src.series}&api_key=${FRED}&file_type=json&observation_start=${toISO(start)}&observation_end=${toISO(end)}`, { cache:"no-store" });
    if (!res.ok) throw new Error("FRED failed");
    const j = await res.json();
    const data: LineData[] = (j.observations ?? [])
      .filter((o: any) => o.value !== "." && o.value !== null)
      .map((o: any) => ({ time: Math.floor(new Date(o.date).getTime()/1000), value: Number(o.value) }));
    return { id: symbol, name: src.name, color: src.color, data };
  }
}
