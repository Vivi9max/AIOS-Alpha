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

  error?: string;
}

function appendCommerceIntelligence(
  visionContent: string,
  commerce:
    CommerceProductIntelligence,
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

  if (
    commerce.success
  ) {
    lines.push(
      "",
      "商品",
      `名称：${commerce.product.name || "未确认"}`,
      `类别：${commerce.product.category || "未确认"}`,
      `类型：${commerce.product.type || "未确认"}`,
      "",
      "视觉商业信号",
      `外观：${
        commerce.visualSignals.appearance.join(
          "；",
        ) || "未确认"
      }`,
      `包装：${
        commerce.visualSignals.packaging.join(
          "；",
        ) || "未确认"
      }`,
      `展示方式：${
        commerce.visualSignals.demonstration.join(
          "；",
        ) || "未确认"
      }`,
      `人物动作：${
        commerce.visualSignals.peopleActions.join(
          "；",
        ) || "未确认"
      }`,
      `字幕/文字：${
        commerce.visualSignals.textOverlays.join(
          "；",
        ) || "未确认"
      }`,
      `价格信号：${
        commerce.visualSignals.priceSignals.join(
          "；",
        ) || "未确认"
      }`,
      "",
      "卖点",
      commerce.sellingPoints.length > 0
        ? commerce.sellingPoints
            .map(
              (
                item,
                index,
              ) =>
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
            (
              item,
              index,
            ) =>
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
            (
              item,
              index,
            ) =>
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

  /*
   * C145.1
   *
   * Vision has now produced semantic understanding.
   * The next Runtime layer converts that verified
   * visual understanding into structured commerce
   * intelligence when the request is commerce-related.
   *
   * This layer deliberately does NOT perform:
   * - 1688 supplier discovery
   * - live market pricing
   * - sales-volume claims
   * - competition ranking
   * - profitability claims
   *
   * Those require independent external evidence and
   * belong to C145.2+.
   */
  const commerce =
    await executeCommerceProductIntelligence(
      userPrompt,
      vision.content,
      vision.model,
    );

  return {
    ...vision,

    content:
      appendCommerceIntelligence(
        vision.content,
        commerce,
      ),

    commerceProductIntelligence:
      commerce,
  };
}
