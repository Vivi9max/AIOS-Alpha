import {
  runBrain,
  type BrainResponse,
} from "@/lib/brain";

import {
  getActiveProvider,
} from "@/lib/ai/router";

import {
  addAssistantMemory,
  addMemory,
  hydrateMemory,
  saveMemory,
} from "@/lib/memory/store";

import {
  hydrateManualProfile,
} from "@/lib/memory/profile-store";

import {
  executeWorkspaceAction,
} from "@/lib/router/actionRouter";

import {
  buildPlannerContext,
  type RuntimePlan,
} from "./planner";

import {
  buildRuntimeContext,
  buildRuntimeContextText,
  type CapabilityTrace,
} from "./capability-router";

export interface RuntimeExecutionResult
  extends BrainResponse {
  planId:
    string;

  planType:
    RuntimePlan["type"];

  goal:
    string;

  intent:
    RuntimePlan["intent"];

  confidence:
    number;

  capabilities:
    RuntimePlan["capabilities"];

  steps:
    string[];

  capabilityTrace:
    CapabilityTrace[];
}

async function hydrateRuntimeContext() {
  await Promise.all([
    hydrateMemory(),
    hydrateManualProfile(),
  ]);
}

async function executeWorkspacePlan(
  plan: RuntimePlan
): Promise<RuntimeExecutionResult> {
  await hydrateRuntimeContext();

  addMemory(
    "user",
    plan.prompt
  );

  const activeProvider =
    getActiveProvider();

  const startedAt =
    Date.now();

  try {
    const execution =
      await executeWorkspaceAction(
        plan.action
      );

    if (
      !execution.handled ||
      !execution.content
    ) {
      throw new Error(
        "Workspace action was not handled."
      );
    }

    addAssistantMemory(
      execution.content
    );

    await saveMemory();

    return {
      success:
        true,

      provider:
        activeProvider,

      requestedProvider:
        activeProvider,

      fallbackUsed:
        false,

      content:
        execution.content,

      actionHandled:
        true,

      planId:
        plan.id,

      planType:
        plan.type,

      goal:
        plan.goal,

      intent:
        plan.intent,

      confidence:
        plan.confidence,

      capabilities:
        plan.capabilities,

      steps:
        plan.steps,

      capabilityTrace: [
        {
          capability:
            "workspace.action",

          status:
            "completed",

          durationMs:
            Date.now() -
            startedAt,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Workspace action failed.";

    const failureContent =
      `操作执行失败：${errorMessage}`;

    addAssistantMemory(
      failureContent
    );

    await saveMemory();

    return {
      success:
        false,

      provider:
        activeProvider,

      requestedProvider:
        activeProvider,

      fallbackUsed:
        false,

      error:
        errorMessage,

      content:
        "操作执行失败，请稍后重试。",

      actionHandled:
        true,

      planId:
        plan.id,

      planType:
        plan.type,

      goal:
        plan.goal,

      intent:
        plan.intent,

      confidence:
        plan.confidence,

      capabilities:
        plan.capabilities,

      steps:
        plan.steps,

      capabilityTrace: [
        {
          capability:
            "workspace.action",

          status:
            "failed",

          durationMs:
            Date.now() -
            startedAt,

          detail:
            errorMessage,
        },
      ],
    };
  }
}

async function executeAIPlan(
  plan: RuntimePlan
): Promise<RuntimeExecutionResult> {
  const context =
    await buildRuntimeContext(
      plan
    );

  const plannerPrompt =
    [
      buildPlannerContext(
        plan
      ),

      "",
      buildRuntimeContextText(
        context
      ),
    ].join("\n");

  const result =
    await runBrain({
      prompt:
        plannerPrompt,
    });

  return {
    ...result,

    planId:
      plan.id,

    planType:
      plan.type,

    goal:
      plan.goal,

    intent:
      plan.intent,

    confidence:
      plan.confidence,

    capabilities:
      plan.capabilities,

    steps:
      plan.steps,

    capabilityTrace:
      context.trace,
  };
}

export async function executeRuntimePlan(
  plan: RuntimePlan
): Promise<RuntimeExecutionResult> {
  if (
    plan.type ===
    "workspace-action"
  ) {
    return executeWorkspacePlan(
      plan
    );
  }

  return executeAIPlan(
    plan
  );
}