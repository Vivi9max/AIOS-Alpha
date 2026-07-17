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

import type {
  RuntimePlan,
} from "./planner";

export interface RuntimeExecutionResult
  extends BrainResponse {
  planId: string;

  planType:
    RuntimePlan["type"];

  steps: string[];
}

async function executeWorkspacePlan(
  plan: RuntimePlan
): Promise<RuntimeExecutionResult> {
  await Promise.all([
    hydrateMemory(),
    hydrateManualProfile(),
  ]);

  addMemory(
    "user",
    plan.prompt
  );

  const activeProvider =
    getActiveProvider();

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
      success: true,

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

      steps:
        plan.steps,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Workspace action failed.";

    addAssistantMemory(
      `操作执行失败：${errorMessage}`
    );

    await saveMemory();

    return {
      success: false,

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

      steps:
        plan.steps,
    };
  }
}

async function executeConversationPlan(
  plan: RuntimePlan
): Promise<RuntimeExecutionResult> {
  const result =
    await runBrain({
      prompt:
        plan.prompt,
    });

  return {
    ...result,

    planId:
      plan.id,

    planType:
      plan.type,

    steps:
      plan.steps,
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

  return executeConversationPlan(
    plan
  );
}