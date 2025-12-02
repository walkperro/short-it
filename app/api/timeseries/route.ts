import { NextRequest } from "next/server";
import { TickerMap } from "@/lib/sources";
import { fetchTimeseries } from "@/lib/fetchers";
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";

export const dynamic = "force-dynamic";

function jsonErr(message: string, hint?: string, status = 500) {
  return Response.json({ error: { message, hint } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "").toUpperCase();
    const gran = (searchParams.get("gran") || "1D") as any;

    const map = TickerMap[symbol];
    if (!map) return jsonErr(`Unknown symbol "${symbol}"`, "Pick from MOVE, GOLD, SILVER, WTI, US10Y, VIX, SPY, QQQ", 400);

    if (map.source !== "fred" && !process.env.POLYGON_API_KEY) {
      return jsonErr("POLYGON_API_KEY missing", "Add POLYGON_API_KEY to .env.local and Vercel → Environment Variables");
    }
    if (map.source === "fred" && !process.env.FRED_API_KEY) {
      return jsonErr("FRED_API_KEY missing", "Get a free key at FRED and set FRED_API_KEY");
    }

    const key = cacheKey({ s: symbol, g: String(gran), src: map.source, sym: map.symbol });
    const cached = cacheGet<any>(key);
    if (cached) return Response.json(cached, { status: 200 });

    const data = await fetchTimeseries(map.source, map.symbol, gran);
    const payload = { symbol, label: map.label, data };

    cacheSet(key, payload);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e: any) {
    return jsonErr(e?.message || "Unknown error", "Try again in a moment or verify keys/rate limits");
  }
}
