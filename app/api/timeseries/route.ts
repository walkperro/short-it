import { NextResponse } from "next/server";
import { fetchTimeseries, normalize, resample, resolveSymbol, type Gran } from "@/lib/providers/timeseries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const gran = (searchParams.get("gran") || "1D") as Gran;
    const norm = (searchParams.get("normalize") || "true") === "true";

    if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

    const providerSymbol = resolveSymbol(symbol);
    if (!providerSymbol) {
      return NextResponse.json({ symbol, data: [], note: "No provider mapping for this symbol (e.g., MOVE index)." });
    }

    const pts = await fetchTimeseries(providerSymbol);
    const sampled = resample(pts, gran);
    const data = norm ? normalize(sampled) : sampled;

    return NextResponse.json({ symbol, providerSymbol, gran, normalize: norm, data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown error" }, { status: 500 });
  }
}
