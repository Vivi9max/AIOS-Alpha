import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isFounderRequest,
} from "@/lib/founder/auth";
import {
  executeCommerceMarketIntelligence,
} from "@/lib/runtime/commerce-market-intelligence-runtime";
import {
  executeCommerceDecision,
} from "@/lib/runtime/commerce-decision-runtime";
const TEST_PRODUCT = {
  name: "便携小风扇",
  category: "小家电",
  type: "便携风扇",
};
export async function GET(
  request: NextRequest,
) {
  const startedAt = Date.now();
  if (!isFounderRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code: "FOUNDER_AUTH_REQUIRED",
        error: "Founder access required.",
      },
      {
        status: 401,
      },
    );
  }
  try {
    const commerce = {
      success: true,
      code:
        "C145_1_COMMERCE_PRODUCT_INTELLIGENCE_PASS",
      product: TEST_PRODUCT,
      visualSignals: {
        appearance: [
          "便携式小型风扇外观",
        ],
        packaging: [],
        demonstration: [
          "展示便携使用场景",
        ],
        peopleActions: [
          "手持展示",
        ],
        textOverlays: [],
        priceSignals: [],
      },
      sellingPoints: [
        "便携",
        "小型化",
        "适合移动使用",
      ],
      targetCustomer:
        "需要便携降温设备的人群",
      marketingPattern: {
        hook:
          "直接展示便携产品",
        demonstration:
          "展示产品使用方式",
        emotionalTrigger:
          "便携和即时降温需求",
        purchaseTrigger:
          "方便携带和使用",
      },
      evidence: [
        {
          claim:
            "商品属于便携式小风扇",
          basis:
            "测试商品输入",
          confidence:
            "high" as const,
        },
      ],
      confidence: {
        product: 90,
        sellingPoints: 75,
        price: 0,
        commercialSignal: 75,
      },
      unknowns: [
        "真实售价需要外部证据确认。",
        "真实采购成本需要1688证据确认。",
      ],
      nextActions: [],
      source: {
        type:
          "video-vision" as const,
        model:
          "C145.3 regression",
      },
    };
    const market =
      await executeCommerceMarketIntelligence(
        commerce,
      );
    const decision =
      executeCommerceDecision(
        commerce,
        market,
      );
    const latencyMs =
      Date.now() - startedAt;
    const checks = {
      founderAuth: true,
      productInput:
        commerce.success &&
        commerce.product.name ===
          TEST_PRODUCT.name,
      marketRetrieval:
        market.retrieval.market.success,
      priceRetrieval:
        market.retrieval.price.success,
      supplyRetrieval:
        market.retrieval.supply1688.success,
      marketEvidence:
        market.marketEvidence.length > 0,
      supplyEvidence:
        market.supplyEvidence.length > 0,
      priceEvidence:
        market.priceSignals.length > 0,
      competitorEvidence:
        market.competitorSignals.length > 0,
      supplierEvidence:
        market.supplierSignals.length > 0,
      sourceVerification:
        market.verification.overallVerified,
      decisionEngine:
        decision.success,
      decisionScore:
        decision.decision.score > 0,
      priorityGenerated:
        decision.decision.testPriority !==
          "unknown",
      boundariesPresent:
        decision.boundaries.length > 0,
    };
    const finalPass =
      Object.values(checks).every(
        Boolean,
      );
    return NextResponse.json(
      {
        success: finalPass,
        verified: finalPass,
        code:
          finalPass
            ? "C145_3_COMMERCE_DECISION_REGRESSION_PASS"
            : "C145_3_COMMERCE_DECISION_REGRESSION_FAILED",
        runtime: "aios-alpha",
        runtimeVersion: "0.5",
        latencyMs,
        testProduct: TEST_PRODUCT,
        pipeline: {
          founderAuth:
            checks.founderAuth,
          productInput:
            checks.productInput,
          marketRetrieval:
            checks.marketRetrieval,
          priceRetrieval:
            checks.priceRetrieval,
          supplyRetrieval:
            checks.supplyRetrieval,
          marketEvidence:
            checks.marketEvidence,
          supplyEvidence:
            checks.supplyEvidence,
          priceEvidence:
            checks.priceEvidence,
          competitorEvidence:
            checks.competitorEvidence,
          supplierEvidence:
            checks.supplierEvidence,
          sourceVerification:
            checks.sourceVerification,
          decisionEngine:
            checks.decisionEngine,
          decisionScore:
            checks.decisionScore,
          priorityGenerated:
            checks.priorityGenerated,
          boundariesPresent:
            checks.boundariesPresent,
          finalRegression:
            finalPass,
        },
        evidence: {
          market:
            market.marketEvidence.length,
          supply:
            market.supplyEvidence.length,
          prices:
            market.priceSignals.length,
          competitors:
            market.competitorSignals.length,
          suppliers:
            market.supplierSignals.length,
        },
        decision: {
          code:
            decision.code,
          success:
            decision.success,
          testPriority:
            decision.decision.testPriority,
          score:
            decision.decision.score,
          rationale:
            decision.decision.rationale,
          priceAnalysis:
            decision.priceAnalysis,
          competitionAnalysis:
            decision.competitionAnalysis,
          supplyAnalysis:
            decision.supplyAnalysis,
          contentAnalysis:
            decision.contentAnalysis,
        },
        verification:
          decision.verification,
        unknowns:
          decision.unknowns,
        nextActions:
          decision.nextActions,
        boundaries:
          decision.boundaries,
        retrieval:
          market.retrieval,
      },
      {
        status:
          finalPass ? 200 : 500,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C145_3_COMMERCE_DECISION_REGRESSION_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Unknown C145.3 regression error.",
        latencyMs:
          Date.now() - startedAt,
      },
      {
        status: 500,
      },
    );
  }
}
