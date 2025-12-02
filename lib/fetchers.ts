import { Gran, SourceType, dateRangeForGran } from "./sources";

export type Pt = { time: number; value: number };

// Polygon Aggregates (stocks + forex)
export async function fetchPolygonAggs(ticker: string, gran: Gran): Promise<Pt[]> {
  const key = process.env.POLYGON_API_KEY!;
  if (!key) throw new Error("Missing POLYGON_API_KEY");

  const timespan = gran === "1D" ? "day" : gran === "1W" ? "week" : "month";
  const { fromISO, toISO } = dateRangeForGran(gran);

  const url =
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}` +
    `/range/1/${timespan}/${fromISO}/${toISO}` +
    `?adjusted=true&sort=asc&limit=50000&apiKey=${key}`;

  const r = await fetch(url, { next: { revalidate: 300 }, cache: "no-store" });
  if (!r.ok) throw new Error(`Polygon ${r.status}`);
  const j = await r.json();
  const rows = j?.results ?? [];
  return rows
    .map((row: any) => ({ time: Number(row.t), value: Number(row.c) }))
    .filter((p) => Number.isFinite(p.value));
}

// FRED series with fallback support: "ID1|ID2|ID3"
export async function fetchFredSeries(seriesIdList: string, _gran: Gran): Promise<Pt[]> {
  const key = process.env.FRED_API_KEY!;
  if (!key) throw new Error("Missing FRED_API_KEY");

  const ids = seriesIdList.split("|").map(s => s.trim()).filter(Boolean);
  const { fromISO, toISO } = dateRangeForGran("1Y"); // broad window is fine; UI syncs view

  for (const id of ids) {
    const url =
      `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(id)}` +
      `&api_key=${key}&file_type=json&observation_start=${fromISO}&observation_end=${toISO}`;
    const r = await fetch(url, { next: { revalidate: 300 }, cache: "no-store" });
    if (!r.ok) continue; // try next id
    const j = await r.json();
    const obs = j?.observations ?? [];
    const pts = obs
      .map((o: any) => ({
        time: new Date(o.date + "T00:00:00Z").getTime(),
        value: o.value === "." ? NaN : Number(o.value),
      }))
      .filter((p: Pt) => Number.isFinite(p.value));
    if (pts.length) return pts; // success on this id
  }

  // nothing worked
  return [];
}

export async function fetchTimeseries(source: SourceType, symbol: string, gran: Gran): Promise<Pt[]> {
  if (source === "polygon-stock" || source === "polygon-forex") return fetchPolygonAggs(symbol, gran);
  if (source === "fred") return fetchFredSeries(symbol, gran);
  return [];
}
