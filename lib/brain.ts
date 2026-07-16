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
  buildConversationContext,
  hydrateMemory,
  saveMemory,
  searchMemory,
} from "./memory/store";

import {
  buildMemoryProfileText,
} from "./memory/index";

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
      content: "请输入内容。",
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
          fallbackUsed: false,
          content:
            execution.content,
          actionHandled: true,
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
        fallbackUsed: false,
        error: errorMessage,
        content:
          "操作执行失败，请稍后重试。",
        actionHandled: true,
      };
    }
  }

  const conversationContext =
    buildConversationContext(
      20
    );

  const profileContext =
    buildMemoryProfileText();

  const relatedMemory =
    searchMemory(
      prompt
    ).slice(-5);

  addMemory(
    "user",
    prompt
  );

  const finalPrompt = [
    "You are the AIOS Alpha brain.",
    "Answer the current user message directly.",
    "Use the saved profile and conversation memory only when relevant.",
    "Do not claim that an action was completed unless the system actually executed it.",
    "Do not treat questions as new personal facts.",
    "Respond in the same language as the user unless the user asks otherwise.",
    "",
    "USER_PROFILE:",
    profileContext ||
      "(empty)",
    "",
    "CONVERSATION_MEMORY:",
    conversationContext ||
      "(empty)",
    "",
    "RELATED_MEMORY:",
    relatedMemory.length > 0
      ? relatedMemory
          .map(
            (item) =>
              `${item.role}: ${item.content}`
          )
          .join("\n")
      : "(empty)",
    "",
    "CURRENT_USER_MESSAGE:",
    prompt,
  ].join("\n");

  try {
    const result =
      await chat(
        finalPrompt
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

      actionHandled: false,
    };
  } catch (error) {
    await saveMemory();

    throw error;
  }
}