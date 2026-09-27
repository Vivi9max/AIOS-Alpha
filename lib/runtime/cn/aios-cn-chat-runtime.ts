import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

import {
  executeAIOSCNRuntime,
} from "./aios-cn-runtime";

import type {
  AIOSCNProvider,
} from "./aios-cn-runtime-types";

import type {
  AIOSCNChatResponse,
} from "./aios-cn-chat-types";

const RUNTIME_VERSION =
  "C165.2";

function buildEvidencePrompt(
  prompt: string,
  inputs: AIOSInputItem[],
  locale: string,
): string {
  const usableInputs =
    inputs.filter(
      (input) =>
        input.processingStatus ===
          "ready" &&
        typeof input.extractedText ===
          "string" &&
        input.extractedText.trim()
          .length > 0,
    );

  if (
    usableInputs.length ===
    0
  ) {
    return prompt.trim();
  }

  const evidence =
    usableInputs.map(
      (input) => {
        const name =
          input.metadata.name ??
          input.id;

        return [
          `Input: ${name}`,
          "Status: ready",
          "Evidence:",
          input.extractedText!.trim(),
        ].join("\n");
      },
    );

  const evidenceLabel =
    locale === "zh-CN"
      ? "以下内容来自 AIOS CN Input Understanding 对用户输入的实际处理结果。它属于输入证据，不是自动确认的事实。请明确区分证据、可确认内容和推断。"
      : locale === "ja"
        ? "以下は AIOS CN Input Understanding がユーザー入力から実際に取得した証拠です。自動的に事実と確定された情報ではありません。証拠、確認可能な内容、推測を明確に区別してください。"
        : "The following is evidence actually produced by AIOS CN Input Understanding from the user's uploaded inputs. It is not automatically verified as fact. Clearly distinguish evidence, confirmed content, and inference.";

  const userPrompt =
    prompt.trim() ||
    (
      locale === "zh-CN"
        ? "请分析我上传的输入。"
        : locale === "ja"
          ? "アップロードした入力を分析してください。"
          : "Please analyze the uploaded input."
    );

  return [
    userPrompt,
    "",
    "=== AIOS CN INPUT EVIDENCE ===",
    evidenceLabel,
    "",
    ...evidence,
    "=== END AIOS CN INPUT EVIDENCE ===",
  ].join("\n");
}

function getUsableEvidence(
  inputs: AIOSInputItem[],
): AIOSInputItem[] {
  return inputs.filter(
    (input) =>
      input.processingStatus ===
        "ready" &&
      typeof input.extractedText ===
        "string" &&
      input.extractedText.trim()
          .length > 0,
  );
}

function buildFailureContent(
  locale: string,
  understoodCount: number,
  pendingCount: number,
  failedCount: number,
): string {
  if (locale === "zh-CN") {
    return [
      "AIOS CN 暂时无法继续处理这次输入。",
      "",
      `已理解：${understoodCount} 项`,
      `待处理：${pendingCount} 项`,
      `失败：${failedCount} 项`,
      "",
      "为避免在缺少输入证据的情况下猜测内容，本次 Runtime 已停止。",
    ].join("\n");
  }

  if (locale === "ja") {
    return [
      "AIOS CN は今回の入力を続行できませんでした。",
      "",
      `理解済み：${understoodCount} 件`,
      `保留：${pendingCount} 件`,
      `失敗：${failedCount} 件`,
      "",
      "入力証拠が不足しているため、推測による Runtime 実行を停止しました。",
    ].join("\n");
  }

  return [
    "AIOS CN could not continue processing this input.",
    "",
    `Understood: ${understoodCount}`,
    `Pending: ${pendingCount}`,
    `Failed: ${failedCount}`,
    "",
    "Runtime execution stopped because usable input evidence was unavailable.",
  ].join("\n");
}

export async function executeAIOSCNChat(
  prompt: string,
  locale: string,
  provider?: AIOSCNProvider,
  systemPrompt?: string,
  inputs: AIOSInputItem[] = [],
): Promise<AIOSCNChatResponse> {
  const startedAt =
    Date.now();

  const usableEvidence =
    getUsableEvidence(
      inputs,
    );

  if (
    inputs.length > 0 &&
    usableEvidence.length ===
      0
  ) {
    return {
      success: false,
      code:
        "AIOS_CN_CHAT_INPUT_UNDERSTANDING_FAILED",
      content:
        buildFailureContent(
          locale,
          0,
          inputs.filter(
            (input) =>
              input.processingStatus ===
              "pending",
          ).length,
          inputs.filter(
            (input) =>
              input.processingStatus ===
              "failed",
          ).length,
        ),
      inputUnderstanding: {
        success: false,
        understoodCount: 0,
        pendingCount:
          inputs.filter(
            (input) =>
              input.processingStatus ===
              "pending",
          ).length,
        failedCount:
          inputs.filter(
            (input) =>
              input.processingStatus ===
              "failed",
          ).length,
        limitations: [
          "No usable input evidence was available.",
        ],
      },
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
        commercialActualWritten: false,
      },
      runtime:
        "aios-cn-chat",
      runtimeVersion:
        RUNTIME_VERSION,
      latencyMs:
        Date.now() -
        startedAt,
      generatedAt:
        new Date().toISOString(),
    };
  }

  const runtimePrompt =
    buildEvidencePrompt(
      prompt,
      inputs,
      locale,
    );

  if (!runtimePrompt.trim()) {
    return {
      success: false,
      code:
        "AIOS_CN_CHAT_INPUT_REQUIRED",
      content:
        locale === "zh-CN"
          ? "请输入内容。"
          : locale === "ja"
            ? "内容を入力してください。"
            : "Please enter a message.",
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
        commercialActualWritten: false,
      },
      runtime:
        "aios-cn-chat",
      runtimeVersion:
        RUNTIME_VERSION,
      latencyMs:
        Date.now() -
        startedAt,
      generatedAt:
        new Date().toISOString(),
    };
  }

  try {
    const result =
      await executeAIOSCNRuntime({
        prompt:
          runtimePrompt,
        provider,
        systemPrompt,
      });

    return {
      success:
        result.success,
      code:
        result.success
          ? "AIOS_CN_CHAT_COMPLETED"
          : "AIOS_CN_CHAT_RUNTIME_FAILED",
      content:
        result.content,
      provider:
        result.provider,
      requestedProvider:
        result.requestedProvider,
      fallbackUsed:
        result.fallbackUsed,
      model:
        result.model,
      inputUnderstanding:
        inputs.length > 0
          ? {
              success:
                usableEvidence.length >
                0,
              understoodCount:
                usableEvidence.length,
              pendingCount:
                inputs.filter(
                  (input) =>
                    input.processingStatus ===
                    "pending",
                ).length,
              failedCount:
                inputs.filter(
                  (input) =>
                    input.processingStatus ===
                    "failed",
                ).length,
              limitations: [],
            }
          : undefined,
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
        commercialActualWritten: false,
      },
      runtime:
        "aios-cn-chat",
      runtimeVersion:
        RUNTIME_VERSION,
      latencyMs:
        Date.now() -
        startedAt,
      generatedAt:
        new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      code:
        "AIOS_CN_CHAT_RUNTIME_FAILED",
      content:
        locale === "zh-CN"
          ? "AIOS CN Runtime 暂时不可用。"
          : locale === "ja"
            ? "AIOS CN Runtime は一時的に利用できません。"
            : "AIOS CN Runtime is temporarily unavailable.",
      inputUnderstanding:
        inputs.length > 0
          ? {
              success:
                usableEvidence.length >
                0,
              understoodCount:
                usableEvidence.length,
              pendingCount:
                inputs.filter(
                  (input) =>
                    input.processingStatus ===
                    "pending",
                ).length,
              failedCount:
                inputs.filter(
                  (input) =>
                    input.processingStatus ===
                    "failed",
                ).length,
              limitations: [
                error instanceof Error
                  ? error.message
                  : "CN Runtime execution failed.",
              ],
            }
          : undefined,
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
        commercialActualWritten: false,
      },
      runtime:
        "aios-cn-chat",
      runtimeVersion:
        RUNTIME_VERSION,
      latencyMs:
        Date.now() -
        startedAt,
      generatedAt:
        new Date().toISOString(),
    };
  }
}
