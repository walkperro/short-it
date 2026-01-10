export type Plan = "free" | "ideas" | "conviction" | "macro";
export type Section = "ideas" | "conviction" | "macro";

export function normalizePlan(input: any): Plan {
  const s = String(input ?? "").toLowerCase();
  if (s === "macro") return "macro";
  if (s === "conviction") return "conviction";
  if (s === "ideas") return "ideas";
  return "free";
}

export function levelLabelFromPlan(plan: Plan) {
  if (plan === "ideas") return "LEVEL I";
  if (plan === "conviction") return "LEVEL II";
  if (plan === "macro") return "LEVEL III";
  return "FREE";
}

export function planDisplay(plan: Plan) {
  if (plan === "ideas") return `Ideas (${levelLabelFromPlan(plan)})`;
  if (plan === "conviction") return `Conviction (${levelLabelFromPlan(plan)})`;
  if (plan === "macro") return `Macro (${levelLabelFromPlan(plan)})`;
  return "Free";
}

// STRICT: plan first, section second (no guessing)
export function canAccess(plan: Plan, section: Section) {
  plan = normalizePlan(plan);

  if (plan === "macro") return true;
  if (plan === "conviction") return section !== "macro";
  if (plan === "ideas") return section === "ideas";
  return section === "ideas";
}
