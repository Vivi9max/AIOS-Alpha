import "server-only";
import type { Locale } from "@/lib/i18n";
import type {
  LiveDecision,
} from "./live-decision";
export interface LiveDecisionAnswerResult {
  success: boolean;
  content: string;
  decisionReady: boolean;
  reason?: string;
}
function clean(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}
function buildChineseAnswer(
  decision: LiveDecision,
): string {
  return [
    "### 结论",
    "",
    `**${clean(decision.conclusion)}**`,
    "",
    "### 关键事实",
    "",
    ...decision.facts
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    "### AIOS 判断",
    "",
    ...decision.judgments
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    decision.risks.length > 0
      ? "### 风险"
      : "",
    decision.risks.length > 0
      ? ""
      : "",
    ...decision.risks
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    decision.opportunities.length > 0
      ? "### 机会"
      : "",
    decision.opportunities.length > 0
      ? ""
      : "",
    ...decision.opportunities
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    "### 推荐行动",
    "",
    ...decision.recommendedActions
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}. ${clean(item.action)}`,
      ),
    "",
    "### 下一步",
    "",
    `**${clean(decision.nextStep)}**`,
  ]
    .filter(
      (item) =>
        item !== "",
    )
    .join("\n");
}
function buildJapaneseAnswer(
  decision: LiveDecision,
): string {
  return [
    "### 結論",
    "",
    `**${clean(decision.conclusion)}**`,
    "",
    "### 主な事実",
    "",
    ...decision.facts
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    "### AIOSの判断",
    "",
    ...decision.judgments
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    decision.risks.length > 0
      ? "### リスク"
      : "",
    decision.risks.length > 0
      ? ""
      : "",
    ...decision.risks
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    decision.opportunities.length > 0
      ? "### 機会"
      : "",
    decision.opportunities.length > 0
      ? ""
      : "",
    ...decision.opportunities
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    "### 推奨アクション",
    "",
    ...decision.recommendedActions
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}. ${clean(item.action)}`,
      ),
    "",
    "### 次のステップ",
    "",
    `**${clean(decision.nextStep)}**`,
  ]
    .filter(
      (item) =>
        item !== "",
    )
    .join("\n");
}
function buildEnglishAnswer(
  decision: LiveDecision,
): string {
  return [
    "### Conclusion",
    "",
    `**${clean(decision.conclusion)}**`,
    "",
    "### Key facts",
    "",
    ...decision.facts
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    "### AIOS judgment",
    "",
    ...decision.judgments
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    decision.risks.length > 0
      ? "### Risks"
      : "",
    decision.risks.length > 0
      ? ""
      : "",
    ...decision.risks
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    decision.opportunities.length > 0
      ? "### Opportunities"
      : "",
    decision.opportunities.length > 0
      ? ""
      : "",
    ...decision.opportunities
      .slice(0, 3)
      .map(
        (item) =>
          `- ${clean(item.statement)}`,
      ),
    "",
    "### Recommended action",
    "",
    ...decision.recommendedActions
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}. ${clean(item.action)}`,
      ),
    "",
    "### Next step",
    "",
    `**${clean(decision.nextStep)}**`,
  ]
    .filter(
      (item) =>
        item !== "",
    )
    .join("\n");
}
function isDecisionUsable(
  decision: LiveDecision,
): boolean {
  return (
    decision.success &&
    decision.conclusion.trim().length > 0 &&
    decision.nextStep.trim().length > 0 &&
    decision.facts.length > 0 &&
    decision.judgments.length > 0 &&
    decision.recommendedActions.length > 0
  );
}
export function buildLiveDecisionAnswer(
  decision: LiveDecision,
  locale: Locale = "en",
): LiveDecisionAnswerResult {
  if (!isDecisionUsable(decision)) {
    return {
      success: false,
      content: "",
      decisionReady: false,
      reason:
        "LIVE_DECISION_ANSWER_REQUIRES_USABLE_DECISION",
    };
  }
  const content =
    locale === "zh-CN"
      ? buildChineseAnswer(decision)
      : locale === "ja"
        ? buildJapaneseAnswer(decision)
        : buildEnglishAnswer(decision);
  return {
    success: true,
    content,
    decisionReady: true,
  };
}
export function buildLiveDecisionAnswerContext(
  decision: LiveDecision,
): string {
  if (!isDecisionUsable(decision)) {
    return [
      "AIOS LIVE DECISION ANSWER CONTEXT",
      "status=blocked",
      "reason=decision_not_usable",
      "Do not present an incomplete decision as a final answer.",
    ].join("\n");
  }
  return [
    "AIOS LIVE DECISION ANSWER CONTEXT",
    "status=ready",
    `priority=${decision.priority}`,
    "",
    "CONCLUSION",
    decision.conclusion,
    "",
    "FACTS",
    ...decision.facts
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}. ${item.statement}`,
      ),
    "",
    "JUDGMENTS",
    ...decision.judgments
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}. ${item.statement}`,
      ),
    "",
    "RISKS",
    ...decision.risks
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}. ${item.statement}`,
      ),
    "",
    "OPPORTUNITIES",
    ...decision.opportunities
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}. ${item.statement}`,
      ),
    "",
    "RECOMMENDED ACTIONS",
    ...decision.recommendedActions
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}. ${item.action}`,
      ),
    "",
    "NEXT STEP",
    decision.nextStep,
    "",
    "BOUNDARIES",
    "Facts are evidence-supported statements.",
    "Judgments are Runtime interpretations.",
    "Recommendations are proposed actions.",
    "Opportunities are not guaranteed outcomes.",
    "Proposed actions must not be described as executed actions.",
  ].join("\n");
}
