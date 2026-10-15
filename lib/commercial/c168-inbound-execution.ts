import type {
  InboundContentAsset,
  InboundDemandCampaign,
} from "@/lib/commercial/c144-inbound-demand-engine";

import type {
  C168InboundContentOpportunity,
} from "@/lib/commercial/c168-inbound-opportunity";

export const C168_INBOUND_EXECUTION_VERSION =
  "C168.8.0";

export type C168InboundExecutionStatus =
  | "ready-for-founder-review"
  | "insufficient-opportunity"
  | "insufficient-content";

export interface C168InboundExecutionPacket {
  id: string;
  version: string;
  status: C168InboundExecutionStatus;

  opportunity: {
    id: string;
    topic: string;
    score: number;
    channel:
      | "xiaohongshu"
      | "xianyu";
    rationale: string;
    evidenceBasis: string[];
  } | null;

  asset: {
    channel:
      | "xiaohongshu"
      | "xianyu";
    format: string;
    title: string;
    body: string;
    callToAction: string;
    disclosure: string[];
  } | null;

  validation: {
    primaryGoal: string;
    validInquiryDefinition: string[];
    recordAfterPublishing: string[];
    successSignal: string;
    insufficientSignal: string;
  };

  founderChecklist: string[];

  executionBoundary: {
    automaticPublishing: false;
    automaticMessaging: false;
    automaticAdOperation: false;
    requiresFounderReview: true;
    requiresManualPublishing: true;
  };

  nextAction: string;
}

function findPrimaryOpportunity(
  opportunities:
    C168InboundContentOpportunity[],
):
  | C168InboundContentOpportunity
  | null {
  return (
    opportunities.find(
      (opportunity) =>
        opportunity.priority ===
        "primary",
    ) ??
    opportunities[0] ??
    null
  );
}

function findPrimaryAsset(
  campaign:
    InboundDemandCampaign,
  opportunity:
    | C168InboundContentOpportunity
    | null,
):
  | InboundContentAsset
  | null {
  if (!opportunity) {
    return null;
  }

  return (
    campaign.contentAssets.find(
      (asset) =>
        asset.channel ===
        opportunity.recommendedChannel,
    ) ??
    null
  );
}

function buildValidInquiryDefinition(): string[] {
  return [
    "对方主动通过已发布平台产生真实咨询。",
    "对方说明真实经营业务或服务类型。",
    "对方提出与获客、广告、咨询、线索或成交链路有关的真实问题。",
    "对方愿意继续提供至少一项用于判断服务适配度的信息。",
  ];
}

function buildRecordAfterPublishing(): string[] {
  return [
    "实际发布平台。",
    "实际发布时间。",
    "实际发布的标题或内容版本。",
    "收到的真实咨询数量。",
    "能够进入资格判断的真实询盘数量。",
    "询盘明确表达的业务问题。",
    "是否进入399元诊断Offer确认。",
    "是否产生真实付款。",
  ];
}

function buildFounderChecklist(
  opportunity:
    | C168InboundContentOpportunity
    | null,
  asset:
    | InboundContentAsset
    | null,
): string[] {
  if (
    !opportunity ||
    !asset
  ) {
    return [
      "不要为了完成今日发布任务而虚构市场问题。",
      "检查是否存在足够的C168公开证据。",
      "确认存在与推荐渠道一致的真实内容草稿。",
      "条件不足时保持不发布。",
    ];
  }

  return [
    `确认今天使用${opportunity.recommendedChannel === "xiaohongshu" ? "小红书" : "闲鱼"}作为主发布渠道。`,
    "人工检查标题和正文是否与当前真实服务范围一致。",
    "确认文案没有把公开Evidence描述成某个具体客户已经存在的问题。",
    "确认没有虚假案例、虚假评价、虚假成交或ROI承诺。",
    "检查CTA符合当前平台规则。",
    "人工完成最终发布。",
    "发布后只记录真实发生的咨询、资格判断、订单和付款。",
  ];
}

export function buildC168InboundExecutionPacket(
  campaign:
    InboundDemandCampaign,
  opportunities:
    C168InboundContentOpportunity[],
): C168InboundExecutionPacket {
  const opportunity =
    findPrimaryOpportunity(
      opportunities,
    );

  if (!opportunity) {
    return {
      id:
        `${C168_INBOUND_EXECUTION_VERSION}-no-opportunity`,

      version:
        C168_INBOUND_EXECUTION_VERSION,

      status:
        "insufficient-opportunity",

      opportunity:
        null,

      asset:
        null,

      validation: {
        primaryGoal:
          "Do not publish unsupported acquisition content.",

        validInquiryDefinition:
          buildValidInquiryDefinition(),

        recordAfterPublishing:
          buildRecordAfterPublishing(),

        successSignal:
          "A real platform-native inquiry that provides enough customer-supplied information to begin qualification.",

        insufficientSignal:
          "Views, likes, saves, clicks, or public market signals without a real inbound inquiry.",
      },

      founderChecklist:
        buildFounderChecklist(
          null,
          null,
        ),

      executionBoundary: {
        automaticPublishing:
          false,

        automaticMessaging:
          false,

        automaticAdOperation:
          false,

        requiresFounderReview:
          true,

        requiresManualPublishing:
          true,
      },

      nextAction:
        "Keep the campaign in safe fallback. Refresh C168 market evidence before preparing a manual publication.",
    };
  }

  const asset =
    findPrimaryAsset(
      campaign,
      opportunity,
    );

  if (!asset) {
    return {
      id:
        `${C168_INBOUND_EXECUTION_VERSION}-${opportunity.id}-no-asset`,

      version:
        C168_INBOUND_EXECUTION_VERSION,

      status:
        "insufficient-content",

      opportunity: {
        id:
          opportunity.id,

        topic:
          opportunity.topic,

        score:
          opportunity.score,

        channel:
          opportunity.recommendedChannel,

        rationale:
          opportunity.rationale,

        evidenceBasis:
          opportunity.evidenceBasis,
      },

      asset:
        null,

      validation: {
        primaryGoal:
          "Do not publish until the selected opportunity has a channel-aligned content asset.",

        validInquiryDefinition:
          buildValidInquiryDefinition(),

        recordAfterPublishing:
          buildRecordAfterPublishing(),

        successSignal:
          "A real platform-native inquiry that provides enough customer-supplied information to begin qualification.",

        insufficientSignal:
          "A ranked opportunity without a publishable content asset is not an executable acquisition action.",
      },

      founderChecklist:
        buildFounderChecklist(
          opportunity,
          null,
        ),

      executionBoundary: {
        automaticPublishing:
          false,

        automaticMessaging:
          false,

        automaticAdOperation:
          false,

        requiresFounderReview:
          true,

        requiresManualPublishing:
          true,
      },

      nextAction:
        "Generate or review a content asset for the recommended channel before manual publication.",
    };
  }

  return {
    id:
      `${C168_INBOUND_EXECUTION_VERSION}-${opportunity.id}`,

    version:
      C168_INBOUND_EXECUTION_VERSION,

    status:
      "ready-for-founder-review",

    opportunity: {
      id:
        opportunity.id,

      topic:
        opportunity.topic,

      score:
        opportunity.score,

      channel:
        opportunity.recommendedChannel,

      rationale:
        opportunity.rationale,

      evidenceBasis:
        opportunity.evidenceBasis,
    },

    asset: {
      channel:
        asset.channel,

      format:
        asset.format,

      title:
        asset.title,

      body:
        asset.body,

      callToAction:
        asset.callToAction,

      disclosure:
        asset.disclosure,
    },

    validation: {
      primaryGoal:
        "Generate the first real qualified inbound inquiry from an existing external platform before increasing publishing volume.",

      validInquiryDefinition:
        buildValidInquiryDefinition(),

      recordAfterPublishing:
        buildRecordAfterPublishing(),

      successSignal:
        "At least one real platform-native inquiry provides enough customer-supplied information to enter AIOS lead qualification.",

      insufficientSignal:
        "Views, likes, saves, clicks, Evidence Score, Buying Signal, or other public activity without a real inbound inquiry do not count as customer validation.",
    },

    founderChecklist:
      buildFounderChecklist(
        opportunity,
        asset,
      ),

    executionBoundary: {
      automaticPublishing:
        false,

      automaticMessaging:
        false,

      automaticAdOperation:
        false,

      requiresFounderReview:
        true,

      requiresManualPublishing:
        true,
    },

    nextAction:
      `Founder reviews the ${opportunity.recommendedChannel} asset, publishes it manually through the approved platform interface, then records only real inbound results.`,
  };
}
