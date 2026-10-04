import {
  retrieveWebEvidence,
  type WebIntelligenceResult,
} from "@/lib/web-intelligence";
import {
  routeRealtimeCapability,
  type RealtimeCapabilityRoute,
  type RealtimeCapabilityType,
} from "@/lib/runtime/realtime-capability-router";
import type { Locale } from "@/lib/i18n";

export type RealtimeEvidenceAdapterCode =
  | "REALTIME_EVIDENCE_NOT_REQUIRED"
  | "REALTIME_EVIDENCE_RETRIEVED"
  | "REALTIME_EVIDENCE_VERIFIED"
  | "REALTIME_EVIDENCE_UNVERIFIED"
  | "REALTIME_EVIDENCE_FAILED";

export interface RealtimeEvidenceAdapterResult {
  detected: boolean;
  capability: RealtimeCapabilityType;
  required: boolean;
  success: boolean;
  verified: boolean;
  code: RealtimeEvidenceAdapterCode;
  content: string;
  query: string;
  sourceCount: number;
  sourceHosts: string[];
  retrievalMode:
    | "llm-context"
    | "web-search"
    | undefined;
  verification:
    | WebIntelligenceResult["verification"]
    | undefined;
  route: RealtimeCapabilityRoute;
  evidence: WebIntelligenceResult["evidence"];
  web: WebIntelligenceResult;
}

function resolveLocale(
  locale: Locale,
): "en" | "zh-CN" | "ja" {
  if (locale === "zh-CN") {
    return "zh-CN";
  }

  if (locale === "ja") {
    return "ja";
  }

  return "en";
}

function buildNotRequiredContent(
  locale: "en" | "zh-CN" | "ja",
): string {
  if (locale === "zh-CN") {
    return "当前请求不需要实时外部证据。";
  }

  if (locale === "ja") {
    return "このリクエストにはリアルタイムの外部証拠は必要ありません。";
  }

  return "Realtime external evidence is not required for this request.";
}

function buildFailedContent(
  locale: "en" | "zh-CN" | "ja",
  error?: string,
): string {
  if (locale === "zh-CN") {
    return [
      "无法获取当前实时外部证据。",
      error
        ? `原因：${error}`
        : "",
      "AIOS 不会使用模型记忆伪造实时数据。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (locale === "ja") {
    return [
      "現在のリアルタイム外部証拠を取得できませんでした。",
      error
        ? `理由：${error}`
        : "",
      "AIOS はモデルの記憶をリアルタイムデータとして扱いません。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Current realtime external evidence could not be retrieved.",
    error
      ? `Reason: ${error}`
      : "",
    "AIOS does not present model memory as realtime data.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUnverifiedContent(
  locale: "en" | "zh-CN" | "ja",
  result: WebIntelligenceResult,
): string {
  const sourceCount =
    result.sourceCount;

  if (locale === "zh-CN") {
    return [
      "已获取实时外部信息，但证据验证未达到可靠阈值。",
      `已获取来源：${sourceCount}`,
      "AIOS 不会将未充分验证的数据标记为已确认实时数据。",
    ].join("\n");
  }

  if (locale === "ja") {
    return [
      "リアルタイムの外部情報を取得しましたが、証拠検証が十分な信頼水準に達していません。",
      `取得ソース数：${sourceCount}`,
      "AIOS は十分に検証されていない情報を確認済みのリアルタイムデータとして扱いません。",
    ].join("\n");
  }

  return [
    "Realtime external information was retrieved, but evidence verification did not reach the required confidence threshold.",
    `Sources retrieved: ${sourceCount}`,
    "AIOS does not label insufficiently verified information as confirmed realtime data.",
  ].join("\n");
}

function buildVerifiedContent(
  locale: "en" | "zh-CN" | "ja",
  result: WebIntelligenceResult,
): string {
  const sourceCount =
    result.sourceCount;

  const hosts =
    result.sourceHosts
      .slice(0, 5)
      .join(", ");

  if (locale === "zh-CN") {
    return [
      "已获取并验证实时外部证据。",
      `来源数量：${sourceCount}`,
      hosts
        ? `主要来源：${hosts}`
        : "",
      "AIOS 可以将该证据交给后续 Runtime 进行基于来源的回答。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (locale === "ja") {
    return [
      "リアルタイムの外部証拠を取得し、検証しました。",
      `ソース数：${sourceCount}`,
      hosts
        ? `主なソース：${hosts}`
        : "",
      "AIOS はこの証拠を Runtime に渡し、ソースに基づいた回答を生成できます。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Realtime external evidence was retrieved and verified.",
    `Sources: ${sourceCount}`,
    hosts
      ? `Primary source hosts: ${hosts}`
      : "",
    "AIOS can pass this evidence to the Runtime for a source-grounded response.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildRetrievedContent(
  locale: "en" | "zh-CN" | "ja",
  result: WebIntelligenceResult,
): string {
  const sourceCount =
    result.sourceCount;

  if (locale === "zh-CN") {
    return [
      "已获取实时外部信息。",
      `来源数量：${sourceCount}`,
      "但当前证据尚未完成充分验证，因此不会标记为已确认实时数据。",
    ].join("\n");
  }

  if (locale === "ja") {
    return [
      "リアルタイムの外部情報を取得しました。",
      `ソース数：${sourceCount}`,
      "ただし、十分な検証が完了していないため、確認済みリアルタイムデータとは扱いません。",
    ].join("\n");
  }

  return [
    "Realtime external information was retrieved.",
    `Sources: ${sourceCount}`,
    "However, the evidence has not completed sufficient verification and is not labeled as confirmed realtime data.",
  ].join("\n");
}

function buildResult(
  route: RealtimeCapabilityRoute,
  locale: "en" | "zh-CN" | "ja",
  web: WebIntelligenceResult,
): RealtimeEvidenceAdapterResult {
  if (!route.detected) {
    return {
      detected: false,
      capability:
        route.capability,
      required: false,
      success: false,
      verified: false,
      code:
        "REALTIME_EVIDENCE_NOT_REQUIRED",
      content:
        buildNotRequiredContent(
          locale,
        ),
      query:
        web.query,
      sourceCount: 0,
      sourceHosts: [],
      retrievalMode:
        undefined,
      verification:
        undefined,
      route,
      evidence: [],
      web,
    };
  }

  if (
    !route.requiresExternalEvidence
  ) {
    return {
      detected: true,
      capability:
        route.capability,
      required: false,
      success: true,
      verified: true,
      code:
        "REALTIME_EVIDENCE_NOT_REQUIRED",
      content:
        buildNotRequiredContent(
          locale,
        ),
      query:
        web.query,
      sourceCount: 0,
      sourceHosts: [],
      retrievalMode:
        undefined,
      verification:
        undefined,
      route,
      evidence: [],
      web,
    };
  }

  if (!web.success) {
    return {
      detected: true,
      capability:
        route.capability,
      required: true,
      success: false,
      verified: false,
      code:
        "REALTIME_EVIDENCE_FAILED",
      content:
        buildFailedContent(
          locale,
          web.error,
        ),
      query:
        web.query,
      sourceCount:
        web.sourceCount,
      sourceHosts:
        web.sourceHosts,
      retrievalMode:
        web.retrievalMode,
      verification:
        web.verification,
      route,
      evidence:
        web.evidence,
      web,
    };
  }

  if (!web.verified) {
    return {
      detected: true,
      capability:
        route.capability,
      required: true,
      success: true,
      verified: false,
      code:
        "REALTIME_EVIDENCE_UNVERIFIED",
      content:
        buildUnverifiedContent(
          locale,
          web,
        ),
      query:
        web.query,
      sourceCount:
        web.sourceCount,
      sourceHosts:
        web.sourceHosts,
      retrievalMode:
        web.retrievalMode,
      verification:
        web.verification,
      route,
      evidence:
        web.evidence,
      web,
    };
  }

  return {
    detected: true,
    capability:
      route.capability,
    required: true,
    success: true,
    verified: true,
    code:
      "REALTIME_EVIDENCE_VERIFIED",
    content:
      buildVerifiedContent(
        locale,
        web,
      ),
    query:
      web.query,
    sourceCount:
      web.sourceCount,
    sourceHosts:
      web.sourceHosts,
    retrievalMode:
      web.retrievalMode,
    verification:
      web.verification,
    route,
    evidence:
      web.evidence,
    web,
  };
}

/**
 * C167.31.3
 *
 * Realtime Evidence Adapter Boundary.
 *
 * This adapter connects the realtime capability
 * router with the existing Web Intelligence
 * evidence and verification system.
 *
 * It does not create or claim a new realtime
 * provider.
 *
 * Existing provider:
 *   Brave Web Intelligence
 *
 * Existing verification:
 *   source-verifier
 *
 * Realtime execution policy:
 *
 *   Time
 *     -> handled directly by Runtime.
 *
 *   Weather / News / Exchange Rate / Market
 *     -> external evidence required.
 *
 *   Unknown realtime request
 *     -> external evidence required.
 *
 * The adapter never converts unverified evidence
 * into confirmed realtime data.
 */
export async function retrieveRealtimeEvidence(
  prompt: string,
  locale: Locale = "en",
): Promise<RealtimeEvidenceAdapterResult> {
  const route =
    routeRealtimeCapability(
      prompt,
    );

  const normalizedLocale =
    resolveLocale(
      locale,
    );

  if (!route.detected) {
    const web: WebIntelligenceResult = {
      success: false,
      query:
        prompt.trim(),
      verified: false,
      provider: "brave",
      evidence: [],
      sourceCount: 0,
      sourceHosts: [],
      error:
        "Realtime capability was not detected.",
      route: undefined,
    };

    return buildResult(
      route,
      normalizedLocale,
      web,
    );
  }

  if (
    !route.requiresExternalEvidence
  ) {
    const web: WebIntelligenceResult = {
      success: true,
      query:
        prompt.trim(),
      verified: true,
      provider: "brave",
      evidence: [],
      sourceCount: 0,
      sourceHosts: [],
      route: undefined,
      retrievalMode:
        undefined,
    };

    return buildResult(
      route,
      normalizedLocale,
      web,
    );
  }

  const web =
    await retrieveWebEvidence(
      prompt,
    );

  return buildResult(
    route,
    normalizedLocale,
    web,
  );
}

export function requiresRealtimeEvidence(
  prompt: string,
): boolean {
  const route =
    routeRealtimeCapability(
      prompt,
    );

  return (
    route.detected &&
    route.requiresExternalEvidence
  );
}

export function isRealtimeEvidenceVerified(
  result: RealtimeEvidenceAdapterResult,
): boolean {
  return (
    result.success &&
    result.verified &&
    result.code ===
      "REALTIME_EVIDENCE_VERIFIED"
  );
}

export function canUseRealtimeEvidence(
  result: RealtimeEvidenceAdapterResult,
): boolean {
  return (
    result.detected &&
    result.required &&
    result.success &&
    result.verified &&
    result.evidence.length > 0
  );
}
