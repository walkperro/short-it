import type { Source } from "./sources";

const POLY = process.env.POLYGON_API_KEY!;
const FRED = process.env.FRED_API_KEY!;

export type Point = { time: number; value: number };

function dateRangeForGran(gran: string) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  switch (gran) {
    case "1D": start.setUTCFullYear(end.getUTCFullYear() - 1); break;
    case "1W": start.setUTCFullYear(end.getUTCFullYear() - 3); break;
    case "1M": start.setUTCFullYear(end.getUTCFullYear() - 10); break;
    case "1Y": start.setUTCFullYear(end.getUTCFullYear() - 25); break;
    default:   start.setUTCFullYear(end.getUTCFullYear() - 2);
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { startISO: iso(start), endISO: iso(end) };
}

async function polygonTimeseries(id: string, gran: string): Promise<Point[]> {
  const { startISO, endISO } = dateRangeForGran(gran);
  const url =
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(id)}` +
    `/range/1/day/${startISO}/${endISO}?adjusted=true&sort=asc&limit=50000&apiKey=${POLY}`;
  const r = await fetch(url, { next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`Polygon ${id} ${r.status}`);
  const j = await r.json();
  const rows = Array.isArray(j.results) ? j.results : [];
  return rows.map((b: any) => ({
    time: Math.floor(Number(b.t) / 1000), // seconds
    value: Number(b.c),
  }));
}

async function fredSeries(seriesId: string, gran: string): Promise<Point[]> {
  const { startISO, endISO } = dateRangeForGran(gran);
  const url =
    `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}` +
    `&api_key=${FRED}&file_type=json&observation_start=${startISO}&observation_end=${endISO}`;
  const r = await fetch(url, { next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`FRED ${seriesId} ${r.status}`);
  const j = await r.json();
  const obs = Array.isArray(j.observations) ? j.observations : [];
  return obs
    .filter((o: any) => o.value !== "." && o.value != null)
    .map((o: any) => ({
      time: Math.floor(Date.parse(o.date) / 1000), // seconds
      value: Number(o.value),
    }));
}

export async function fetchTimeseries(src: Source, gran: string): Promise<Point[]> {
  if (src.provider === "polygon") return polygonTimeseries(src.id, gran);
  if (src.provider === "fred")    return fredSeries(src.id, gran);
  throw new Error(`Unknown provider for ${JSON.stringify(src)}`);
}
