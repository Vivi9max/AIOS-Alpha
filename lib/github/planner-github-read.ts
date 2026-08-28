import "server-only";

import {
  detectFounderRuntimeGitHubTask,
} from "@/lib/github/founder-runtime-task-detector";

import {
  executeFounderRuntimeGitHubTask,
} from "@/lib/github/founder-runtime-task";

export interface PlannerGitHubReadResult {
  detected: boolean;
  success: boolean;
  path?: string;
  content?: string;
  sha?: string;
  size?: number;
  code?: string;
  error?: string;
}

export async function executePlannerGitHubRead(
  input: string,
): Promise<PlannerGitHubReadResult> {
  const detection =
    detectFounderRuntimeGitHubTask(input);

  if (
    !detection.isGitHubTask ||
    detection.action !== "read" ||
    !detection.path
  ) {
    return {
      detected: false,
      success: true,
    };
  }

  const result =
    await executeFounderRuntimeGitHubTask({
      action: "read",
      path: detection.path,
      objective:
        `Planner real GitHub read: ${input.slice(0, 500)}`,
    });

  if (!result.success) {
    return {
      detected: true,
      success: false,
      path: detection.path,
      code: result.github.code,
      error: result.github.error,
    };
  }

  return {
    detected: true,
    success: true,
    path: detection.path,
    content:
      result.github.read?.content ?? "",
    sha:
      result.github.read?.sha,
    size:
      result.github.read?.size,
    code:
      result.github.code,
  };
}
