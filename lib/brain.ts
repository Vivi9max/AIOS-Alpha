import { chat } from "./ai";

import type {
  AIProvider,
} from "./ai/types";

import {
  getActiveProvider,
} from "./ai/router";

import {
  addAssistantMemory,
  addMemory,
  hydrateMemory,
  saveMemory,
} from "./memory/store";

import {
  hydrateManualProfile,
} from "./memory/profile-store";

import {
  parseWorkspaceIntent,
} from "./router/intentParser";

import {
  executeWorkspaceAction,
} from "./router/actionRouter";

export interface BrainRequest {
  prompt: string;

  systemPrompt?: string;

  historyLimit?: number;
}

export interface BrainResponse {
  success: boolean;
  provider: AIProvider;
  requestedProvider?: AIProvider;
  fallbackUsed?: boolean;
  error?: string;
  content: string;
  actionHandled?: boolean;
}

export async function runBrain(
  request: BrainRequest
): Promise<BrainResponse> {
  const prompt =
    request.prompt.trim();

  if (!prompt) {
    return {
      success: false,
      provider: "mock",
      requestedProvider:
        "mock",
      fallbackUsed: false,
      content:
        "请输入内容。",
      actionHandled: false,
    };
  }

  await Promise.all([
    hydrateMemory(),
    hydrateManualProfile(),
  ]);

  const action =
    parseWorkspaceIntent(
      prompt
    );

  if (
    action.type !== "none"
  ) {
    addMemory(
      "user",
      prompt
    );

    try {
      const execution =
        await executeWorkspaceAction(
          action
        );

      if (
        execution.handled &&
        execution.content
      ) {
        const activeProvider =
          getActiveProvider();

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
        };
      }
    } catch (error) {
      const activeProvider =
        getActiveProvider();

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Workspace action failed.";

      const content =
        `操作执行失败：${errorMessage}`;

      addAssistantMemory(
        content
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
      };
    }
  }

  addMemory(
    "user",
    prompt
  );

  try {
    const result =
      await chat(
        prompt,
        {
          systemPrompt:
            request.systemPrompt,
          historyLimit:
            request.historyLimit ??
            20,
        }
      );

    addAssistantMemory(
      result.content
    );

    await saveMemory();

    return {
      success:
        result.success,
      provider:
        result.provider,
      requestedProvider:
        result.requestedProvider,
      fallbackUsed:
        result.fallbackUsed,
      error:
        result.error,
      content:
        result.content,
      actionHandled:
        false,
    };
  } catch (error) {
    await saveMemory();

    throw error;
  }
}
