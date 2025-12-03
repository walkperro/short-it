import { NextResponse } from "next/server";
import { fetchTimeseriesRaw } from "@/lib/fetchers";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "SPY").toUpperCase();
  const gran = (searchParams.get("gran") || "1D") as "1D"|"1W"|"1M"|"1Y";

  try {
    const ts = await fetchTimeseriesRaw(symbol, gran);
    return NextResponse.json(ts, {
      headers: { "cache-control": "no-store" }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
