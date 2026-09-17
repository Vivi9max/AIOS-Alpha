import type {
  VideoVisualEvidenceResult,
} from "./video-visual-evidence-runtime";

import {
  executeVideoVisionGateway,
} from "./video-vision-gateway";

import {
  executeCommerceProductIntelligence,
  type CommerceProductIntelligence,
} from "./commerce-product-intelligence-runtime";

import {
  executeCommerceMarketIntelligence,
  type CommerceMarketIntelligence,
} from "./commerce-market-intelligence-runtime";

import {
  executeCommerceDecision,
  type CommerceDecisionResult,
} from "./commerce-decision-runtime";

export interface VideoVisionRuntimeResult {
  success: boolean;

  code: string;

  provider: "openai";

  model?: string;

  frameCount: number;

  analyzedFrameCount: number;

  semanticUnderstandingReady: boolean;

  content?: string;

  commerceProductIntelligence?: CommerceProductIntelligence;

  commerceMarketIntelligence?: CommerceMarketIntelligence;

  commerceDecision?: CommerceDecisionResult;

  error?: string;
}

function appendCommerceProductIntelligence(
  visionContent: string,
  commerce: CommerceProductIntelligence,
): string {
  if (
    commerce.code ===
    "C145_1_COMMERCE_NOT_APPLICABLE"
  ) {
    return visionContent;
  }

  const lines: string[] = [
    visionContent,
    "",
    "Commerce Product Intelligence",
    `处理代码：${commerce.code}`,
  ];

  if (commerce.success) {
    lines.push(
      "",
      "商品",
      `名称：${commerce.product.name || "未确认"}`,
      `类别：${commerce.product.category || "未确认"}`,
      `类型：${commerce.product.type || "未确认"}`,
      "",
      "视觉商业信号",
      `外观：${
        commerce.visualSignals.appearance.join("；") ||
        "未确认"
      }`,
      `包装：${
        commerce.visualSignals.packaging.join("；") ||
        "未确认"
      }`,
      `展示方式：${
        commerce.visualSignals.demonstration.join("；") ||
        "未确认"
      }`,
      `人物动作：${
        commerce.visualSignals.peopleActions.join("；") ||
        "未确认"
      }`,
      `字幕/文字：${
        commerce.visualSignals.textOverlays.join("；") ||
        "未确认"
      }`,
      `价格信号：${
        commerce.visualSignals.priceSignals.join("；") ||
        "未确认"
      }`,
      "",
      "卖点",
      commerce.sellingPoints.length > 0
        ? commerce.sellingPoints
            .map(
              (item, index) =>
                `${index + 1}. ${item}`,
            )
            .join("\n")
        : "当前视频未确认明确卖点。",
      "",
      "目标客户",
      commerce.targetCustomer ||
        "当前视频无法确认。",
      "",
      "营销模式",
      `Hook：${
        commerce.marketingPattern.hook ||
        "未确认"
      }`,
      `展示：${
        commerce.marketingPattern.demonstration ||
        "未确认"
      }`,
      `情绪触发：${
        commerce.marketingPattern.emotionalTrigger ||
        "未确认"
      }`,
      `购买触发：${
        commerce.marketingPattern.purchaseTrigger ||
        "未确认"
      }`,
      "",
      "置信度",
      `商品：${commerce.confidence.product}/100`,
      `卖点：${commerce.confidence.sellingPoints}/100`,
      `价格：${commerce.confidence.price}/100`,
      `商业信号：${commerce.confidence.commercialSignal}/100`,
    );

    if (
      commerce.unknowns.length > 0
    ) {
      lines.push(
        "",
        "未知项",
        commerce.unknowns
          .map(
            (item, index) =>
              `${index + 1}. ${item}`,
          )
          .join("\n"),
      );
    }

    if (
      commerce.nextActions.length > 0
    ) {
      lines.push(
        "",
        "下一步",
        commerce.nextActions
          .map(
            (item, index) =>
              `${index + 1}. ${item}`,
          )
          .join("\n"),
      );
    }

    lines.push(
      "",
      "C145.1 边界：",
      "以上商业信息仅来自当前 Video Vision 证据。",
      "尚未验证 1688 供应商、采购价格、销量、市场需求、竞争程度或实际利润。",
    );
  } else {
    lines.push(
      "",
      `Commerce Intelligence Error：${
        commerce.error ??
        "未返回可用结果。"
      }`,
    );
  }

  return lines.join("\n");
}

function appendCommerceMarketIntelligence(
  content: string,
  market: CommerceMarketIntelligence,
): string {
  const lines: string[] = [
    content,
    "",
    "Commerce Market & Supply Intelligence",
    `处理代码：${market.code}`,
  ];

  if (!market.success) {
    lines.push(
      "",
      `市场情报执行失败：${
        market.error ??
        "未返回可用结果。"
      }`,
    );

    return lines.join("\n");
  }

  lines.push(
    "",
    "市场证据",
    `来源数量：${market.marketEvidence.length}`,
    `独立来源：${market.verification.independentMarketSources}`,
    `市场验证：${
      market.verification.marketVerified
        ? "成功"
        : "有限"
    }`,
    "",
    "供应链证据",
    `来源数量：${market.supplyEvidence.length}`,
    `独立来源：${market.verification.independentSupplySources}`,
    `供应链验证：${
      market.verification.supplyVerified
        ? "成功"
        : "有限"
    }`,
    "",
    "价格信号",
    market.priceSignals.length > 0
      ? market.priceSignals
          .map(
            (item, index) =>
              `${index + 1}. ${item}`,
          )
          .join("\n")
      : "未确认可靠价格信号。",
    "",
    "竞品信号",
    market.competitorSignals.length > 0
      ? market.competitorSignals
          .map(
            (item, index) =>
              `${index + 1}. ${item}`,
          )
          .join("\n")
      : "未确认明确竞品信号。",
    "",
    "供应商信号",
    market.supplierSignals.length > 0
      ? market.supplierSignals
          .map(
            (item, index) =>
              `${index + 1}. ${item}`,
          )
          .join("\n")
      : "未确认明确供应商信号。",
    "",
    "验证",
    `价格证据：${
      market.verification.priceEvidenceFound
        ? "存在"
        : "不存在"
    }`,
    `竞品证据：${
      market.verification.competitorEvidenceFound
        ? "存在"
        : "不存在"
    }`,
    `供应商证据：${
      market.verification.supplierEvidenceFound
        ? "存在"
        : "不存在"
    }`,
    `综合验证：${
      market.verification.overallVerified
        ? "成功"
        : "有限"
    }`,
    `综合评分：${market.verification.score}/100`,
    "",
    "置信度",
    `市场：${market.confidence.market}/100`,
    `供应链：${market.confidence.supply}/100`,
    `价格：${market.confidence.price}/100`,
    `竞争：${market.confidence.competition}/100`,
  );

  if (
    market.unknowns.length > 0
  ) {
    lines.push(
      "",
      "未知项",
      market.unknowns
        .map(
          (item, index) =>
            `${index + 1}. ${item}`,
        )
        .join("\n"),
    );
  }

  if (
    market.nextActions.length > 0
  ) {
    lines.push(
      "",
      "下一步",
      market.nextActions
        .map(
          (item, index) =>
            `${index + 1}. ${item}`,
        )
        .join("\n"),
    );
  }

  lines.push(
    "",
    "C145.2 边界：",
    "以上市场、价格、竞品和供应链信息仅来自当前外部检索证据。",
    "未经过人工打开商品页面核验的采购价格，不视为最终采购成本。",
    "当前阶段不把搜索结果直接转换成利润承诺。",
  );

  return lines.join("\n");
}

function appendCommerceDecision(
  content: string,
  decision: CommerceDecisionResult,
): string {
  const lines: string[] = [
    content,
    "",
    "Commerce Decision Engine",
    `处理代码：${decision.code}`,
  ];

  if (!decision.success) {
    lines.push(
      "",
      `决策引擎执行失败：${
        decision.error ??
        "未返回可用结果。"
      }`,
    );

    return lines.join("\n");
  }

  const priorityText =
    decision.decision.testPriority ===
    "high"
      ? "HIGH"
      : decision.decision.testPriority ===
          "medium"
        ? "MEDIUM"
        : decision.decision.testPriority ===
            "low"
          ? "LOW"
          : "UNKNOWN";

  lines.push(
    "",
    "测试优先级",
    `${priorityText}`,
    `Decision Score：${decision.decision.score}/100`,
    "",
    "决策依据",
    decision.decision.rationale
      .map(
        (item, index) =>
          `${index + 1}. ${item}`,
      )
      .join("\n"),
    "",
    "价格分析",
    `市场价格信号：${decision.priceAnalysis.marketPriceCount}`,
    `供应链价格信号：${decision.priceAnalysis.supplyPriceCount}`,
    `价格空间信号：${decision.priceAnalysis.priceSpreadSignal}`,
    "Profitability Verified：false",
    "",
    "竞争分析",
    `竞品信号：${decision.competitionAnalysis.signalCount}`,
    `竞争程度：${decision.competitionAnalysis.level}`,
    "",
    "供应链分析",
    `供应证据：${decision.supplyAnalysis.evidenceCount}`,
    `供应商信号：${decision.supplyAnalysis.supplierSignalCount}`,
    `供应验证：${
      decision.supplyAnalysis.verified
        ? "成功"
        : "有限"
    }`,
    "",
    "内容分析",
    `卖点数量：${decision.contentAnalysis.sellingPointCount}`,
    `展示方式数量：${decision.contentAnalysis.demonstrationCount}`,
    `商业信号：${decision.contentAnalysis.commercialSignalScore}/100`,
    "",
    "验证",
    `市场：${
      decision.verification.marketVerified
        ? "成功"
        : "有限"
    }`,
    `供应链：${
      decision.verification.supplyVerified
        ? "成功"
        : "有限"
    }`,
    `价格：${
      decision.verification.priceEvidenceFound
        ? "存在"
        : "不存在"
    }`,
    `竞品：${
      decision.verification.competitorEvidenceFound
        ? "存在"
        : "不存在"
    }`,
    `供应商：${
      decision.verification.supplierEvidenceFound
        ? "存在"
        : "不存在"
    }`,
    `Overall Verified：${
      decision.verification.overallVerified
        ? "true"
        : "false"
    }`,
  );

  if (
    decision.unknowns.length > 0
  ) {
    lines.push(
      "",
      "未知项",
      decision.unknowns
        .map(
          (item, index) =>
            `${index + 1}. ${item}`,
        )
        .join("\n"),
    );
  }

  lines.push(
    "",
    "建议下一步",
    decision.nextActions
      .map(
        (item, index) =>
          `${index + 1}. ${item}`,
      )
      .join("\n"),
    "",
    "C145.3 边界：",
    ...decision.boundaries,
  );

  return lines.join("\n");
}

export async function executeRuntimeVideoVision(
  userPrompt: string,
  visualEvidence: VideoVisualEvidenceResult,
): Promise<VideoVisionRuntimeResult> {
  const vision =
    await executeVideoVisionGateway(
      userPrompt,
      visualEvidence,
    );

  if (
    !vision.success ||
    !vision.content ||
    !vision.semanticUnderstandingReady
  ) {
    return vision;
  }

  const commerce =
    await executeCommerceProductIntelligence(
      userPrompt,
      vision.content,
      vision.model,
    );

  let content =
    appendCommerceProductIntelligence(
      vision.content,
      commerce,
    );

  let market:
    | CommerceMarketIntelligence
    | undefined;

  let decision:
    | CommerceDecisionResult
    | undefined;

  if (
    commerce.success &&
    commerce.product.name
  ) {
    market =
      await executeCommerceMarketIntelligence(
        commerce,
      );

    content =
      appendCommerceMarketIntelligence(
        content,
        market,
      );

    /*
     * C145.3
     *
     * Only execute the Decision Engine
     * after C145.1 and C145.2 have produced
     * structured inputs.
     */
    decision =
      executeCommerceDecision(
        commerce,
        market,
      );

    content =
      appendCommerceDecision(
        content,
        decision,
      );
  }

  return {
    ...vision,

    content,

    commerceProductIntelligence:
      commerce,

    commerceMarketIntelligence:
      market,

    commerceDecision:
      decision,
  };
}
