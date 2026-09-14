import "server-only";

import {
  executeLiveCommercialOpportunity,
  type LiveCommercialOpportunityResult,
} from "@/lib/runtime/live-commercial-opportunity";

import type { Locale } from "@/lib/i18n";

export type ChatCommercialBridgeStatus =
  | "not-requested"
  | "ready"
  | "blocked";

export interface ChatCommercialBridgeInput {
  prompt: string;
  objectiveId: string;
  locale: Locale;
}

export interface ChatCommercialBridgeResult {
  success: boolean;
  status: ChatCommercialBridgeStatus;
  detected: boolean;
  shouldRunLiveOpportunity: boolean;
  objectiveId: string;
  opportunity: LiveCommercialOpportunityResult | null;
  content: string;
  capabilityTrace: string[];
}

function normalizeText(
  value: unknown,
  maxLength = 4000,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function detectLiveCommercialRequest(
  prompt: string,
): boolean {
  const normalized = normalizeText(prompt).toLowerCase();

  if (!normalized) {
    return false;
  }

  const liveSignals = [
    "实时",
    "当前",
    "现在",
    "最新",
    "近期",
    "市场",
    "竞品",
    "竞争",
    "需求",
    "客户",
    "找客户",
    "获客",
    "销售",
    "卖",
    "赚钱",
    "变现",
    "订单",
    "价格",
    "行情",
    "趋势",
    "机会",
    "market",
    "competitor",
    "competition",
    "customer",
    "customers",
    "client",
    "clients",
    "sales",
    "sell",
    "selling",
    "revenue",
    "monetize",
    "monetization",
    "order",
    "orders",
    "price",
    "pricing",
    "trend",
    "opportunity",
    "current",
    "currently",
    "latest",
    "now",
    "real-time",
    "realtime",
    "mercado",
    "cliente",
    "ventas",
    "precio",
    "tendencia",
    "oportunidad",
    "市場",
    "競合",
    "顧客",
    "集客",
    "販売",
    "売る",
    "収益",
    "価格",
    "動向",
    "機会",
    "現在",
    "最新",
    "リアルタイム",
  ];

  return liveSignals.some(
    (signal) =>
      normalized.includes(signal.toLowerCase()),
  );
}

function buildOpportunityContent(
  result: LiveCommercialOpportunityResult,
  locale: Locale,
): string {
  const objective = result.objective;
  const web = result.web;
  const decision = result.decision;
  const runtime = result.runtime;

  if (locale === "ja") {
    return [
      "ライブ商業機会分析を実行しました。",
      "",
      objective
        ? `目標：${objective.title}`
        : `目標ID：${result.objectiveId}`,
      "",
      "ライブ情報：",
      `検証済み：${web?.verified ? "YES" : "NO"}`,
      `証拠数：${web?.evidence.length ?? 0}`,
      `独立ホスト数：${web?.sourceHosts.length ?? 0}`,
      "",
      "商業判断：",
      `結論：${decision?.conclusion ?? result.conclusion}`,
      `次のアクション：${decision?.nextStep ?? result.nextStep}`,
      `推奨アクション数：${decision?.recommendedActions.length ?? 0}`,
      "",
      "Runtime：",
      `状態：${runtime?.status ?? "NOT_READY"}`,
      `Task：${runtime?.taskId ?? "NOT_LINKED"}`,
      "",
      "実際の収益・顧客・コストは、検証済み結果が確認されるまで Actual に記録しません。",
    ].join("\n");
  }

  if (locale === "zh-CN") {
    return [
      "已执行实时商业机会分析。",
      "",
      objective
        ? `目标：${objective.title}`
        : `目标 ID：${result.objectiveId}`,
      "",
      "实时外部信息：",
      `已验证：${web?.verified ? "YES" : "NO"}`,
      `证据数量：${web?.evidence.length ?? 0}`,
      `独立来源域名：${web?.sourceHosts.length ?? 0}`,
      "",
      "商业判断：",
      `结论：${decision?.conclusion ?? result.conclusion}`,
      `下一行动：${decision?.nextStep ?? result.nextStep}`,
      `推荐行动数：${decision?.recommendedActions.length ?? 0}`,
      "",
      "Runtime：",
      `状态：${runtime?.status ?? "NOT_READY"}`,
      `Task：${runtime?.taskId ?? "NOT_LINKED"}`,
      "",
      "在获得真实、经过验证的商业结果之前，AIOS 不会虚构或写入收入、客户、成本 Actual。",
    ].join("\n");
  }

  return [
    "Live commercial opportunity analysis completed.",
    "",
    objective
      ? `Objective: ${objective.title}`
      : `Objective ID: ${result.objectiveId}`,
    "",
    "Live external intelligence:",
    `Verified: ${web?.verified ? "YES" : "NO"}`,
    `Evidence count: ${web?.evidence.length ?? 0}`,
    `Independent hosts: ${web?.sourceHosts.length ?? 0}`,
    "",
    "Commercial decision:",
    `Conclusion: ${decision?.conclusion ?? result.conclusion}`,
    `Next action: ${decision?.nextStep ?? result.nextStep}`,
    `Recommended actions: ${decision?.recommendedActions.length ?? 0}`,
    "",
    "Runtime:",
    `Status: ${runtime?.status ?? "NOT_READY"}`,
    `Task: ${runtime?.taskId ?? "NOT_LINKED"}`,
    "",
    "AIOS does not fabricate or write revenue, customer, or cost Actuals until a real verified commercial result is available.",
  ].join("\n");
}

export async function executeChatCommercialBridge(
  input: ChatCommercialBridgeInput,
): Promise<ChatCommercialBridgeResult> {
  const prompt = normalizeText(input.prompt);

  const shouldRunLiveOpportunity =
    detectLiveCommercialRequest(prompt);

  if (!shouldRunLiveOpportunity) {
    return {
      success: true,
      status: "not-requested",
      detected: false,
      shouldRunLiveOpportunity: false,
      objectiveId: input.objectiveId,
      opportunity: null,
      content: "",
      capabilityTrace: [
        "chat",
        "commercial-intent",
        "commercial-objective",
        "live-commercial-opportunity-not-requested",
      ],
    };
  }

  const opportunity =
    await executeLiveCommercialOpportunity({
      objectiveId: input.objectiveId,
      prompt,
    });

  const ready =
    opportunity.success &&
    opportunity.status === "ready";

  return {
    success: ready,
    status: ready ? "ready" : "blocked",
    detected: true,
    shouldRunLiveOpportunity: true,
    objectiveId: input.objectiveId,
    opportunity,
    content: buildOpportunityContent(
      opportunity,
      input.locale,
    ),
    capabilityTrace: [
      "chat",
      "commercial-intent",
      "commercial-objective",
      "live-commercial-opportunity",
      "web-intelligence",
      "verified-evidence",
      "live-decision",
      "commercial-runtime",
    ],
  };
}

export function isChatCommercialBridgeReady(
  result: ChatCommercialBridgeResult,
): boolean {
  if (!result.detected) {
    return false;
  }

  if (result.status !== "ready") {
    return false;
  }

  if (!result.success) {
    return false;
  }

  if (!result.opportunity) {
    return false;
  }

  return (
    result.opportunity.success &&
    result.opportunity.status === "ready"
  );
}
