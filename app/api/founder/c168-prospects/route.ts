import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderConfigured,
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  ensureC168AdAcquisitionLoop,
} from "@/lib/commercial/c168-ad-acquisition-loop";

import {
  discoverC168Prospects,
} from "@/lib/commercial/c168-prospect-discovery";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export const maxDuration = 60;

const SERVICE_NAME =
  "AIOS C168 Advertising Lead Decision Engine";

const SERVICE_VERSION =
  "C168.5.2";

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      ...body,
      timestamp: Date.now(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

export async function GET() {
  return json({
    success: true,
    service:
      SERVICE_NAME,
    version:
      SERVICE_VERSION,
    status:
      "online",
    mode:
      "inbound-first-selective-outbound",
    endpoint:
      "/api/founder/c168-prospects",

    execution: {
      method:
        "POST",
      founderOnly:
        true,
      automaticMarketDiscovery:
        true,
      automaticCommercialRouting:
        true,
      automaticBuyingSignalAnalysis:
        true,
      externalContactAutomaticallySent:
        false,
      founderApprovalRequiredForOutbound:
        true,
      advertisingAccountAccess:
        false,
      revenueAutomaticallyRecorded:
        false,
    },

    target: {
      geography:
        "深圳",
      industries: [
        "家装",
        "旧房局改",
        "全屋定制",
      ],
    },

    strategy: {
      primaryChannel:
        "inbound",
      secondaryChannel:
        "selective-outbound",
      objective:
        "Automatically reduce broad market evidence into a small set of commercial actions without requiring Founder to manually review every prospect.",
    },

    routing: [
      "selective-outbound",
      "inbound-opportunity",
      "monitor",
      "reject",
    ],

    purpose:
      "Discover, verify, score and route evidence-backed Shenzhen home-improvement opportunities into inbound, selective outbound, monitoring or automatic rejection.",
  });
}

export async function POST(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (!isFounderConfigured()) {
    return json(
      {
        success: false,
        service:
          SERVICE_NAME,
        version:
          SERVICE_VERSION,
        status:
          "not-configured",
        error:
          "Founder Access Key is not configured.",
      },
      503,
    );
  }

  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,
        service:
          SERVICE_NAME,
        version:
          SERVICE_VERSION,
        status:
          "unauthorized",
        error:
          "Founder authentication required.",
      },
      401,
    );
  }

  try {
    const identity =
      resolveAlphaIdentity(
        request,
      );

    const result =
      await runWithUserContext(
        identity.userId,
        async () => {
          const loop =
            await ensureC168AdAcquisitionLoop();

          const discovery =
            await discoverC168Prospects();

          const selectiveOutboundCandidates =
            discovery.candidates.filter(
              (candidate) =>
                candidate
                  .commercialDecision
                  .action ===
                "selective-outbound",
            );

          const inboundOpportunityCandidates =
            discovery.candidates.filter(
              (candidate) =>
                candidate
                  .commercialDecision
                  .action ===
                "inbound-opportunity",
            );

          const monitorCandidates =
            discovery.candidates.filter(
              (candidate) =>
                candidate
                  .commercialDecision
                  .action ===
                "monitor",
            );

          const qualifiedCandidates =
            discovery.candidates.filter(
              (candidate) =>
                candidate.qualification ===
                "qualified",
            );

          const manualValidationCandidates =
            discovery.candidates.filter(
              (candidate) =>
                candidate.qualification ===
                "needs-manual-validation",
            );

          return {
            loop,
            discovery,
            selectiveOutboundCandidates,
            inboundOpportunityCandidates,
            monitorCandidates,
            qualifiedCandidates,
            manualValidationCandidates,
          };
        },
      );

    const hasCommercialOpportunity =
      result.discovery.success &&
      result.discovery.status ===
        "ready" &&
      (
        result
          .selectiveOutboundCandidates
          .length > 0 ||
        result
          .inboundOpportunityCandidates
          .length > 0
      );

    const hasMarketEvidence =
      result.discovery.success &&
      result.discovery.status ===
        "ready" &&
      result.discovery.candidates.length >
        0;

    const responseStatus =
      hasCommercialOpportunity
        ? "ACTION_READY"
        : hasMarketEvidence
          ? "MONITORING"
          : "NO_ACTIONABLE_OPPORTUNITY";

    const responseCode =
      hasCommercialOpportunity
        ? "C168_COMMERCIAL_ACTION_READY"
        : hasMarketEvidence
          ? "C168_MARKET_MONITORING"
          : "C168_NO_ACTIONABLE_OPPORTUNITY";

    return json(
      {
        success:
          hasMarketEvidence,
        service:
          SERVICE_NAME,
        version:
          SERVICE_VERSION,
        code:
          responseCode,
        status:
          responseStatus,
        mode:
          "inbound-first-selective-outbound",

        identity: {
          userId:
            identity.userId,
          isolated:
            true,
        },

        commercialLoop: {
          success:
            result.loop.success,
          reused:
            result.loop.reused,
          objectiveId:
            result.loop.objectiveId,
          outcomeId:
            result.loop.outcomeId,
          taskId:
            result.loop.taskId,
          milestoneId:
            result.loop.milestoneId,
          objectiveTitle:
            result.loop.objectiveTitle,
          nextAction:
            result.loop.nextAction,
        },

        discovery: {
          success:
            result.discovery.success,
          status:
            result.discovery.status,
          targetMarket:
            result.discovery.targetMarket,
          geography:
            result.discovery.geography,
          sourceCount:
            result.discovery.sourceCount,
          independentHosts:
            result.discovery.independentHosts,
          candidateCount:
            result.discovery.candidates.length,

          selectiveOutboundCount:
            result.discovery
              .selectiveOutboundCount,

          inboundOpportunityCount:
            result.discovery
              .inboundOpportunityCount,

          monitorCount:
            result.discovery.monitorCount,

          rejectedCount:
            result.discovery.rejectedCount,

          qualifiedCount:
            result.qualifiedCandidates.length,

          manualValidationCount:
            result
              .manualValidationCandidates
              .length,

          conclusion:
            result.discovery.conclusion,

          nextStep:
            result.discovery.nextStep,
        },

        candidates:
          result.discovery.candidates,

        selectiveOutboundCandidates:
          result.selectiveOutboundCandidates,

        inboundOpportunityCandidates:
          result.inboundOpportunityCandidates,

        monitorCandidates:
          result.monitorCandidates,

        qualifiedCandidates:
          result.qualifiedCandidates,

        manualValidationCandidates:
          result.manualValidationCandidates,

        decisionPolicy: {
          primaryChannel:
            "inbound",

          secondaryChannel:
            "selective-outbound",

          commercialActions: [
            "selective-outbound",
            "inbound-opportunity",
            "monitor",
            "reject",
          ],

          evidenceScoreIsNotPurchaseIntent:
            true,

          buyingSignalIsNotConfirmedDemand:
            true,

          advertisingPerformanceIsNotInferred:
            true,

          lowValueCandidatesAutomaticallyRejected:
            true,

          monitorCandidatesRequireFounderReview:
            false,

          inboundOpportunitiesRequireFounderProspectReview:
            false,

          selectiveOutboundRequiresFounderApproval:
            true,

          externalContactAutomaticallySent:
            false,
        },

        qualificationPolicy: {
          geography:
            "深圳",

          allowedIndustries: [
            "家装",
            "旧房局改",
            "全屋定制",
          ],

          businessIdentityRequired:
            true,

          localBusinessSignalRequired:
            true,

          commercialActionScoreRequired:
            true,

          buyingSignalAnalysisEnabled:
            true,

          evidenceConfidenceRequired:
            true,

          acquisitionReadinessAnalysisEnabled:
            true,

          internalAdvertisingPerformanceRequired:
            false,

          founderManualValidationForEveryCandidate:
            false,

          founderApprovalForSelectiveOutbound:
            true,
        },

        commercialOffer: {
          primary: {
            name:
              "48小时广告获客诊断",
            priceCny:
              399,
          },

          upgrade: {
            name:
              "7天广告获客验证",
            priceCny:
              699,
          },
        },

        founderWorkload: {
          reviewAllCandidates:
            false,

          reviewSelectiveOutboundOnly:
            true,

          selectiveOutboundReviewCount:
            result
              .selectiveOutboundCandidates
              .length,

          inboundOpportunityCount:
            result
              .inboundOpportunityCandidates
              .length,

          automaticallyMonitoredCount:
            result.monitorCandidates.length,

          automaticallyRejectedCount:
            result.discovery.rejectedCount,

          objective:
            "Founder should review only the small number of high-value selective outbound decisions while AIOS routes the rest automatically.",
        },

        integrity: {
          fabricatedProspect:
            false,

          fabricatedBuyingSignal:
            false,

          fabricatedAdvertisingPerformance:
            false,

          fabricatedContact:
            false,

          contactWasSent:
            false,

          fabricatedCustomer:
            false,

          fabricatedPayment:
            false,

          fabricatedRevenue:
            false,

          advertisingAccountAccessed:
            false,

          note:
            "Commercial Action Score represents AIOS action priority only. Buying Signals are public research signals, not proof of purchase intent. AIOS does not infer poor advertising performance, high lead cost, low conversion or negative ROI from public evidence.",
        },

        nextAction:
          result
            .selectiveOutboundCandidates
            .length > 0
            ? `AIOS已自动筛选出${result.selectiveOutboundCandidates.length}个Selective Outbound对象。Founder只需审核这些高优先级对象并决定是否批准触达；其余候选不需要逐家人工审核。`
            : result
                  .inboundOpportunityCandidates
                  .length > 0
              ? `当前没有达到Selective Outbound阈值的对象。AIOS已识别${result.inboundOpportunityCandidates.length}个Inbound Opportunity，应优先把重复出现的市场问题转化为获客内容、诊断入口和Offer，而不是批量主动联系。`
              : result.monitorCandidates.length >
                    0
                ? "当前没有值得Founder主动介入的商业机会。AIOS保留市场观察对象，等待新的Buying Signal后重新评分。"
                : "当前没有足够证据支持商业行动。AIOS不生成虚假客户或虚假购买意愿。",

        durationMs:
          Date.now() -
          startedAt,
      },
      hasMarketEvidence
        ? 200
        : 422,
    );
  } catch (error) {
    return json(
      {
        success: false,
        service:
          SERVICE_NAME,
        version:
          SERVICE_VERSION,
        code:
          "C168_LEAD_DECISION_ERROR",
        status:
          "ERROR",
        error:
          error instanceof Error
            ? error.message
            : "C168 advertising lead decision execution failed.",

        integrity: {
          fabricatedProspect:
            false,
          fabricatedBuyingSignal:
            false,
          fabricatedAdvertisingPerformance:
            false,
          fabricatedContact:
            false,
          fabricatedCustomer:
            false,
          fabricatedRevenue:
            false,
        },

        durationMs:
          Date.now() -
          startedAt,
      },
      500,
    );
  }
}
