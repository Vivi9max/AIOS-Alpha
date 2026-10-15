import type {
  InboundDemandCampaign,
  InboundMarketContext,
} from "@/lib/commercial/c144-inbound-demand-engine";

export const C168_INBOUND_OPPORTUNITY_VERSION =
  "C168.7.0";

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

function scoreTopic(
  topic: string,
  source: string,
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

export function selectC168InboundContentOpportunities(
  context:
    | InboundMarketContext
    | undefined,
): C168InboundContentOpportunity[] {
  if (!context) {
    return [];
  }

  const candidates: Array<{
    topic: string;
    source: string;
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

  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreTopic(
        candidate.topic,
        candidate.source,
      ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score,
    );

  const selected: C168InboundContentOpportunity[] =
    [];

  for (const candidate of ranked) {
    if (
      selected.some(
        (item) =>
          item.topic.toLowerCase() ===
          candidate.topic.toLowerCase(),
      )
    ) {
      continue;
    }

    const priority =
      selected.length === 0
        ? "primary"
        : selected.length === 1
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
        priority === "primary"
          ? "Highest-value market theme available from the current verified context. Use one primary post before expanding the content queue."
          : priority === "backup"
            ? "Second-best verified market theme. Keep as the backup asset and publish only if the primary angle does not produce useful signal."
            : "Lower-priority theme retained for later testing instead of creating additional daily posts.",
      evidenceBasis: [
        candidate.source,
        context.evidenceBoundary ??
          "Public evidence only.",
      ],
      recommendedChannel:
        "xiaohongshu",
      publishNow:
        priority === "primary",
    });

    if (
      selected.length >= 3
    ) {
      break;
    }
  }

  return selected;
}

export function optimizeC168InboundCampaign(
  campaign: InboundDemandCampaign,
): {
  campaign: InboundDemandCampaign;
  contentOpportunities:
    C168InboundContentOpportunity[];
} {
  const opportunities =
    selectC168InboundContentOpportunities(
      campaign.marketContext,
    );

  if (
    opportunities.length === 0
  ) {
    return {
      campaign,
      contentOpportunities:
        [],
    };
  }

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

  const contentAssets =
    campaign.contentAssets.filter(
      (asset) =>
        asset.channel ===
          "xianyu" ||
        selectedFormats.has(
          asset.format,
        ),
    );

  const selectedTopics =
    opportunities
      .filter(
        (item) =>
          item.priority !==
          "defer",
      )
      .map(
        (item) =>
          item.topic,
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
