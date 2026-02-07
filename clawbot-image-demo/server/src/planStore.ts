export type PlanStep = {
  id: string;
  action: string;
  tools: string[];
  risk: "low" | "medium" | "high";
  needsApproval: boolean;
};

export type Plan = {
  planId: string;
  sessionId: string;
  riskTags: string[];
  confirmationText: string;
  steps: PlanStep[];
  imageUrl?: string;
  teamTarget: string;
};

const plans = new Map<string, any>();

export function savePlan(planId: string, plan: any) {
  plans.set(planId, plan);
}

export function getPlan(planId: string) {
  const p = plans.get(planId);
  if (!p) throw new Error(`Plan not found: ${planId}`);
  return p;
}
