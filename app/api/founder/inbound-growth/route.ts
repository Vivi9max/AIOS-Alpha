
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
} from "@/lib/commercial/c144-inbound-demand-engine";

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
        "Content-Type": "application/json; charset=utf-8",
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
      externalSideEffectExecuted: false,
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
    value.decisionRole === "decision-maker" ||
    value.decisionRole === "influencer"
      ? value.decisionRole
      : "unknown";

  const budgetRange =
    value.budgetRange === "under-500" ||
    value.budgetRange === "500-2000" ||
    value.budgetRange === "2000-plus"
      ? value.budgetRange
      : "unknown";

  const urgency =
    value.urgency === "high" ||
    value.urgency === "medium" ||
    value.urgency === "low"
      ? value.urgency
      : "unknown";

  const sourceChannel =
    value.sourceChannel === "xianyu"
      ? "xianyu"
      : "xiaohongshu";

  return {
    businessType: cleanText(
      value.businessType,
      200,
    ),
    currentAds,
    hasAdData,
    decisionRole,
    budgetRange,
    urgency,
    goal: cleanText(value.goal),
    currentProblem: cleanText(
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

export async function GET(
  request: NextRequest,
) {
  const authError = authorize(request);

  if (authError) {
    return authError;
  }

  try {
    const campaign =
      buildInboundDemandCampaign();

    return jsonResponse({
      success: true,
      code: "C144_INBOUND_CAMPAIGN_READY",
      version: campaign.version,
      status: campaign.status,
      campaign,
      persistenceEnabled: true,
      externalSideEffectExecuted: false,
      nextStep:
        "Review the draft and publish manually through the approved platform interface.",
    });
  } catch (error) {
    return jsonError(
      "C144_INBOUND_CAMPAIGN_ERROR",
      error instanceof Error
        ? error.message
        : "Inbound campaign generation failed.",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const authError = authorize(request);

  if (authError) {
    return authError;
  }

  let body: unknown;

  try {
    body = await request.json();
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
      typeof body.mode === "string"
        ? body.mode
        : "campaign";

    if (mode === "campaign") {
      const input =
        isRecord(body.input)
          ? body.input as Partial<InboundDemandInput>
          : {};

      const campaign =
        buildInboundDemandCampaign(input);

      return jsonResponse({
        success: true,
        code: "C144_INBOUND_CAMPAIGN_GENERATED",
        result: {
          mode,
          campaign,
        },
        persistenceEnabled: true,
        externalSideEffectExecuted: false,
      });
    }

    if (
      mode === "score-lead" ||
      mode === "reply-draft" ||
      mode === "save-lead"
    ) {
      if (!isRecord(body.lead)) {
        return jsonError(
          "C144_INBOUND_LEAD_REQUIRED",
          "The lead field must be a JSON object.",
          400,
        );
      }

      const lead = normalizeLead(body.lead);
      const assessment = scoreInboundLead(lead);
      const replyDraft = buildInboundReplyDraft(
        lead,
        assessment,
      );

      if (mode === "score-lead") {
        return jsonResponse({
          success: true,
          code: "C144_INBOUND_LEAD_SCORED",
          result: {
            mode,
            assessment,
          },
          persistenceEnabled: true,
          externalSideEffectExecuted: false,
        });
      }

      if (mode === "reply-draft") {
        return jsonResponse({
          success: true,
          code: "C144_INBOUND_REPLY_DRAFT_READY",
          result: {
            mode,
            assessment,
            replyDraft,
          },
          persistenceEnabled: true,
          externalSideEffectExecuted: false,
        });
      }

      const record =
        await createInboundLeadRecord({
          lead,
          assessment,
          replyDraft,
          note: cleanText(body.note),
        });

      return jsonResponse({
        success: true,
        code: "C144_INBOUND_LEAD_SAVED",
        result: {
          mode,
          record,
        },
        persistenceEnabled: true,
        externalSideEffectExecuted: false,
      });
    }

    if (mode === "list-leads") {
      const status = isLeadStatus(body.status)
        ? body.status
        : undefined;

      const requestedLimit =
        typeof body.limit === "number"
          ? body.limit
          : 100;

      const records =
        await listInboundLeadRecords({
          status,
          limit: requestedLimit,
        });

      return jsonResponse({
        success: true,
        code: "C144_INBOUND_LEADS_LISTED",
        result: {
          mode,
          records,
          count: records.length,
        },
        persistenceEnabled: true,
        externalSideEffectExecuted: false,
      });
    }

    if (mode === "update-lead") {
      const id = cleanText(body.id, 120);

      if (!id) {
        return jsonError(
          "C144_INBOUND_LEAD_ID_REQUIRED",
          "A lead record ID is required.",
          400,
        );
      }

      const status = isLeadStatus(body.status)
        ? body.status
        : undefined;

      const note =
        typeof body.note === "string"
          ? cleanText(body.note)
          : undefined;

      if (
        status === undefined &&
        note === undefined
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
        code: "C144_INBOUND_LEAD_UPDATED",
        result: {
          mode,
          record,
        },
        persistenceEnabled: true,
        externalSideEffectExecuted: false,
      });
    }

    if (mode === "delete-lead") {
      const id = cleanText(body.id, 120);

      if (!id) {
        return jsonError(
          "C144_INBOUND_LEAD_ID_REQUIRED",
          "A lead record ID is required.",
          400,
        );
      }

      const deleted =
        await deleteInboundLeadRecord(id);

      if (!deleted) {
        return jsonError(
          "C144_INBOUND_LEAD_NOT_FOUND",
          "The lead record was not found.",
          404,
        );
      }

      return jsonResponse({
        success: true,
        code: "C144_INBOUND_LEAD_DELETED",
        result: {
          mode,
          id,
        },
        persistenceEnabled: true,
        externalSideEffectExecuted: false,
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
