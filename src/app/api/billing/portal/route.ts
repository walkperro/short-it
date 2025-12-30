export const runtime = "nodejs";

export async function POST(req: Request) {
  const mod = await import("../../stripe/portal/route");
  return mod.POST(req as any);
}
