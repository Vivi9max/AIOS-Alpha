import {
  AIOS_PLANS,
  AIOSPlan,
  AIOSPlanId,
  hasPlanCapability,
} from "@/lib/billing/plans";

export type AIOSCapability =
  | "chat"
  | "memory"
  | "planner"
  | "execution"
  | "retry"
  | "automation"
  | "advanced-providers"
  | "api"
  | "team-workspace"
  | "market-research";

export interface AIOSUsageLimits {
  executionsPerDay: number | null;
  memoryItems: number | null;
  automationJobs: number | null;
  marketResearchReportsPerMonth: number | null;
}

export interface AIOSEntitlement {
  planId: AIOSPlanId;
  plan: AIOSPlan;
  capabilities: AIOSCapability[];
  limits: AIOSUsageLimits;
  active: boolean;
  source: "alpha" | "plan";
}

export interface CapabilityCheck {
  allowed: boolean;
  capability: AIOSCapability;
  planId: AIOSPlanId;
  reason:
    | "allowed"
    | "capability_not_in_plan"
    | "inactive_plan";
}

const DEFAULT_PLAN: AIOSPlanId =
  "alpha";

const AIOS_CAPABILITIES: AIOSCapability[] = [
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
];

function normalizePlanId(
  value?: string | null,
): AIOSPlanId {
  if (
    value &&
    Object.prototype.hasOwnProperty.call(
      AIOS_PLANS,
      value,
    )
  ) {
    return value as AIOSPlanId;
  }

  return DEFAULT_PLAN;
}

function isAIOSCapability(
  value: string,
): value is AIOSCapability {
  return (
    AIOS_CAPABILITIES.includes(
      value as AIOSCapability,
    )
  );
}

export function resolvePlan(
  planId?: string | null,
): AIOSPlan {
  return AIOS_PLANS[
    normalizePlanId(planId)
  ];
}

export function getEntitlement(
  planId?: string | null,
): AIOSEntitlement {
  const resolvedPlanId =
    normalizePlanId(planId);

  const plan =
    AIOS_PLANS[
      resolvedPlanId
    ];

  return {
    planId:
      resolvedPlanId,

    plan,

    capabilities:
      plan.capabilities.filter(
        (
          capability,
        ): capability is AIOSCapability =>
          isAIOSCapability(
            capability,
          ),
      ),

    limits: {
      executionsPerDay:
        plan.limits
          .executionsPerDay,

      memoryItems:
        plan.limits
          .memoryItems,

      automationJobs:
        plan.limits
          .automationJobs,

      marketResearchReportsPerMonth:
        plan.limits
          .marketResearchReportsPerMonth,
    },

    active: true,

    source:
      resolvedPlanId ===
      "alpha"
        ? "alpha"
        : "plan",
  };
}

export function canUseCapability(
  planId:
    | string
    | null
    | undefined,
  capability:
    AIOSCapability,
): CapabilityCheck {
  const entitlement =
    getEntitlement(
      planId,
    );

  if (
    !entitlement.active
  ) {
    return {
      allowed: false,

      capability,

      planId:
        entitlement.planId,

      reason:
        "inactive_plan",
    };
  }

  if (
    hasPlanCapability(
      entitlement.plan,
      capability,
    )
  ) {
    return {
      allowed: true,

      capability,

      planId:
        entitlement.planId,

      reason:
        "allowed",
    };
  }

  return {
    allowed: false,

    capability,

    planId:
      entitlement.planId,

    reason:
      "capability_not_in_plan",
  };
}

export function getCapabilityMatrix() {
  return Object.values(
    AIOS_PLANS,
  ).map((plan) => ({
    planId:
      plan.id,

    capabilities:
      plan.capabilities,

    limits: {
      executionsPerDay:
        plan.limits
          .executionsPerDay,

      memoryItems:
        plan.limits
          .memoryItems,

      automationJobs:
        plan.limits
          .automationJobs,

      marketResearchReportsPerMonth:
        plan.limits
          .marketResearchReportsPerMonth,
    },
  }));
}

export function getPlanLimit(
  planId:
    | string
    | null
    | undefined,
  limit:
    | "executionsPerDay"
    | "memoryItems"
    | "automationJobs"
    | "marketResearchReportsPerMonth",
): number | null {
  return getEntitlement(
    planId,
  ).limits[limit];
}
