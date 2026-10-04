import type { Locale } from "@/lib/i18n";
import type {
  RealtimeChatBridgeResult,
} from "@/lib/runtime/realtime-chat-bridge";

export type RealtimeResponseStatus =
  | "completed"
  | "evidence-verified"
  | "evidence-unverified"
  | "failed"
  | "not-detected";

export interface RealtimeResponseMetadata {
  status: RealtimeResponseStatus;
  capability:
    RealtimeChatBridgeResult["capability"];
  execution:
    RealtimeChatBridgeResult["execution"];
  requiresExternalEvidence: boolean;
  evidenceVerified: boolean;
  evidenceAvailable: boolean;
  sourceCount: number;
  sourceHosts: string[];
}

export interface RealtimeResponse {
  content: string;
  metadata: RealtimeResponseMetadata;
}

function getSourceCount(
  result: RealtimeChatBridgeResult,
): number {
  return (
    result.evidence?.sourceCount ??
    result.evidence?.evidence.length ??
    0
  );
}

function getSourceHosts(
  result: RealtimeChatBridgeResult,
): string[] {
  return (
    result.evidence?.sourceHosts ??
    []
  );
}

function resolveStatus(
  result: RealtimeChatBridgeResult,
): RealtimeResponseStatus {
  if (!result.detected) {
    return "not-detected";
  }

  if (
    result.evidenceVerified
  ) {
    return "evidence-verified";
  }

  if (
    result.requiresExternalEvidence &&
    result.evidenceAvailable &&
    !result.evidenceVerified
  ) {
    return "evidence-unverified";
  }

  if (result.success) {
    return "completed";
  }

  return "failed";
}

function buildMetadata(
  result: RealtimeChatBridgeResult,
): RealtimeResponseMetadata {
  return {
    status:
      resolveStatus(result),
    capability:
      result.capability,
    execution:
      result.execution,
    requiresExternalEvidence:
      result.requiresExternalEvidence,
    evidenceVerified:
      result.evidenceVerified,
    evidenceAvailable:
      result.evidenceAvailable,
    sourceCount:
      getSourceCount(result),
    sourceHosts:
      getSourceHosts(result),
  };
}

function normalizeContent(
  content: string,
): string {
  return content.trim();
}

function buildEvidenceFooter(
  locale: Locale,
  result: RealtimeChatBridgeResult,
): string {
  const sourceCount =
    getSourceCount(result);

  const sourceHosts =
    getSourceHosts(result);

  if (
    sourceCount <= 0 &&
    sourceHosts.length === 0
  ) {
    return "";
  }

  const hosts =
    sourceHosts.length > 0
      ? sourceHosts.join(", ")
      : "";

  if (locale === "zh-CN") {
    if (hosts) {
      return [
        "",
        `实时证据来源：${hosts}`,
        `已验证来源数：${sourceCount}`,
      ].join("\n");
    }

    return [
      "",
      `已验证实时来源数：${sourceCount}`,
    ].join("\n");
  }

  if (locale === "ja") {
    if (hosts) {
      return [
        "",
        `リアルタイム証拠ソース：${hosts}`,
        `検証済みソース数：${sourceCount}`,
      ].join("\n");
    }

    return [
      "",
      `検証済みリアルタイムソース数：${sourceCount}`,
    ].join("\n");
  }

  if (hosts) {
    return [
      "",
      `Realtime evidence sources: ${hosts}`,
      `Verified source count: ${sourceCount}`,
    ].join("\n");
  }

  return [
    "",
    `Verified realtime source count: ${sourceCount}`,
  ].join("\n");
}

function buildVerifiedPrefix(
  locale: Locale,
): string {
  if (locale === "zh-CN") {
    return "实时信息已通过外部证据验证。";
  }

  if (locale === "ja") {
    return "リアルタイム情報は外部証拠によって検証されています。";
  }

  return "Realtime information has been verified against external evidence.";
}

function buildUnverifiedContent(
  locale: Locale,
): string {
  if (locale === "zh-CN") {
    return [
      "当前请求需要实时外部证据，但现有证据无法完成验证。",
      "AIOS 不会把未经验证的信息标记为实时结果。",
    ].join("\n");
  }

  if (locale === "ja") {
    return [
      "このリクエストにはリアルタイムの外部証拠が必要ですが、現在の証拠を検証できませんでした。",
      "AIOS は未検証の情報をリアルタイム結果として扱いません。",
    ].join("\n");
  }

  return [
    "This request requires realtime external evidence, but the available evidence could not be verified.",
    "AIOS does not present unverified information as a realtime result.",
  ].join("\n");
}

function buildFailedContent(
  locale: Locale,
): string {
  if (locale === "zh-CN") {
    return [
      "实时能力执行失败。",
      "AIOS 未将未经验证的信息作为实时结果返回。",
    ].join("\n");
  }

  if (locale === "ja") {
    return [
      "リアルタイム機能の実行に失敗しました。",
      "AIOS は未検証の情報をリアルタイム結果として返していません。",
    ].join("\n");
  }

  return [
    "The realtime capability could not be completed.",
    "AIOS did not return unverified information as a realtime result.",
  ].join("\n");
}

function buildVerifiedContent(
  locale: Locale,
  result: RealtimeChatBridgeResult,
): string {
  const content =
    normalizeContent(
      result.content,
    );

  if (!content) {
    return buildVerifiedPrefix(
      locale,
    );
  }

  return [
    buildVerifiedPrefix(
      locale,
    ),
    "",
    content,
    buildEvidenceFooter(
      locale,
      result,
    ),
  ].join("\n");
}

function buildCompletedContent(
  locale: Locale,
  result: RealtimeChatBridgeResult,
): string {
  const content =
    normalizeContent(
      result.content,
    );

  if (!content) {
    return "";
  }

  if (
    result.capability ===
    "time"
  ) {
    return content;
  }

  return content;
}

export function formatRealtimeResponse(
  result: RealtimeChatBridgeResult,
  locale: Locale = "en",
): RealtimeResponse {
  const metadata =
    buildMetadata(result);

  if (
    metadata.status ===
    "not-detected"
  ) {
    return {
      content:
        normalizeContent(
          result.content,
        ),
      metadata,
    };
  }

  if (
    metadata.status ===
    "evidence-verified"
  ) {
    return {
      content:
        buildVerifiedContent(
          locale,
          result,
        ),
      metadata,
    };
  }

  if (
    metadata.status ===
    "evidence-unverified"
  ) {
    return {
      content:
        buildUnverifiedContent(
          locale,
        ),
      metadata,
    };
  }

  if (
    metadata.status ===
    "failed"
  ) {
    const original =
      normalizeContent(
        result.content,
      );

    return {
      content:
        original.length > 0
          ? original
          : buildFailedContent(
              locale,
            ),
      metadata,
    };
  }

  return {
    content:
      buildCompletedContent(
        locale,
        result,
      ),
    metadata,
  };
}

export function isRealtimeResponseVerified(
  response: RealtimeResponse,
): boolean {
  return (
    response.metadata.status ===
      "evidence-verified" ||
    response.metadata.evidenceVerified
  );
}

export function requiresRealtimeEvidenceDisclosure(
  response: RealtimeResponse,
): boolean {
  return (
    response.metadata
      .requiresExternalEvidence
  );
}

export function getRealtimeResponseStatusLabel(
  status: RealtimeResponseStatus,
  locale: Locale = "en",
): string {
  if (locale === "zh-CN") {
    switch (status) {
      case "completed":
        return "已完成";
      case "evidence-verified":
        return "实时证据已验证";
      case "evidence-unverified":
        return "实时证据未验证";
      case "failed":
        return "执行失败";
      case "not-detected":
        return "非实时请求";
    }
  }

  if (locale === "ja") {
    switch (status) {
      case "completed":
        return "完了";
      case "evidence-verified":
        return "リアルタイム証拠を検証済み";
      case "evidence-unverified":
        return "リアルタイム証拠を未検証";
      case "failed":
        return "実行失敗";
      case "not-detected":
        return "非リアルタイムリクエスト";
    }
  }

  switch (status) {
    case "completed":
      return "Completed";
    case "evidence-verified":
      return "Realtime evidence verified";
    case "evidence-unverified":
      return "Realtime evidence unverified";
    case "failed":
      return "Execution failed";
    case "not-detected":
      return "Non-realtime request";
  }
}

export function getRealtimeResponseDisclosure(
  response: RealtimeResponse,
  locale: Locale = "en",
): string {
  if (
    response.metadata.status ===
    "evidence-verified"
  ) {
    return getRealtimeResponseStatusLabel(
      "evidence-verified",
      locale,
    );
  }

  if (
    response.metadata.status ===
    "evidence-unverified"
  ) {
    return getRealtimeResponseStatusLabel(
      "evidence-unverified",
      locale,
    );
  }

  if (
    response.metadata.status ===
    "failed"
  ) {
    return getRealtimeResponseStatusLabel(
      "failed",
      locale,
    );
  }

  return getRealtimeResponseStatusLabel(
    response.metadata.status,
    locale,
  );
}
