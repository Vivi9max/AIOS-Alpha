import "server-only";

import {
  createFounderDevelopmentContract,
} from "@/lib/github/founder-development-contract";

import {
  dispatchGitHubTask,
  type GitHubTaskAction,
  type GitHubTaskResult,
} from "@/lib/github/task-dispatch";

const DEFAULT_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const DEFAULT_BRANCH = "main";

export interface FounderRuntimeGitHubTask {
  action: GitHubTaskAction;
  path: string;
  content?: string;
  commitMessage?: string;
  objective?: string;
}

export interface FounderRuntimeGitHubTaskResult {
  success: boolean;
  code: string;
  task: {
    action: GitHubTaskAction;
    repository: string;
    branch: string;
    path: string;
  };
  github: GitHubTaskResult;
}

function normalizeObjective(
  task: FounderRuntimeGitHubTask,
): string {
  return (
    task.objective?.trim() ||
    `Founder-authorized AIOS Runtime GitHub ${task.action} operation for ${task.path}.`
  );
}

function createContract(
  task: FounderRuntimeGitHubTask,
) {
  return createFounderDevelopmentContract({
    objective: normalizeObjective(task),
    requestedFiles: [task.path],
    actions: [
      "read",
      "write",
      "verify",
    ],
    verification: [
      "readback",
      "build",
      "production",
    ],
    commitMessage:
      task.commitMessage?.trim() ||
      `feat(C141.11): execute founder runtime GitHub task`,
  });
}

export async function executeFounderRuntimeGitHubTask(
  task: FounderRuntimeGitHubTask,
): Promise<FounderRuntimeGitHubTaskResult> {
  const contract = createContract(task);

  const github =
    await dispatchGitHubTask({
      action: task.action,
      repo: DEFAULT_REPOSITORY,
      branch: DEFAULT_BRANCH,
      path: task.path,
      content: task.content,
      commitMessage:
        task.commitMessage,
      contract,
    });

  return {
    success: github.success,
    code:
      github.code ||
      (github.success
        ? "FOUNDER_RUNTIME_GITHUB_SUCCESS"
        : "FOUNDER_RUNTIME_GITHUB_FAILED"),
    task: {
      action: task.action,
      repository:
        DEFAULT_REPOSITORY,
      branch:
        DEFAULT_BRANCH,
      path: task.path,
    },
    github,
  };
}
