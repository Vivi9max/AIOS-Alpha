import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

import {
  buildRuntimePlan,
} from "@/lib/runtime/planner";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface PlannerRequestBody {
  goal?: unknown;
  mode?: unknown;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    planner: "AIOS Planner Engine",
    version: APP_CONFIG.version,
    capabilities: [
      "goal-understanding",
      "intent-detection",
      "step-planning",
      "capability-routing",
      "runtime-execution",
    ],
    status: "online",
    timestamp: Date.now(),
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        PlannerRequestBody;

    const goal =
      typeof body.goal === "string"
        ? body.goal.trim()
        : "";

    const mode =
      body.mode === "execute"
        ? "execute"
        : "plan";

    if (!goal) {
      return NextResponse.json(
        {
          success: false,
          error: "请输入目标。",
        },
        {
          status: 400,
        }
      );
    }

    const plan =
      buildRuntimePlan(goal);

    if (mode === "plan") {
      return NextResponse.json({
        success: true,
        mode: "plan",
        planner:
          "AIOS Planner Engine",
        plan: {
          id: plan.id,
          type: plan.type,
          goal: plan.goal,
          intent: plan.intent,
          confidence:
            plan.confidence,
          capabilities:
            plan.capabilities,
          steps: plan.steps,
          responseMode:
            plan.responseMode,
          createdAt:
            plan.createdAt,
        },
        timestamp: Date.now(),
      });
    }

    const result =
      await executeRuntime({
        prompt: [
          "请根据以下目标生成并执行当前最合理的工作计划。",
          "需要明确目标、阶段、具体步骤和立即行动。",
          "",
          goal,
        ].join("\n"),
      });

    return NextResponse.json({
      success: result.success,
      mode: "execute",
      planner:
        "AIOS Planner Engine",
      plan: {
        id:
          result.planId ??
          plan.id,
        type:
          result.planType ??
          plan.type,
        goal:
          result.goal ??
          plan.goal,
        intent:
          result.intent ??
          plan.intent,
        confidence:
          result.confidence ??
          plan.confidence,
        capabilities:
          result.capabilities ??
          plan.capabilities,
        steps:
          result.steps ??
          plan.steps,
      },
      execution: {
        requestId:
          result.requestId,
        provider:
          result.provider,
        fallbackUsed:
          result.fallbackUsed ??
          false,
        content:
          result.content,
        capabilityTrace:
          result.capabilityTrace ??
          [],
        latencyMs:
          result.latencyMs,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Planner 请求失败";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}