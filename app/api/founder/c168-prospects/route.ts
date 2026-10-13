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
      "AIOS C168 Advertising Prospect Discovery",
    version:
      "C168.4.0",
    status:
      "online",
    mode:
      "founder-manual-execution",
    endpoint:
      "/api/founder/c168-prospects",
    execution: {
      method: "POST",
      founderOnly: true,
      externalContactAutomaticallySent:
        false,
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
    purpose:
      "Discover and rank evidence-backed Shenzhen home-improvement businesses for Founder manual advertising-acquisition research.",
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
          "AIOS C168 Advertising Prospect Discovery",
        version:
          "C168.4.0",
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
          "AIOS C168 Advertising Prospect Discovery",
        version:
          "C168.4.0",
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
            qualifiedCandidates,
            manualValidationCandidates,
          };
        },
      );

    const ready =
      result.discovery.success &&
      result.discovery.status ===
        "ready" &&
      result.qualifiedCandidates.length >
        0;

    return json(
      {
        success:
          ready,
        service:
          "AIOS C168 Advertising Prospect Discovery",
        version:
          "C168.4.0",
        code:
          ready
            ? "C168_PROSPECTS_READY"
            : "C168_PROSPECTS_VALIDATION_REQUIRED",
        status:
          ready
            ? "READY"
            : "VALIDATION_REQUIRED",
        mode:
          "founder-manual-execution",

        identity: {
          userId:
            identity.userId,
          isolated: true,
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

        qualifiedCandidates:
          result.qualifiedCandidates,

        manualValidationCandidates:
          result.manualValidationCandidates,

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
          acquisitionSignalRequired:
            true,
          minimumIndependentHostsForQualified:
            2,
          internalAdvertisingPerformanceRequired:
            false,
          founderManualValidationRequired:
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

        integrity: {
          fabricatedProspect:
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
            "Candidate ranking represents research priority only. It does not prove that a business has poor advertising performance, high lead cost, low conversion, or negative ROI.",
        },

        nextAction:
          ready
            ? "Founder人工检查排名最高的候选客户，验证官网、公开广告或内容入口、Offer、咨询路径和真实联系渠道。验证完成前不得把候选对象标记为客户。"
            : "当前没有足够证据支持直接进入客户触达。继续补充公开证据并人工核验候选对象。",

        durationMs:
          Date.now() -
          startedAt,
      },
      ready
        ? 200
        : 422,
    );
  } catch (error) {
    return json(
      {
        success: false,
        service:
          "AIOS C168 Advertising Prospect Discovery",
        version:
          "C168.4.0",
        code:
          "C168_PROSPECTS_ERROR",
        status:
          "ERROR",
        error:
          error instanceof Error
            ? error.message
            : "C168 prospect discovery failed.",
        integrity: {
          fabricatedProspect:
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
