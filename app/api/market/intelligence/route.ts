import { NextRequest, NextResponse } from "next/server";
import { analyzeMarketRequest } from "@/lib/runtime/market/market-router";
import type { MarketRegion } from "@/lib/runtime/market/market-types";
import { AIOS_USER_COOKIE, resolveAlphaIdentity } from "@/lib/auth/identity";
import { runWithUserContext } from "@/lib/runtime/request-context";
import {
  reserveMarketResearchReport,
  releaseMarketResearchReportReservation,
} from "@/lib/billing/market-research-usage";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function responseHeaders() {
  return {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
}
function applyIdentityCookie(response: NextResponse, userId: string) {
  response.cookies.set(AIOS_USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
function jsonError(
  status: number,
  code: string,
  message: string,
  userId: string,
  startedAt: number,
) {
  return applyIdentityCookie(
    NextResponse.json(
      {
        success: false,
        verified: false,
        code,
        message,
        publicBoundary: "C147.21",
        dataIsolated: true,
        latencyMs: Date.now() - startedAt,
        timestamp: Date.now(),
      },
      { status, headers: responseHeaders() },
    ),
    userId,
  );
}
function normalizeMarket(value: unknown): MarketRegion | undefined {
  if (value === "us" || value === "hk" || value === "cn") {
    return value;
  }
  return undefined;
}
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const identity = resolveAlphaIdentity(request);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(
      400,
      "C147_21_INVALID_REQUEST",
      "Request body must be valid JSON.",
      identity.userId,
      startedAt,
    );
  }
  if (!body || typeof body !== "object") {
    return jsonError(
      400,
      "C147_21_INVALID_REQUEST",
      "Request body must be an object.",
      identity.userId,
      startedAt,
    );
  }
  const input = body as Record<string, unknown>;
  const symbol =
    typeof input.symbol === "string"
      ? input.symbol.trim().toUpperCase()
      : "";
  if (!symbol) {
    return jsonError(
      400,
      "C147_21_INVALID_REQUEST",
      "symbol is required.",
      identity.userId,
      startedAt,
    );
  }
  if (symbol.length > 32) {
    return jsonError(
      400,
      "C147_21_INVALID_REQUEST",
      "symbol is too long.",
      identity.userId,
      startedAt,
    );
  }
  const market = normalizeMarket(input.market);
  let reservation: Awaited<ReturnType<typeof reserveMarketResearchReport>>;
  try {
    reservation = await runWithUserContext(identity.userId, () =>
      reserveMarketResearchReport(),
    );
  } catch {
    return jsonError(
      503,
      "MARKET_RESEARCH_ACCESS_UNAVAILABLE",
      "Market Research access could not be verified because durable quota storage is unavailable.",
      identity.userId,
      startedAt,
    );
  }
  if (!reservation.allowed) {
    return applyIdentityCookie(
      NextResponse.json(
        {
          success: false,
          verified: false,
          code: "MARKET_RESEARCH_LIMIT_REACHED",
          message: "The monthly market research report limit has been reached.",
          publicBoundary: "C147.21",
          dataIsolated: true,
          marketResearchUsage: {
            used: reservation.used,
            limit: reservation.limit,
            remaining: reservation.remaining,
          },
          timestamp: Date.now(),
        },
        { status: 429, headers: responseHeaders() },
      ),
      identity.userId,
    );
  }
  let reservationReleaseAttempted = false;
  const releaseReservationOnce = async () => {
    if (reservationReleaseAttempted) {
      return;
    }
    reservationReleaseAttempted = true;
    try {
      await runWithUserContext(identity.userId, () =>
        releaseMarketResearchReportReservation(),
      );
    } catch {
      // Keep the primary request result; failed releases require operational reconciliation.
    }
  };
  try {
    const result = await runWithUserContext(identity.userId, () =>
      analyzeMarketRequest({
        symbol,
        market,
        mode: "full",
        query: typeof input.query === "string" ? input.query : null,
      }),
    );
    if (!result.success) {
      await releaseReservationOnce();
    }
    return applyIdentityCookie(
      NextResponse.json(
        {
          ...result,
          publicBoundary: "C147.21",
          dataIsolated: true,
          latencyMs: Date.now() - startedAt,
          timestamp: Date.now(),
          marketResearchUsage: result.success
            ? {
                used: reservation.used,
                limit: reservation.limit,
                remaining: reservation.remaining,
              }
            : undefined,
        },
        {
          status: result.success ? 200 : 502,
          headers: responseHeaders(),
        },
      ),
      identity.userId,
    );
  } catch (error) {
    await releaseReservationOnce();
    return applyIdentityCookie(
      NextResponse.json(
        {
          success: false,
          verified: false,
          code: "C147_21_MARKET_INTELLIGENCE_ERROR",
          message: "Market Intelligence is temporarily unavailable.",
          error:
            error instanceof Error
              ? error.message
              : "Unknown market intelligence error.",
          publicBoundary: "C147.21",
          dataIsolated: true,
          latencyMs: Date.now() - startedAt,
          timestamp: Date.now(),
        },
        { status: 500, headers: responseHeaders() },
      ),
      identity.userId,
    );
  }
}
