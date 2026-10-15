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
  buildInboundDemandCampaign,
  buildInboundReplyDraft,
  scoreInboundLead,
} from "@/lib/commercial/c144-inbound-demand-engine";

import type {
  InboundDemandInput,
  InboundLead,
  InboundMarketContext,
} from "@/lib/commercial/c144-inbound-demand-engine";

import {
  discoverC168Prospects,
} from "@/lib/commercial/c168-prospect-discovery";

import type {
  C168ProspectCandidate,
  C168ProspectDiscoveryResult,
} from "@/lib/commercial/c168-prospect-discovery";

import {
  optimizeC168InboundCampaign,
} from "@/lib/commercial/c168-inbound-opportunity";

import {
  createInboundLeadRecord,
  deleteInboundLeadRecord,
  listInboundLeadRecords,
  updateInboundLeadRecord,
} from "@/lib/commercial/c144-inbound-lead-store";

import type {
  InboundLeadStatus,
} from "@/lib/commercial/c144-inbound-lead-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SERVICE_VERSION =
  "C168.7.0";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(
    body,
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

function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse {
  return jsonResponse(
    {
      success: false,
      code,
      message,
      externalSideEffectExecuted:
        false,
    },
    status,
  );
}

function authorize(
  request: NextRequest,
): NextResponse | null {
  if (!isFounderConfigured()) {
    return jsonError(
      "FOUNDER_ACCESS_NOT_CONFIGURED",
      "Founder access is not configured.",
      503,
    );
  }

  if (!isFounderRequest(request)) {
    return jsonError(
      "FOUNDER_AUTH_REQUIRED",
      "Founder authentication required.",
      401,
    );
  }

  return null;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function cleanText(
  value: unknown,
  maxLength = 2000,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function uniqueStrings(
  values: string[],
  limit = 12,
): string[] {
  const seen =
    new Set<string>();

  const result: string[] = [];

  for (const value of values) {
    const text =
      cleanText(
        value,
        500,
      );

    if (!text) {
      continue;
    }

    const key =
      text.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(text);

    if (
      result.length >=
      limit
    ) {
      break;
    }
  }

  return result;
}

function normalizeLead(
  value: Record<string, unknown>,
): InboundLead {
  const currentAds =
    value.currentAds === "yes" ||
    value.currentAds === "no"
      ? value.currentAds
      : "unknown";

  const hasAdData =
    value.hasAdData === "yes" ||
    value.hasAdData === "no"
      ? value.hasAdData
      : "unknown";

  const decisionRole =
    value.decisionRole ===
      "decision-maker" ||
    value.decisionRole ===
      "influencer"
      ? value.decisionRole
      : "unknown";

  const budgetRange =
    value.budgetRange ===
      "under-500" ||
    value.budgetRange ===
      "500-2000" ||
    value.budgetRange ===
      "2000-plus"
      ? value.budgetRange
      : "unknown";

  const urgency =
    value.urgency === "high" ||
    value.urgency === "medium" ||
    value.urgency === "low"
      ? value.urgency
      : "unknown";

  const sourceChannel =
    value.sourceChannel ===
    "xianyu"
      ? "xianyu"
      : "xiaohongshu";

  return {
    businessType:
      cleanText(
        value.businessType,
        200,
      ),
    currentAds,
    hasAdData,
    decisionRole,
    budgetRange,
    urgency,
    goal: cleanText(
      value.goal,
    ),
    currentProblem:
      cleanText(
        value.currentProblem,
      ),
    sourceChannel,
  };
}

function isLeadStatus(
  value: unknown,
): value is InboundLeadStatus {
  return (
    value === "new" ||
    value === "follow-up" ||
    value === "converted" ||
    value === "closed"
  );
}

function inboundCandidates(
  discovery:
    C168ProspectDiscoveryResult,
): C168ProspectCandidate[] {
  return discovery.candidates.filter(
    (candidate) =>
      candidate
        .commercialDecision
        .action ===
      "inbound-opportunity",
  );
}

function buildVerifiedProblems(
  candidates:
    C168ProspectCandidate[],
): string[] {
  return uniqueStrings(
    candidates.flatMap(
      (candidate) =>
        candidate
          .diagnosticHypotheses,
    ),
  );
}

function buildBuyingSignals(
  candidates:
    C168ProspectCandidate[],
): string[] {
  return uniqueStrings(
    candidates.flatMap(
      (candidate) =>
        candidate.buyingSignals,
    ),
  );
}

function buildAcquisitionSignals(
  candidates:
    C168ProspectCandidate[],
): string[] {
  return uniqueStrings(
    candidates.flatMap(
      (candidate) =>
        candidate
          .acquisitionSignals,
    ),
  );
}

function buildDiagnosticHypotheses(
  candidates:
    C168ProspectCandidate[],
): string[] {
  return uniqueStrings(
    candidates.flatMap(
      (candidate) =>
        candidate
          .diagnosticHypotheses,
    ),
  );
}

function buildMarketContext(
  discovery:
    C168ProspectDiscoveryResult,
):
  | InboundMarketContext
  | undefined {
  const candidates =
    inboundCandidates(
      discovery,
    );

  if (
    candidates.length === 0
  ) {
    return undefined;
  }

  return {
    source:
      "c168-market-intelligence",

    market:
      discovery.targetMarket,

    geography:
      discovery.geography,

    verifiedProblems:
      buildVerifiedProblems(
        candidates,
      ),

    buyingSignals:
      buildBuyingSignals(
        candidates,
      ),

    acquisitionSignals:
      buildAcquisitionSignals(
        candidates,
      ),

    diagnosticHypotheses:
      buildDiagnosticHypotheses(
        candidates,
      ),

    evidenceBoundary:
      "This market context is derived only from public evidence attached to C168 inbound-opportunity candidates. It can support market-level content hypotheses, but it does not prove that any specific business has poor advertising performance, high lead cost, low conversion, negative ROI, budget, or purchase intent.",
  };
}

function mergeMarketContext(
  input:
    Partial<InboundDemandInput>,
  generatedContext:
    | InboundMarketContext
    | undefined,
): Partial<InboundDemandInput> {
  if (!generatedContext) {
    return input;
  }

  return {
    ...input,
    marketContext:
      generatedContext,
  };
}

function buildDiscoverySummary(
  discovery:
    C168ProspectDiscoveryResult,
) {
  const candidates =
    inboundCandidates(
      discovery,
    );

  return {
    success:
      discovery.success,

    status:
      discovery.status,

    targetMarket:
      discovery.targetMarket,

    geography:
      discovery.geography,

    sourceCount:
      discovery.sourceCount,

    independentHosts:
      discovery.independentHosts,

    candidateCount:
      discovery.candidates.length,

    inboundOpportunityCount:
      candidates.length,

    selectiveOutboundCount:
      discovery
        .selectiveOutboundCount,

    monitorCount:
      discovery.monitorCount,

    rejectedCount:
      discovery.rejectedCount,

    conclusion:
      discovery.conclusion,

    nextStep:
      discovery.nextStep,

    integrity:
      discovery.integrity,
  };
}

async function buildMarketDrivenCampaign(
  input:
    Partial<InboundDemandInput> = {},
) {
  const discovery =
    await discoverC168Prospects();

  const marketContext =
    buildMarketContext(
      discovery,
    );

  const campaign =
    buildInboundDemandCampaign(
      mergeMarketContext(
        input,
        marketContext,
      ),
    );

  const optimized =
    optimizeC168InboundCampaign(
      campaign,
    );

  return {
    campaign:
      optimized.campaign,

    contentOpportunities:
      optimized
        .contentOpportunities,

    discovery,

    marketContextApplied:
      Boolean(
        marketContext,
      ),
  };
}

export async function GET(
  request: NextRequest,
) {
  const authError =
    authorize(request);

  if (authError) {
    return authError;
  }

  try {
    const result =
      await buildMarketDrivenCampaign();

    return jsonResponse({
      success: true,

      code:
        result
          .marketContextApplied
          ? "C168_INBOUND_MARKET_CAMPAIGN_READY"
          : "C168_INBOUND_SAFE_FALLBACK_READY",

      version:
        SERVICE_VERSION,

      engineVersion:
        result.campaign.version,

      status:
        result.campaign.status,

      campaign:
        result.campaign,

      contentOpportunities:
        result
          .contentOpportunities,

      marketIntelligence:
        buildDiscoverySummary(
          result.discovery,
        ),

      marketContextApplied:
        result
          .marketContextApplied,

      contentMode:
        result
          .campaign
          .contentStrategy
          ?.mode ??
        "general-safe-fallback",

      persistenceEnabled:
        true,

      externalSideEffectExecuted:
        false,

      externalPublishingExecuted:
        false,

      nextStep:
        result
          .marketContextApplied
          ? "Review the primary inbound content opportunity and backup opportunity, then publish the primary asset manually through the approved platform interface."
          : "No reliable C168 inbound opportunity was available. Review the safe fallback drafts before any manual publication.",
    });
  } catch (error) {
    return jsonError(
      "C168_INBOUND_CAMPAIGN_ERROR",
      error instanceof Error
        ? error.message
        : "Market-driven inbound campaign generation failed.",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const authError =
    authorize(request);

  if (authError) {
    return authError;
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return jsonError(
      "C144_INBOUND_INVALID_JSON",
      "Request body must be valid JSON.",
      400,
    );
  }

  if (!isRecord(body)) {
    return jsonError(
      "C144_INBOUND_INVALID_BODY",
      "Request body must be a JSON object.",
      400,
    );
  }

  try {
    const mode =
      typeof body.mode ===
      "string"
        ? body.mode
        : "campaign";

    if (
      mode === "campaign"
    ) {
      const input =
        isRecord(
          body.input,
        )
          ? (body.input as Partial<InboundDemandInput>)
          : {};

      const result =
        await buildMarketDrivenCampaign(
          input,
        );

      return jsonResponse({
        success: true,

        code:
          result
            .marketContextApplied
            ? "C168_INBOUND_MARKET_CAMPAIGN_GENERATED"
            : "C168_INBOUND_SAFE_FALLBACK_GENERATED",

        version:
          SERVICE_VERSION,

        result: {
          mode,

          campaign:
            result.campaign,

          contentOpportunities:
            result
              .contentOpportunities,

          marketIntelligence:
            buildDiscoverySummary(
              result.discovery,
            ),

          marketContextApplied:
            result
              .marketContextApplied,

          contentMode:
            result
              .campaign
              .contentStrategy
              ?.mode ??
            "general-safe-fallback",
        },

        persistenceEnabled:
          true,

        externalSideEffectExecuted:
          false,

        externalPublishingExecuted:
          false,
      });
    }

    if (
      mode === "score-lead" ||
      mode === "reply-draft" ||
      mode === "save-lead"
    ) {
      if (
        !isRecord(
          body.lead,
        )
      ) {
        return jsonError(
          "C144_INBOUND_LEAD_REQUIRED",
          "The lead field must be a JSON object.",
          400,
        );
      }

      const lead =
        normalizeLead(
          body.lead,
        );

      const assessment =
        scoreInboundLead(
          lead,
        );

      const replyDraft =
        buildInboundReplyDraft(
          lead,
          assessment,
        );

      if (
        mode ===
        "score-lead"
      ) {
        return jsonResponse({
          success: true,

          code:
            "C144_INBOUND_LEAD_SCORED",

          version:
            SERVICE_VERSION,

          result: {
            mode,
            assessment,
          },

          persistenceEnabled:
            true,

          externalSideEffectExecuted:
            false,
        });
      }

      if (
        mode ===
        "reply-draft"
      ) {
        return jsonResponse({
          success: true,

          code:
            "C144_INBOUND_REPLY_DRAFT_READY",

          version:
            SERVICE_VERSION,

          result: {
            mode,
            assessment,
            replyDraft,
          },

          persistenceEnabled:
            true,

          externalSideEffectExecuted:
            false,
        });
      }

      const record =
        await createInboundLeadRecord(
          {
            lead,
            assessment,
            replyDraft,
            note:
              cleanText(
                body.note,
              ),
          },
        );

      return jsonResponse({
        success: true,

        code:
          "C144_INBOUND_LEAD_SAVED",

        version:
          SERVICE_VERSION,

        result: {
          mode,
          record,
        },

        persistenceEnabled:
          true,

        externalSideEffectExecuted:
          false,
      });
    }

    if (
      mode ===
      "list-leads"
    ) {
      const status =
        isLeadStatus(
          body.status,
        )
          ? body.status
          : undefined;

      const requestedLimit =
        typeof body.limit ===
        "number"
          ? body.limit
          : 100;

      const records =
        await listInboundLeadRecords(
          {
            status,
            limit:
              requestedLimit,
          },
        );

      return jsonResponse({
        success: true,

        code:
          "C144_INBOUND_LEADS_LISTED",

        version:
          SERVICE_VERSION,

        result: {
          mode,
          records,
          count:
            records.length,
        },

        persistenceEnabled:
          true,

        externalSideEffectExecuted:
          false,
      });
    }

    if (
      mode ===
      "update-lead"
    ) {
      const id =
        cleanText(
          body.id,
          120,
        );

      if (!id) {
        return jsonError(
          "C144_INBOUND_LEAD_ID_REQUIRED",
          "A lead record ID is required.",
          400,
        );
      }

      const status =
        isLeadStatus(
          body.status,
        )
          ? body.status
          : undefined;

      const note =
        typeof body.note ===
        "string"
          ? cleanText(
              body.note,
            )
          : undefined;

      if (
        status ===
          undefined &&
        note ===
          undefined
      ) {
        return jsonError(
          "C144_INBOUND_NO_UPDATES",
          "Provide a valid status or note.",
          400,
        );
      }

      const record =
        await updateInboundLeadRecord(
          id,
          {
            status,
            note,
          },
        );

      if (!record) {
        return jsonError(
          "C144_INBOUND_LEAD_NOT_FOUND",
          "The lead record was not found.",
          404,
        );
      }

      return jsonResponse({
        success: true,

        code:
          "C144_INBOUND_LEAD_UPDATED",

        version:
          SERVICE_VERSION,

        result: {
          mode,
          record,
        },

        persistenceEnabled:
          true,

        externalSideEffectExecuted:
          false,
      });
    }

    if (
      mode ===
      "delete-lead"
    ) {
      const id =
        cleanText(
          body.id,
          120,
        );

      if (!id) {
        return jsonError(
          "C144_INBOUND_LEAD_ID_REQUIRED",
          "A lead record ID is required.",
          400,
        );
      }

      const deleted =
        await deleteInboundLeadRecord(
          id,
        );

      if (!deleted) {
        return jsonError(
          "C144_INBOUND_LEAD_NOT_FOUND",
          "The lead record was not found.",
          404,
        );
      }

      return jsonResponse({
        success: true,

        code:
          "C144_INBOUND_LEAD_DELETED",

        version:
          SERVICE_VERSION,

        result: {
          mode,
          id,
        },

        persistenceEnabled:
          true,

        externalSideEffectExecuted:
          false,
      });
    }

    return jsonError(
      "C144_INBOUND_UNSUPPORTED_MODE",
      "Unsupported mode. Use campaign, score-lead, reply-draft, save-lead, list-leads, update-lead, or delete-lead.",
      400,
    );
  } catch (error) {
    return jsonError(
      "C144_INBOUND_OPERATION_ERROR",
      error instanceof Error
        ? error.message
        : "Inbound operation failed.",
      500,
    );
  }
}
