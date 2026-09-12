import type {
  Locale,
} from "@/lib/i18n";

export interface CommercialChatIntent {
  detected: boolean;
  title: string;
  description: string;
  successCriteria: string;
  stage:
    | "idea"
    | "validation"
    | "acquisition"
    | "conversion"
    | "delivery"
    | "retention"
    | "scaling";
  currency: string;
  revenueTarget: number;
  costTarget: number;
  customerTarget: number;
}

function normalize(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(
  value: string,
): number {
  const normalized =
    value.replace(/,/g, "").trim();

  const number =
    Number.parseFloat(
      normalized,
    );

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(number * 100) / 100,
  );
}

function parseMoney(
  prompt: string,
  patterns: RegExp[],
): number {
  for (const pattern of patterns) {
    const match =
      prompt.match(pattern);

    if (!match) {
      continue;
    }

    const value =
      parseNumber(match[1]);

    const unit =
      match[2]?.toLowerCase() ?? "";

    if (
      unit === "万" ||
      unit === "w"
    ) {
      return value * 10000;
    }

    if (
      unit === "k"
    ) {
      return value * 1000;
    }

    return value;
  }

  return 0;
}

function parseCustomers(
  prompt: string,
): number {
  const patterns = [
    /(\d[\d,]*(?:\.\d+)?)\s*(?:个|名)?\s*(?:付费客户|客户|顾客)/i,
    /(?:客户|顾客|付费客户)\s*(?:目标|数量)?\s*[:：]?\s*(\d[\d,]*(?:\.\d+)?)/i,
    /(\d[\d,]*(?:\.\d+)?)\s*(?:paying customers?|customers?|clients?)/i,
  ];

  for (const pattern of patterns) {
    const match =
      prompt.match(pattern);

    if (match) {
      return Math.max(
        0,
        Math.floor(
          parseNumber(match[1]),
        ),
      );
    }
  }

  return 0;
}

function inferCurrency(
  prompt: string,
  locale: Locale,
): string {
  if (
    /(?:¥|￥|人民币|元|CNY|RMB)/i.test(
      prompt,
    )
  ) {
    return "CNY";
  }

  if (
    /(?:美元|美金|USD|\$)/i.test(
      prompt,
    )
  ) {
    return "USD";
  }

  if (
    /(?:日元|JPY|円|¥)/i.test(
      prompt,
    )
  ) {
    return "JPY";
  }

  if (locale === "zh-CN") {
    return "CNY";
  }

  if (locale === "ja") {
    return "JPY";
  }

  return "USD";
}

function inferStage(
  prompt: string,
):
  CommercialChatIntent["stage"] {
  if (
    /(?:扩大|规模化|增长|scale|scaling)/i.test(
      prompt,
    )
  ) {
    return "scaling";
  }

  if (
    /(?:复购|留存|retention|retain)/i.test(
      prompt,
    )
  ) {
    return "retention";
  }

  if (
    /(?:交付|delivery|deliver)/i.test(
      prompt,
    )
  ) {
    return "delivery";
  }

  if (
    /(?:成交|转化|conversion|convert)/i.test(
      prompt,
    )
  ) {
    return "conversion";
  }

  if (
    /(?:获客|客户|customer|acquisition|acquire)/i.test(
      prompt,
    )
  ) {
    return "acquisition";
  }

  return "validation";
}

function extractTitle(
  prompt: string,
  locale: Locale,
): string {
  const normalized =
    normalize(prompt);

  if (
    /第一个付费客户|首个付费客户|第一个客户/.test(
      normalized,
    )
  ) {
    return locale === "ja"
      ? "最初の有料顧客を獲得する"
      : locale === "en"
        ? "Acquire the first paying customer"
        : "获得第一个付费客户";
  }

  if (
    /first paying customer/i.test(
      normalized,
    )
  ) {
    return "Acquire the first paying customer";
  }

  const colonIndex =
    normalized.search(
      /[:：]/,
    );

  if (colonIndex >= 0) {
    const candidate =
      normalize(
        normalized.slice(
          colonIndex + 1,
        ),
      );

    if (
      candidate &&
      candidate.length <= 100
    ) {
      return candidate;
    }
  }

  if (locale === "ja") {
    return "新しい商業目標";
  }

  if (locale === "en") {
    return "New commercial objective";
  }

  return "新的商业目标";
}

function isCommercialIntent(
  prompt: string,
): boolean {
  const normalized =
    normalize(prompt);

  const chinese =
    /(?:建立|创建|设定|制定|设置).{0,12}(?:商业目标|赚钱目标|收入目标|盈利目标)|(?:真实赚钱目标|商业 Objective)/i.test(
      normalized,
    );

  const english =
    /(?:create|set|establish|define).{0,20}(?:commercial objective|revenue goal|business goal|money goal)|commercial objective/i.test(
      normalized,
    );

  const japanese =
    /(?:商業目標|収益目標).{0,12}(?:作成|設定|制定)|(?:商業目標を作成|商業目標を設定)/i.test(
      normalized,
    );

  return (
    chinese ||
    english ||
    japanese
  );
}

export function detectCommercialChatIntent(
  prompt: string,
  locale: Locale,
): CommercialChatIntent {
  const cleanPrompt =
    normalize(prompt);

  if (
    !cleanPrompt ||
    !isCommercialIntent(
      cleanPrompt,
    )
  ) {
    return {
      detected: false,
      title: "",
      description: "",
      successCriteria: "",
      stage: "validation",
      currency:
        inferCurrency(
          cleanPrompt,
          locale,
        ),
      revenueTarget: 0,
      costTarget: 0,
      customerTarget: 0,
    };
  }

  const currency =
    inferCurrency(
      cleanPrompt,
      locale,
    );

  const revenueTarget =
    parseMoney(
      cleanPrompt,
      [
        /(?:收入|营收|营业额|销售额|revenue|sales)\s*(?:目标|target|goal)?\s*[:：]?\s*(?:¥|￥|\$)?\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,
        /(?:目标|target|goal)[^。；;\n]{0,40}?(?:¥|￥|\$)\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,
        /(?:USD|CNY|JPY)\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,
      ],
    );

  const costTarget =
    parseMoney(
      cleanPrompt,
      [
        /(?:成本|预算|cost|budget)\s*(?:目标|上限|target|limit)?\s*[:：]?\s*(?:¥|￥|\$)?\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,
      ],
    );

  const customerTarget =
    parseCustomers(
      cleanPrompt,
    );

  const title =
    extractTitle(
      cleanPrompt,
      locale,
    );

  const successCriteria =
    cleanPrompt;

  return {
    detected: true,
    title,
    description:
      cleanPrompt,
    successCriteria,
    stage:
      inferStage(
        cleanPrompt,
      ),
    currency,
    revenueTarget,
    costTarget,
    customerTarget,
  };
}
