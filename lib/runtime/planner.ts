import {
  parseWorkspaceIntent,
} from "@/lib/router/intentParser";

import type {
  WorkspaceAction,
} from "@/lib/router/types";

export type RuntimePlanType =
  | "workspace-action"
  | "conversation";

export interface RuntimePlan {
  id: string;
  type: RuntimePlanType;
  prompt: string;
  action: WorkspaceAction;
  steps: string[];
  createdAt: number;
}

function createPlanId(): string {
  return [
    "plan",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("-");
}

export function buildRuntimePlan(
  prompt: string
): RuntimePlan {
  const cleanPrompt =
    prompt.trim();

  const action =
    parseWorkspaceIntent(
      cleanPrompt
    );

  if (
    action.type !== "none"
  ) {
    return {
      id: createPlanId(),
      type:
        "workspace-action",
      prompt:
        cleanPrompt,
      action,
      steps: [
        "hydrate-context",
        "validate-action",
        "execute-action",
        "save-memory",
        "return-response",
      ],
      createdAt:
        Date.now(),
    };
  }

  return {
    id: createPlanId(),
    type: "conversation",
    prompt: cleanPrompt,
    action: {
      type: "none",
    },
    steps: [
      "hydrate-context",
      "build-context",
      "invoke-provider",
      "save-memory",
      "return-response",
    ],
    createdAt:
      Date.now(),
  };
}