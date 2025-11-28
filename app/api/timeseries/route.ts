import { NextResponse } from "next/server";
import { fetchTimeseries, normalize, resample, resolveSymbol, type Gran } from "@/lib/providers/timeseries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const gran = (searchParams.get("gran") || "1D") as Gran;
  const norm = (searchParams.get("normalize") || "true") === "true";

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const providerSymbol = resolveSymbol(symbol);
  if (!providerSymbol) {
    return NextResponse.json({ symbol, providerSymbol: null, gran, normalize: norm, data: [], note: "No provider mapping for this symbol." });
  }

  try {
    const pts = await fetchTimeseries(providerSymbol);
    const sampled = resample(pts, gran);
    const data = norm ? normalize(sampled) : sampled;
    return NextResponse.json({ symbol, providerSymbol, gran, normalize: norm, data });
  } catch (e: any) {
    const msg = String(e?.message || e || "error");
    return NextResponse.json({ symbol, providerSymbol, gran, normalize: norm, data: [], note: msg }, { status: 200 });
  }
}
