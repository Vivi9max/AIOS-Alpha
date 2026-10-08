export type AIOSPlanId =
  | "alpha"
  | "free"
  | "pro"
  | "business";

export interface AIOSPlan {
  id: AIOSPlanId;
  name: string;
  description: string;
  priceLabel: string;
  highlighted?: boolean;
  capabilities: string[];
  limits: {
    executionsPerDay: number | null;
    memoryItems: number | null;
    automationJobs: number | null;
    marketResearchReportsPerMonth: number | null;
  };
}

export const AIOS_PLANS: Record<
  AIOSPlanId,
  AIOSPlan
> = {
  alpha: {
    id: "alpha",

    name: "Alpha",

    description:
      "Private Alpha access for early AIOS users.",

    priceLabel:
      "Private Alpha",

    capabilities: [
      "chat",
      "memory",
      "planner",
      "execution",
      "market-research",
    ],

    limits: {
      executionsPerDay: 20,
      memoryItems: 500,
      automationJobs: 0,
      marketResearchReportsPerMonth: null,
    },
  },

  free: {
    id: "free",

    name: "Free",

    description:
      "A lightweight AIOS workspace for everyday experiments.",

    priceLabel:
      "Free",

    capabilities: [
      "chat",
      "memory",
      "planner",
    ],

    limits: {
      executionsPerDay: 5,
      memoryItems: 100,
      automationJobs: 0,
      marketResearchReportsPerMonth: 0,
    },
  },

  pro: {
    id: "pro",

    name: "Pro",

    description:
      "Professional AIOS market research and advanced intelligence workflows.",

    priceLabel:
      "Coming soon",

    highlighted: true,

    capabilities: [
      "chat",
      "memory",
      "planner",
      "execution",
      "retry",
      "automation",
      "advanced-providers",
      "api",
      "market-research",
    ],

    limits: {
      executionsPerDay: 200,
      memoryItems: 5000,
      automationJobs: 20,
      marketResearchReportsPerMonth: 30,
    },
  },

  business: {
    id: "business",

    name: "Business",

    description:
      "Shared AIOS market intelligence and decision workflows for teams and business operations.",

    priceLabel:
      "Coming soon",

    capabilities: [
      "chat",
      "memory",
      "planner",
      "execution",
      "retry",
      "automation",
      "advanced-providers",
      "api",
      "team-workspace",
      "market-research",
    ],

    limits: {
      executionsPerDay: null,
      memoryItems: null,
      automationJobs: null,
      marketResearchReportsPerMonth: null,
    },
  },
};

export function getAIOSPlan(
  id: AIOSPlanId,
): AIOSPlan {
  return AIOS_PLANS[id];
}

export function hasPlanCapability(
  plan: AIOSPlan,
  capability: string,
): boolean {
  return plan.capabilities.includes(
    capability,
  );
}
