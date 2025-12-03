import { NextResponse } from "next/server";
import { resolveSource } from "@/lib/sources";
import { fetchTimeseries } from "@/lib/fetchers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "SPY").toUpperCase();
  const gran   = (searchParams.get("gran") || "1D").toUpperCase();

  try {
    const src = resolveSource(symbol);
    const series = await fetchTimeseries(src, gran);
    return NextResponse.json(
      { symbol, gran, series },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch (e: any) {
    return NextResponse.json({ symbol, gran, error: String(e?.message || e) }, { status: 500 });
  }
}
