import {
  runBrain,
} from "@/lib/brain";

export interface CommerceProductIntelligence {
  success: boolean;
  code: string;

  product: {
    name: string;
    category: string;
    type: string;
  };

  visualSignals: {
    appearance: string[];
    packaging: string[];
    demonstration: string[];
    peopleActions: string[];
    textOverlays: string[];
    priceSignals: string[];
  };

  sellingPoints: string[];

  targetCustomer: string;

  marketingPattern: {
    hook: string;
    demonstration: string;
    emotionalTrigger: string;
    purchaseTrigger: string;
  };

  evidence: Array<{
    claim: string;
    basis: string;
    confidence: "high" | "medium" | "low";
  }>;

  confidence: {
    product: number;
    sellingPoints: number;
    price: number;
    commercialSignal: number;
  };

  unknowns: string[];

  nextActions: string[];

  source: {
    type: "video-vision";
    model?: string;
  };

  rawAnalysis?: string;

  error?: string;
}

interface RuntimeCommercePayload {
  product?: {
    name?: unknown;
    category?: unknown;
    type?: unknown;
  };

  visualSignals?: {
    appearance?: unknown;
    packaging?: unknown;
    demonstration?: unknown;
    peopleActions?: unknown;
    textOverlays?: unknown;
    priceSignals?: unknown;
  };

  sellingPoints?: unknown;

  targetCustomer?: unknown;

  marketingPattern?: {
    hook?: unknown;
    demonstration?: unknown;
    emotionalTrigger?: unknown;
    purchaseTrigger?: unknown;
  };

  evidence?: unknown;

  confidence?: {
    product?: unknown;
    sellingPoints?: unknown;
    price?: unknown;
    commercialSignal?: unknown;
  };

  unknowns?: unknown;

  nextActions?: unknown;
}

const MAX_VISION_CONTENT_LENGTH =
  12_000;

const MAX_OUTPUT_LENGTH =
  20_000;

function text(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function stringArray(
  value: unknown,
  max = 12,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(text)
        .filter(Boolean)
        .slice(0, max),
    ),
  );
}

function number(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(
      0,
      Math.min(100, value),
    );
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {
      return Math.max(
        0,
        Math.min(100, parsed),
      );
    }
  }

  return fallback;
}

function extractJson(
  content: string,
): RuntimeCommercePayload | null {
  const raw =
    content.trim();

  if (!raw) {
    return null;
  }

  const fenced =
    raw.match(
      /```(?:json)?\s*([\s\S]*?)```/i,
    );

  const source =
    fenced?.[1]?.trim() ??
    raw;

  try {
    const parsed =
      JSON.parse(source);

    if (
      parsed &&
      typeof parsed === "object"
    ) {
      return parsed as RuntimeCommercePayload;
    }
  } catch {
    // Continue with object extraction.
  }

  const start =
    source.indexOf("{");

  const end =
    source.lastIndexOf("}");

  if (
    start === -1 ||
    end <= start
  ) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        source.slice(
          start,
          end + 1,
        ),
      );

    if (
      parsed &&
      typeof parsed === "object"
    ) {
      return parsed as RuntimeCommercePayload;
    }
  } catch {
    return null;
  }

  return null;
}

function isCommerceRequest(
  prompt: string,
  visionContent: string,
): boolean {
  const source =
    `${prompt}\n${visionContent}`
      .toLowerCase();

  const keywords = [
    "电商",
    "商品",
    "产品",
    "卖点",
    "带货",
    "抖音",
    "短视频",
    "直播",
    "购买",
    "售价",
    "价格",
    "供应链",
    "1688",
    "一件代发",
    "douyin",
    "tiktok",
    "ecommerce",
    "product",
    "commerce",
    "shopping",
    "selling point",
  ];

  return keywords.some(
    (keyword) =>
      source.includes(
        keyword.toLowerCase(),
      ),
  );
}

function buildCommercePrompt(
  userPrompt: string,
  visionContent: string,
): string {
  const boundedVision =
    visionContent.slice(
      0,
      MAX_VISION_CONTENT_LENGTH,
    );

  return [
    "You are the AIOS Commerce Product Intelligence Runtime.",
    "",
    "Your job is to convert already-verified video Vision analysis into a structured commerce intelligence record.",
    "",
    "IMPORTANT:",
    "The Vision analysis is evidence about supplied video frames.",
    "Do not pretend that unseen parts of the video were observed.",
    "Do not invent product facts.",
    "Do not invent brands.",
    "Do not invent prices.",
    "Do not invent sales volume.",
    "Do not invent suppliers.",
    "Do not invent 1688 listings.",
    "Do not invent customer demographics.",
    "Do not invent market demand.",
    "",
    "If something cannot be confirmed from the supplied Vision analysis, use an empty string, empty array, or add it to unknowns.",
    "",
    "Price rules:",
    "A price may only be reported if the Vision analysis explicitly observed a price or price-related text.",
    "If no price is visible, confidence.price must be 0 and unknowns must mention that price was not visually confirmed.",
    "",
    "Commercial interpretation rules:",
    "Separate direct visual facts from commercial inference.",
    "Selling points may be inferred only when the visual evidence clearly demonstrates the feature or benefit.",
    "Marketing pattern fields must distinguish what is visibly demonstrated from what is inferred.",
    "Do not claim that a product is profitable.",
    "Do not claim that demand is high.",
    "Do not claim that a product should be sold.",
    "",
    "This is C145.1.",
    "1688 supplier discovery, live market pricing, competition and profitability are NOT part of this stage.",
    "Those will be verified later through external web evidence.",
    "",
    "Return ONLY valid JSON.",
    "",
    "Required JSON:",
    "{",
    '  "product": {',
    '    "name": "",',
    '    "category": "",',
    '    "type": ""',
    "  },",
    '  "visualSignals": {',
    '    "appearance": [],',
    '    "packaging": [],',
    '    "demonstration": [],',
    '    "peopleActions": [],',
    '    "textOverlays": [],',
    '    "priceSignals": []',
    "  },",
    '  "sellingPoints": [],',
    '  "targetCustomer": "",',
    '  "marketingPattern": {',
    '    "hook": "",',
    '    "demonstration": "",',
    '    "emotionalTrigger": "",',
    '    "purchaseTrigger": ""',
    "  },",
    '  "evidence": [',
    "    {",
    '      "claim": "",',
    '      "basis": "",',
    '      "confidence": "high"',
    "    }",
    "  ],",
    '  "confidence": {',
    '    "product": 0,',
    '    "sellingPoints": 0,',
    '    "price": 0,',
    '    "commercialSignal": 0',
    "  },",
    '  "unknowns": [],',
    '  "nextActions": []',
    "}",
    "",
    "USER REQUEST:",
    userPrompt.slice(
      0,
      2_000,
    ),
    "",
    "VERIFIED VIDEO VISION ANALYSIS:",
    boundedVision,
  ].join("\n");
}

function normalizeEvidence(
  value: unknown,
): CommerceProductIntelligence["evidence"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 20)
    .map((item) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      const confidence =
        text(
          record.confidence,
        );

      return {
        claim:
          text(
            record.claim,
          ),
        basis:
          text(
            record.basis,
          ),
        confidence:
          confidence === "high" ||
          confidence === "medium"
            ? confidence
            : "low",
      };
    })
    .filter(
      (
        item,
      ): item is CommerceProductIntelligence["evidence"][number] =>
        Boolean(
          item &&
          item.claim &&
          item.basis,
        ),
    );
}

function normalizePayload(
  payload: RuntimeCommercePayload,
  model?: string,
): CommerceProductIntelligence {
  const product =
    payload.product ?? {};

  const visual =
    payload.visualSignals ?? {};

  const marketing =
    payload.marketingPattern ??
    {};

  const confidence =
    payload.confidence ??
    {};

  const result: CommerceProductIntelligence = {
    success: true,
    code:
      "C145_1_COMMERCE_PRODUCT_INTELLIGENCE_PASS",

    product: {
      name:
        text(product.name),
      category:
        text(product.category),
      type:
        text(product.type),
    },

    visualSignals: {
      appearance:
        stringArray(
          visual.appearance,
        ),
      packaging:
        stringArray(
          visual.packaging,
        ),
      demonstration:
        stringArray(
          visual.demonstration,
        ),
      peopleActions:
        stringArray(
          visual.peopleActions,
        ),
      textOverlays:
        stringArray(
          visual.textOverlays,
        ),
      priceSignals:
        stringArray(
          visual.priceSignals,
        ),
    },

    sellingPoints:
      stringArray(
        payload.sellingPoints,
      ),

    targetCustomer:
      text(
        payload.targetCustomer,
      ),

    marketingPattern: {
      hook:
        text(marketing.hook),
      demonstration:
        text(
          marketing.demonstration,
        ),
      emotionalTrigger:
        text(
          marketing.emotionalTrigger,
        ),
      purchaseTrigger:
        text(
          marketing.purchaseTrigger,
        ),
    },

    evidence:
      normalizeEvidence(
        payload.evidence,
      ),

    confidence: {
      product:
        number(
          confidence.product,
        ),
      sellingPoints:
        number(
          confidence.sellingPoints,
        ),
      price:
        number(
          confidence.price,
        ),
      commercialSignal:
        number(
          confidence.commercialSignal,
        ),
    },

    unknowns:
      stringArray(
        payload.unknowns,
        20,
      ),

    nextActions:
      stringArray(
        payload.nextActions,
        12,
      ),

    source: {
      type: "video-vision",
      ...(model
        ? { model }
        : {}),
    },
  };

  if (
    result.visualSignals.priceSignals
      .length === 0
  ) {
    result.confidence.price =
      0;

    if (
      !result.unknowns.some(
        (item) =>
          item.includes("价格") ||
          item
            .toLowerCase()
            .includes("price"),
      )
    ) {
      result.unknowns.push(
        "当前视频 Vision 未确认明确价格。",
      );
    }
  }

  if (
    result.product.name === ""
  ) {
    result.unknowns.push(
      "当前视频 Vision 未能确认具体商品名称。",
    );
  }

  if (
    result.sellingPoints.length === 0
  ) {
    result.unknowns.push(
      "当前视频 Vision 未确认明确商品卖点。",
    );
  }

  if (
    result.nextActions.length === 0
  ) {
    result.nextActions = [
      "获取该商品的真实外部市场证据。",
      "检索1688供应链与采购价格。",
      "验证当前市场售价与竞争程度。",
    ];
  }

  result.unknowns =
    Array.from(
      new Set(
        result.unknowns,
      ),
    ).slice(0, 20);

  return result;
}

export async function executeCommerceProductIntelligence(
  userPrompt: string,
  visionContent: string,
  model?: string,
): Promise<CommerceProductIntelligence> {
  const prompt =
    userPrompt.trim();

  const vision =
    visionContent.trim();

  if (!vision) {
    return {
      success: false,
      code:
        "C145_1_COMMERCE_VISION_INPUT_EMPTY",
      product: {
        name: "",
        category: "",
        type: "",
      },
      visualSignals: {
        appearance: [],
        packaging: [],
        demonstration: [],
        peopleActions: [],
        textOverlays: [],
        priceSignals: [],
      },
      sellingPoints: [],
      targetCustomer: "",
      marketingPattern: {
        hook: "",
        demonstration: "",
        emotionalTrigger: "",
        purchaseTrigger: "",
      },
      evidence: [],
      confidence: {
        product: 0,
        sellingPoints: 0,
        price: 0,
        commercialSignal: 0,
      },
      unknowns: [
        "没有可用的 Video Vision 分析结果。",
      ],
      nextActions: [
        "先完成 C144.9 Vision Model Analysis。",
      ],
      source: {
        type: "video-vision",
        ...(model ? { model } : {}),
      },
      error:
        "Video Vision content is required.",
    };
  }

  if (
    !isCommerceRequest(
      prompt,
      vision,
    )
  ) {
    return {
      success: true,
      code:
        "C145_1_COMMERCE_NOT_APPLICABLE",
      product: {
        name: "",
        category: "",
        type: "",
      },
      visualSignals: {
        appearance: [],
        packaging: [],
        demonstration: [],
        peopleActions: [],
        textOverlays: [],
        priceSignals: [],
      },
      sellingPoints: [],
      targetCustomer: "",
      marketingPattern: {
        hook: "",
        demonstration: "",
        emotionalTrigger: "",
        purchaseTrigger: "",
      },
      evidence: [],
      confidence: {
        product: 0,
        sellingPoints: 0,
        price: 0,
        commercialSignal: 0,
      },
      unknowns: [],
      nextActions: [],
      source: {
        type: "video-vision",
        ...(model ? { model } : {}),
      },
    };
  }

  try {
    const brain =
      await runBrain({
        prompt:
          buildCommercePrompt(
            prompt,
            vision,
          ),
        systemPrompt:
          [
            "You are a strict evidence-bound commerce intelligence parser.",
            "Return JSON only.",
            "Never fabricate facts.",
            "Never treat missing evidence as positive evidence.",
            "Never invent prices, suppliers, demand, sales or profitability.",
            `Keep the final JSON below ${MAX_OUTPUT_LENGTH} characters.`,
          ].join("\n"),
        historyLimit: 0,
      });

    if (
      !brain.success ||
      !brain.content.trim()
    ) {
      return {
        success: false,
        code:
          "C145_1_COMMERCE_INTELLIGENCE_MODEL_FAILED",
        product: {
          name: "",
          category: "",
          type: "",
        },
        visualSignals: {
          appearance: [],
          packaging: [],
          demonstration: [],
          peopleActions: [],
          textOverlays: [],
          priceSignals: [],
        },
        sellingPoints: [],
        targetCustomer: "",
        marketingPattern: {
          hook: "",
          demonstration: "",
          emotionalTrigger: "",
          purchaseTrigger: "",
        },
        evidence: [],
        confidence: {
          product: 0,
          sellingPoints: 0,
          price: 0,
          commercialSignal: 0,
        },
        unknowns: [
          "Commerce Intelligence 模型没有返回可解析结果。",
        ],
        nextActions: [
          "检查当前 AI Provider 状态后重试。",
        ],
        source: {
          type: "video-vision",
          ...(model ? { model } : {}),
        },
        error:
          brain.error ??
          "Commerce Intelligence model returned no usable content.",
      };
    }

    const payload =
      extractJson(
        brain.content,
      );

    if (!payload) {
      return {
        success: false,
        code:
          "C145_1_COMMERCE_INTELLIGENCE_INVALID_JSON",
        product: {
          name: "",
          category: "",
          type: "",
        },
        visualSignals: {
          appearance: [],
          packaging: [],
          demonstration: [],
          peopleActions: [],
          textOverlays: [],
          priceSignals: [],
        },
        sellingPoints: [],
        targetCustomer: "",
        marketingPattern: {
          hook: "",
          demonstration: "",
          emotionalTrigger: "",
          purchaseTrigger: "",
        },
        evidence: [],
        confidence: {
          product: 0,
          sellingPoints: 0,
          price: 0,
          commercialSignal: 0,
        },
        unknowns: [
          "模型返回内容不是有效 Commerce Intelligence JSON。",
        ],
        nextActions: [
          "重新执行 Commerce Product Intelligence。",
        ],
        source: {
          type: "video-vision",
          ...(model ? { model } : {}),
        },
        rawAnalysis:
          brain.content.slice(
            0,
            MAX_OUTPUT_LENGTH,
          ),
        error:
          "Invalid Commerce Intelligence JSON.",
      };
    }

    const normalized =
      normalizePayload(
        payload,
        model,
      );

    normalized.rawAnalysis =
      brain.content.slice(
        0,
        MAX_OUTPUT_LENGTH,
      );

    return normalized;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Commerce Intelligence execution failed.";

    return {
      success: false,
      code:
        "C145_1_COMMERCE_INTELLIGENCE_ERROR",
      product: {
        name: "",
        category: "",
        type: "",
      },
      visualSignals: {
        appearance: [],
        packaging: [],
        demonstration: [],
        peopleActions: [],
        textOverlays: [],
        priceSignals: [],
      },
      sellingPoints: [],
      targetCustomer: "",
      marketingPattern: {
        hook: "",
        demonstration: "",
        emotionalTrigger: "",
        purchaseTrigger: "",
      },
      evidence: [],
      confidence: {
        product: 0,
        sellingPoints: 0,
        price: 0,
        commercialSignal: 0,
      },
      unknowns: [
        "Commerce Product Intelligence 执行过程中发生错误。",
      ],
      nextActions: [
        "检查 Runtime 与 AI Provider 后重试。",
      ],
      source: {
        type: "video-vision",
        ...(model ? { model } : {}),
      },
      error: message,
    };
  }
}
