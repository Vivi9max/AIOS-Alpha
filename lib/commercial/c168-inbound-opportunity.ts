import type {
  InboundDemandCampaign,
  InboundMarketContext,
} from "@/lib/commercial/c144-inbound-demand-engine";
export const C168_INBOUND_OPPORTUNITY_VERSION =
  "C168.7.1";
export type C168InboundOpportunityPriority =
  | "primary"
  | "backup"
  | "defer";
export interface C168InboundContentOpportunity {
  id: string;
  priority: C168InboundOpportunityPriority;
  score: number;
  topic: string;
  rationale: string;
  evidenceBasis: string[];
  recommendedChannel:
    | "xiaohongshu"
    | "xianyu";
  publishNow: boolean;
}
type InboundChannel =
  | "xiaohongshu"
  | "xianyu";
type OpportunitySource =
  | "verified-problem"
  | "diagnostic-hypothesis"
  | "acquisition-signal"
  | "buying-signal";
interface RankedTopic {
  topic: string;
  source: OpportunitySource;
  score: number;
}
function cleanText(
  value: unknown,
  maxLength = 300,
): string {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
function uniqueStrings(
  values: unknown,
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = cleanText(value);
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(text);
  }
  return result;
}
function normalizeTopicKey(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(
      /[\s，。、“”‘’：:；;、/\\|()[\]{}<>《》]/g,
      "",
    );
}
function scoreTopic(
  topic: string,
  source: OpportunitySource,
): number {
  const normalized =
    topic.toLowerCase();
  let score =
    source === "verified-problem"
      ? 0.7
      : source ===
          "diagnostic-hypothesis"
        ? 0.62
        : source ===
            "acquisition-signal"
          ? 0.52
          : 0.45;
  const highValueTerms = [
    "获客",
    "咨询",
    "线索",
    "报价",
    "预约",
    "客户",
    "广告",
    "推广",
    "转化",
    "lead",
    "inquiry",
    "quote",
    "conversion",
  ];
  const matched =
    highValueTerms.filter(
      (term) =>
        normalized.includes(
          term.toLowerCase(),
        ),
    ).length;
  score += Math.min(
    matched * 0.06,
    0.18,
  );
  return Math.min(
    Number(score.toFixed(3)),
    0.99,
  );
}
function buildRankedTopics(
  context:
    | InboundMarketContext
    | undefined,
): RankedTopic[] {
  if (!context) {
    return [];
  }
  const candidates: Array<{
    topic: string;
    source: OpportunitySource;
  }> = [];
  for (const topic of uniqueStrings(
    context.verifiedProblems,
  )) {
    candidates.push({
      topic,
      source: "verified-problem",
    });
  }
  for (const topic of uniqueStrings(
    context.diagnosticHypotheses,
  )) {
    candidates.push({
      topic,
      source:
        "diagnostic-hypothesis",
    });
  }
  for (const topic of uniqueStrings(
    context.acquisitionSignals,
  )) {
    candidates.push({
      topic,
      source:
        "acquisition-signal",
    });
  }
  for (const topic of uniqueStrings(
    context.buyingSignals,
  )) {
    candidates.push({
      topic,
      source: "buying-signal",
    });
  }
  return candidates
    .map(
      (candidate) => ({
        ...candidate,
        score: scoreTopic(
          candidate.topic,
          candidate.source,
        ),
      }),
    )
    .sort(
      (a, b) =>
        b.score - a.score,
    );
}
function selectRecommendedChannel(
  campaign: InboundDemandCampaign,
  priority: C168InboundOpportunityPriority,
): InboundChannel {
  const availableChannels =
    uniqueStrings(
      campaign.contentAssets.map(
        (asset) =>
          asset.channel,
      ),
    ).filter(
      (
        channel,
      ): channel is InboundChannel =>
        channel ===
          "xiaohongshu" ||
        channel === "xianyu",
    );
  if (
    availableChannels.includes(
      "xiaohongshu",
    )
  ) {
    return "xiaohongshu";
  }
  if (
    availableChannels.includes(
      "xianyu",
    )
  ) {
    return "xianyu";
  }
  if (
    priority === "primary"
  ) {
    return "xiaohongshu";
  }
  return "xianyu";
}
function buildRationale(
  priority: C168InboundOpportunityPriority,
  source: OpportunitySource,
): string {
  if (
    priority === "primary"
  ) {
    return (
      "Highest-value market theme available from the current verified context. " +
      "Use one primary content angle before expanding the publishing queue. " +
      `Evidence source: ${source}.`
    );
  }
  if (
    priority === "backup"
  ) {
    return (
      "Second-best verified market theme. Keep it as the backup asset and " +
      "publish only if the primary angle does not produce useful real inbound signal. " +
      `Evidence source: ${source}.`
    );
  }
  return (
    "Lower-priority market theme retained for later testing instead of " +
    "creating additional daily posts. " +
    `Evidence source: ${source}.`
  );
}
export function selectC168InboundContentOpportunities(
  context:
    | InboundMarketContext
    | undefined,
  recommendedChannel:
    InboundChannel = "xiaohongshu",
): C168InboundContentOpportunity[] {
  const ranked =
    buildRankedTopics(
      context,
    );
  if (
    ranked.length === 0
  ) {
    return [];
  }
  const selected: C168InboundContentOpportunity[] =
    [];
  const selectedKeys =
    new Set<string>();
  for (const candidate of ranked) {
    const topicKey =
      normalizeTopicKey(
        candidate.topic,
      );
    if (
      !topicKey ||
      selectedKeys.has(
        topicKey,
      )
    ) {
      continue;
    }
    selectedKeys.add(
      topicKey,
    );
    const priority: C168InboundOpportunityPriority =
      selected.length ===
      0
        ? "primary"
        : selected.length ===
            1
          ? "backup"
          : "defer";
    selected.push({
      id:
        `C168.7-${priority}-${selected.length + 1}`,
      priority,
      score:
        candidate.score,
      topic:
        candidate.topic,
      rationale:
        buildRationale(
          priority,
          candidate.source,
        ),
      evidenceBasis: [
        candidate.source,
        context
          ?.evidenceBoundary ??
          "Public evidence only.",
      ],
      recommendedChannel,
      publishNow:
        priority ===
        "primary",
    });
    if (
      selected.length >=
      3
    ) {
      break;
    }
  }
  return selected;
}
function selectContentAssets(
  campaign: InboundDemandCampaign,
): InboundDemandCampaign["contentAssets"] {
  const xiaohongshuAssets =
    campaign.contentAssets.filter(
      (asset) =>
        asset.channel ===
        "xiaohongshu",
    );
  const xianyuAssets =
    campaign.contentAssets.filter(
      (asset) =>
        asset.channel ===
        "xianyu",
    );
  const selectedXiaohongshu =
    xiaohongshuAssets.slice(
      0,
      2,
    );
  const selectedFormats =
    new Set(
      selectedXiaohongshu.map(
        (asset) =>
          asset.format,
      ),
    );
  if (
    selectedXiaohongshu.length >
      0
  ) {
    return campaign.contentAssets.filter(
      (asset) =>
        asset.channel ===
          "xianyu" ||
        selectedFormats.has(
          asset.format,
        ),
    );
  }
  if (
    xianyuAssets.length >
    0
  ) {
    return xianyuAssets.slice(
      0,
      2,
    );
  }
  return campaign.contentAssets.slice(
    0,
    2,
  );
}
function selectTopicsForPlan(
  opportunities:
    C168InboundContentOpportunity[],
): string[] {
  return opportunities
    .filter(
      (item) =>
        item.priority !==
        "defer",
    )
    .map(
      (item) =>
        item.topic,
    );
}
export function optimizeC168InboundCampaign(
  campaign: InboundDemandCampaign,
): {
  campaign: InboundDemandCampaign;
  contentOpportunities:
    C168InboundContentOpportunity[];
} {
  const availableChannels =
    uniqueStrings(
      campaign.contentAssets.map(
        (asset) =>
          asset.channel,
      ),
    ).filter(
      (
        channel,
      ): channel is InboundChannel =>
        channel ===
          "xiaohongshu" ||
        channel === "xianyu",
    );
  const recommendedChannel =
    availableChannels.includes(
      "xiaohongshu",
    )
      ? "xiaohongshu"
      : availableChannels.includes(
          "xianyu",
        )
        ? "xianyu"
        : "xiaohongshu";
  const opportunities =
    selectC168InboundContentOpportunities(
      campaign.marketContext,
      recommendedChannel,
    );
  if (
    opportunities.length ===
    0
  ) {
    return {
      campaign,
      contentOpportunities:
        [],
    };
  }
  const contentAssets =
    selectContentAssets(
      campaign,
    );
  const selectedTopics =
    selectTopicsForPlan(
      opportunities,
    );
  const sevenDayPlan =
    campaign.sevenDayPlan.map(
      (item, index) => ({
        ...item,
        topic:
          selectedTopics[
            index %
              Math.max(
                selectedTopics.length,
                1,
              )
          ] ??
          item.topic,
      }),
    );
  return {
    campaign: {
      ...campaign,
      contentAssets,
      sevenDayPlan,
      contentStrategy: {
        ...campaign.contentStrategy,
        mode:
          campaign.contentStrategy
            ?.mode ??
          "evidence-driven",
        primaryObjective:
          "Select one primary and one backup market content opportunity from verified evidence, then learn from real inbound inquiries before expanding the publishing queue.",
        learningObjective:
          "Measure real inquiries generated by the primary angle before increasing content volume, changing the offer, or adding more channels.",
        evidenceBoundary:
          campaign.contentStrategy
            ?.evidenceBoundary ??
          "Public evidence supports market-level content hypotheses only; it does not prove any specific business performance or purchase intent.",
      },
    },
    contentOpportunities:
      opportunities,
  };
}
