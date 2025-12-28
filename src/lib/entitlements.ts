export type Plan = "free" | "ideas" | "conviction" | "macro";

const RANK: Record<Plan, number> = {
  free: 0,
  ideas: 1,
  conviction: 2,
  macro: 3,
};

export function normalizePlan(p: any): Plan {
  const v = String(p ?? "free").toLowerCase();
  if (v === "ideas" || v === "conviction" || v === "macro") return v;
  return "free";
}

export function canAccess(userPlan: any, required: Plan): boolean {
  const up = normalizePlan(userPlan);
  return (RANK[up] ?? 0) >= (RANK[required] ?? 0);
}

export function levelLabelFromPlan(userPlan: any): { short: string; long: string } {
  const p = normalizePlan(userPlan);
  if (p === "macro") return { short: "III", long: "LEVEL III" };
  if (p === "conviction") return { short: "II", long: "LEVEL II" };
  if (p === "ideas") return { short: "I", long: "LEVEL I" };
  return { short: "—", long: "FREE" };
}
