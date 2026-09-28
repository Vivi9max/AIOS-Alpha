import "server-only";

import {
  readGitHubFile,
} from "@/lib/github/bridge";

import {
  detectFounderRuntimeGitHubTask,
} from "@/lib/github/founder-runtime-task-detector";

const DEFAULT_REPOSITORY =
  "Vivi9max/AIOS-Alpha";

const DEFAULT_BRANCH =
  "main";

const MAX_READ_SIZE =
  300000;

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

function normalizePath(
  value: string,
): string {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

function isSafeRepositoryPath(
  value: string,
): boolean {
  if (!value) {
    return false;
  }

  if (
    value.includes("..") ||
    value.includes("\\") ||
    value.startsWith(".git/")
  ) {
    return false;
  }

  return (
    value.length <= 500 &&
    /^[A-Za-z0-9._/@-]+$/.test(
      value,
    )
  );
}

export async function executePlannerGitHubRead(
  input: string,
): Promise<PlannerGitHubReadResult> {
  const detection =
    detectFounderRuntimeGitHubTask(
      input,
    );

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

  const path =
    normalizePath(
      detection.path,
    );

  if (
    !isSafeRepositoryPath(
      path,
    )
  ) {
    return {
      detected: true,
      success: false,
      path,
      code:
        "GITHUB_READ_INVALID_PATH",
      error:
        "The requested GitHub path is not allowed.",
    };
  }

  try {
    const result =
      await readGitHubFile({
        repo:
          DEFAULT_REPOSITORY,
        path,
        ref:
          DEFAULT_BRANCH,
      });

    if (
      !result.success
    ) {
      return {
        detected: true,
        success: false,
        path,
        code:
          "GITHUB_READ_FAILED",
        error:
          result.error ||
          "GitHub file read failed.",
      };
    }

    if (
      !result.data
    ) {
      return {
        detected: true,
        success: false,
        path,
        code:
          "GITHUB_READ_EMPTY",
        error:
          "GitHub returned no file data.",
      };
    }

    const content =
      result.data.content ??
      "";

    const size =
      result.data.size ??
      content.length;

    if (
      size >
      MAX_READ_SIZE
    ) {
      return {
        detected: true,
        success: false,
        path,
        size,
        code:
          "GITHUB_READ_TOO_LARGE",
        error:
          "The requested GitHub file is too large for direct Chat inspection.",
      };
    }

    return {
      detected: true,
      success: true,
      path,
      content,
      sha:
        result.data.sha,
      size,
      code:
        "CHAT_GITHUB_READ_COMPLETED",
    };
  } catch (
    error
  ) {
    return {
      detected: true,
      success: false,
      path,
      code:
        "GITHUB_READ_RUNTIME_ERROR",
      error:
        error instanceof Error
          ? error.message
          : "GitHub read failed.",
    };
  }
}
