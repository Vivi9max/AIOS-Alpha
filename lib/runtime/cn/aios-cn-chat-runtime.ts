import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

import {
  retrieveWebEvidence,
  routeLiveIntelligence,
} from "@/lib/web-intelligence";

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
  "C165.4";

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

function buildInputEvidencePrompt(
  prompt: string,
  inputs: AIOSInputItem[],
  locale: string,
): string {
  const usableInputs =
    getUsableEvidence(inputs);

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

function buildWebEvidencePrompt(
  prompt: string,
  locale: string,
  webEvidence: Awaited<
    ReturnType<
      typeof retrieveWebEvidence
    >
  >,
): string {
  const route =
    webEvidence.route;

  const evidence =
    webEvidence.evidence
      .slice(0, 10)
      .map(
        (item, index) => {
          const snippets =
            item.snippets
              .slice(0, 3)
              .join(" ");

          return [
            `Source ${index + 1}: ${item.title}`,
            `URL: ${item.url}`,
            `Host: ${item.hostname}`,
            `Freshness: ${item.freshness}`,
            `RetrievedAt: ${new Date(
              item.retrievedAt,
            ).toISOString()}`,
            `Evidence: ${snippets}`,
          ].join("\n");
        },
      );

  const verification =
    webEvidence.verification;

  const verificationText =
    verification
      ? [
          `Verification: ${verification.verified ? "verified" : "limited"}`,
          `Verification score: ${verification.score}`,
          `Independent sources: ${verification.independentSourceCount}`,
          `Primary source found: ${verification.primarySourceFound ? "yes" : "no"}`,
          `Corroborated: ${verification.corroborated ? "yes" : "no"}`,
        ].join("\n")
      : "Verification: unavailable";

  const evidenceLabel =
    locale === "zh-CN"
      ? "以下内容来自 AIOS Web Intelligence 实际联网检索结果。请把它作为外部证据，而不是无条件确认的事实。回答实时、今日、最新等问题时必须优先依据这些检索结果，并明确说明来源和时间范围。"
      : locale === "ja"
        ? "以下は AIOS Web Intelligence が実際に取得した外部ウェブ証拠です。無条件に確定した事実として扱わず、情報源と時間範囲を明確にしてください。"
        : "The following is external evidence actually retrieved by AIOS Web Intelligence. Do not treat it as automatically verified fact. For current or recent questions, prioritize this evidence and identify sources and time scope.";

  const userPrompt =
    prompt.trim() ||
    (
      locale === "zh-CN"
        ? "请根据最新可用信息回答。"
        : locale === "ja"
          ? "最新の利用可能な情報に基づいて回答してください。"
          : "Please answer using the latest available information."
    );

  return [
    userPrompt,
    "",
    "=== AIOS CN WEB INTELLIGENCE EVIDENCE ===",
    evidenceLabel,
    "",
    `Search query: ${webEvidence.query}`,
    `Category: ${route?.category ?? "general"}`,
    `Freshness: ${route?.freshness ?? "general"}`,
    `Retrieval mode: ${webEvidence.retrievalMode ?? "unknown"}`,
    verificationText,
    "",
    ...evidence,
    "",
    "=== END AIOS CN WEB INTELLIGENCE EVIDENCE ===",
    "",
    locale === "zh-CN"
      ? "回答实时新闻时，不得声称自己没有联网。如果检索结果不足，应明确说明证据不足，而不是使用模型记忆冒充今天的事实。"
      : locale === "ja"
        ? "最新ニュースについて回答する場合、ウェブ接続がないと主張してはいけません。検索結果が不足している場合は、証拠不足を明示し、モデルの記憶を今日の事実として扱わないでください。"
        : "For current news, do not claim that web access is unavailable. If the retrieved evidence is insufficient, state that clearly instead of presenting model memory as today's facts.",
  ].join("\n");
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

  if (
    !prompt.trim() &&
    inputs.length === 0
  ) {
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
    let runtimePrompt =
      buildInputEvidencePrompt(
        prompt,
        inputs,
        locale,
      );

    const intelligenceRoute =
      routeLiveIntelligence(
        prompt,
      );

    let webIntelligence:
      Awaited<
        ReturnType<
          typeof retrieveWebEvidence
        >
      > | null = null;

    if (
      intelligenceRoute.required
    ) {
      webIntelligence =
        await retrieveWebEvidence(
          prompt,
        );

      if (
        webIntelligence.success &&
        webIntelligence.evidence.length >
          0
      ) {
        runtimePrompt =
          buildWebEvidencePrompt(
            runtimePrompt,
            locale,
            webIntelligence,
          );
      } else {
        return {
          success: false,
          code:
            "AIOS_CN_CHAT_RUNTIME_FAILED",
          content:
            locale === "zh-CN"
              ? "AIOS CN 检测到该请求需要实时联网信息，但当前没有获得足够的 Web Intelligence 证据，因此没有使用模型记忆冒充实时事实。"
              : locale === "ja"
                ? "AIOS CN はこのリクエストに最新のウェブ情報が必要だと判断しましたが、十分な Web Intelligence 証拠を取得できなかったため、モデルの記憶を最新情報として扱いませんでした。"
                : "AIOS CN detected that this request requires current web information, but sufficient Web Intelligence evidence was not retrieved, so model memory was not presented as current fact.",
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
      }
    }

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
