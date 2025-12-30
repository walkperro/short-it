export const runtime = "nodejs";

export async function GET(req: Request) {
  const mod = await import("../auth/signout/route");
  return mod.GET(req as any);
}

export async function POST(req: Request) {
  const mod = await import("../auth/signout/route");
  return mod.POST(req as any);
}
