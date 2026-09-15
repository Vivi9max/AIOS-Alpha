import "server-only";

import type {
  CommercialObjective,
} from "@/lib/commercial/operating-layer";

import type {
  C144ProspectCandidate,
} from "@/lib/commercial/c144-prospect-discovery";

export interface C144OutreachMessage {
  language:
    | "zh"
    | "en"
    | "ja";
  channel:
    | "email"
    | "x"
    | "linkedin"
    | "manual";
  subject: string;
  body: string;
}

export interface C144OutreachPackage {
  candidateId: string;
  candidateName: string;
  qualificationStatus:
    | "needs-manual-validation";
  contactRule: string;
  messages: C144OutreachMessage[];
  manualChecklist: string[];
  integrity: {
    contactWasSent: false;
    responseWasReceived: false;
    customerWasAcquired: false;
    revenueWasGenerated: false;
  };
}

function buildEvidenceReference(
  candidate: C144ProspectCandidate,
): string {
  const evidence =
    candidate.evidence[0] ||
    "the current market evidence";

  return evidence.slice(
    0,
    320,
  );
}

export function buildC144OutreachPackage(
  objective: CommercialObjective,
  candidate: C144ProspectCandidate,
): C144OutreachPackage {
  const evidence =
    buildEvidenceReference(
      candidate,
    );

  const target =
    `${objective.revenueTarget} ${objective.currency}`;

  const zh =
    [
      "您好，",
      "",
      `我们最近在研究与${candidate.name}所在领域相关的跨境市场机会。`,
      `基于公开资料，我们注意到：${evidence}`,
      "",
      "我们目前正在验证一项面向企业的跨境市场情报与产品验证服务，重点帮助企业判断日本及其他海外市场的真实机会、竞争情况和进入优先级。",
      "",
      "如果贵司近期正在考虑日本市场、跨境销售、产品验证或市场进入，我们可以先提供一次简短的机会判断。",
      "",
      "如果目前没有相关计划，也完全没关系。",
      "",
      "方便的话，我可以先发一份简短的市场机会摘要供您参考。",
    ].join("\n");

  const en =
    [
      "Hello,",
      "",
      `We are currently researching cross-border opportunities related to ${candidate.name}.`,
      `One relevant signal from public information is: ${evidence}`,
      "",
      "We are validating a cross-border market intelligence and product validation service that helps businesses assess real demand, competition, and market-entry priorities in Japan and other overseas markets.",
      "",
      "If your company is currently considering Japan, cross-border sales, product validation, or market entry, I would be happy to share a short opportunity assessment.",
      "",
      "If this is not relevant to your current plans, no problem at all.",
      "",
      "Would it be useful if I sent you a short market opportunity summary?",
    ].join("\n");

  const ja =
    [
      "こんにちは。",
      "",
      `${candidate.name}の分野に関連する海外市場の動向を調査しています。`,
      `公開情報から、現在確認できる関連シグナルとして「${evidence}」があります。`,
      "",
      "現在、日本市場や越境販売、商品検証、海外市場への参入判断を支援する市場インテリジェンスサービスを検証しています。",
      "",
      "もし御社で日本市場や越境販売、商品検証、海外展開をご検討中でしたら、簡単な市場機会の分析を共有できます。",
      "",
      "現時点で関係がなければ、もちろん問題ありません。",
      "",
      "短い市場機会レポートをお送りしてもよろしいでしょうか。",
    ].join("\n");

  return {
    candidateId:
      candidate.id,
    candidateName:
      candidate.name,
    qualificationStatus:
      "needs-manual-validation",
    contactRule:
      "Do not send until the founder manually verifies that the candidate is a real and relevant business prospect.",
    messages: [
      {
        language: "zh",
        channel: "manual",
        subject:
          "关于日本市场/跨境市场机会的简短交流",
        body: zh,
      },
      {
        language: "en",
        channel: "email",
        subject:
          "A short cross-border market opportunity question",
        body: en,
      },
      {
        language: "ja",
        channel: "email",
        subject:
          "海外市場・日本市場についての簡単なご相談",
        body: ja,
      },
    ],
    manualChecklist: [
      "确认企业/组织真实存在。",
      "打开原始来源并确认当前信息仍然有效。",
      "确认该对象与日本市场、跨境业务、产品验证或市场进入存在合理关联。",
      "寻找公开且合适的企业联系方式。",
      "不要发送未经人工检查的内容。",
      "记录实际发送时间、渠道和对象。",
      "只有收到真实回复后，才进入客户资格判断。",
      "只有实际付款后，才记录真实收入。",
      `Commercial target: acquire 1 paying customer and verify ${target} revenue.`,
    ],
    integrity: {
      contactWasSent: false,
      responseWasReceived: false,
      customerWasAcquired: false,
      revenueWasGenerated: false,
    },
  };
}
