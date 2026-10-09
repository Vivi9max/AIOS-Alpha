import "server-only";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  resolveAlphaIdentity,
} from "@/lib/auth/identity";
import {
  runWithUserContext,
} from "@/lib/runtime/request-context";
import {
  buildInboundDemandCampaign,
  buildInboundReplyDraft,
  scoreInboundLead,
} from "@/lib/commercial/c144-inbound-demand-engine";
import type {
  InboundDemandInput,
  InboundLead,
} from "@/lib/commercial/c144-inbound-demand-engine";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function jsonError(
  code: string,
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
      externalSideEffectExecuted: false,
    },
    {
      status,
    },
  );
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
export async function GET(
  request: NextRequest,
) {
  const startedAt = Date.now();
  const identity = resolveAlphaIdentity(request);
  try {
    const result = await runWithUserContext(
      identity.userId,
      async () => buildInboundDemandCampaign(),
    );
    return NextResponse.json({
      success: true,
      code: "C144_INBOUND_CAMPAIGN_READY",
      version: result.version,
      status: result.status,
      campaign: result,
      latencyMs: Date.now() - startedAt,
      externalSideEffectExecuted: false,
      persistenceEnabled: false,
      nextStep:
        "Review the draft, confirm the offer and publish manually through the approved platform interface.",
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
  const startedAt = Date.now();
  const identity = resolveAlphaIdentity(request);
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
    const result = await runWithUserContext(
      identity.userId,
      async () => {
        const mode =
          typeof body.mode === "string"
            ? body.mode
            : "campaign";
        if (mode === "campaign") {
          const input =
            isRecord(body.input)
              ? body.input as Partial<InboundDemandInput>
              : {};
          return {
            mode,
            campaign: buildInboundDemandCampaign(input),
          };
        }
        if (mode === "score-lead") {
          if (!isRecord(body.lead)) {
            throw new Error(
              "The lead field must be a JSON object.",
            );
          }
          const lead =
            body.lead as Partial<InboundLead>;
          return {
            mode,
            assessment: scoreInboundLead(lead),
          };
        }
        if (mode === "reply-draft") {
          if (!isRecord(body.lead)) {
            throw new Error(
              "The lead field must be a JSON object.",
            );
          }
          const lead =
            body.lead as Partial<InboundLead>;
          const assessment =
            scoreInboundLead(lead);
          return {
            mode,
            assessment,
            replyDraft: buildInboundReplyDraft(
              lead,
              assessment,
            ),
          };
        }
        throw new Error(
          "Unsupported mode. Use campaign, score-lead, or reply-draft.",
        );
      },
    );
    return NextResponse.json({
      success: true,
      code: "C144_INBOUND_OPERATION_READY",
      result,
      latencyMs: Date.now() - startedAt,
      externalSideEffectExecuted: false,
      persistenceEnabled: false,
      nextStep:
        "Review the result before using it externally. This endpoint does not publish posts, send messages, or record payments.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Inbound operation failed.";
    return jsonError(
      "C144_INBOUND_OPERATION_ERROR",
      message,
      400,
    );
  }
}
