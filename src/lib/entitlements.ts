export type Plan = "free" | "ideas" | "conviction" | "macro";

export const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  ideas: 1,
  conviction: 2,
  macro: 3,
};

export function canAccess(userPlan: Plan | null | undefined, required: Plan) {
  const up = PLAN_RANK[userPlan ?? "free"] ?? 0;
  return up >= PLAN_RANK[required];
}
