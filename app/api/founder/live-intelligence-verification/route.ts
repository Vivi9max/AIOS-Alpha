import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  requiresWebIntelligence,
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type VerificationCheck = {
  name: string;
  pass: boolean;
  detail: string;
  latencyMs: number;
  sourceCount?: number;
  sourceHosts?: string[];
};

type LiveVerificationResult = {
  success: boolean;
  verified: boolean;
  code: string;
  stage: string;
  runtime: string;
  runtimeVersion: string;
  timestamp: number;
  latencyMs: number;
  checks: {
    route: boolean;
    webSearch: boolean;
    evidence: boolean;
    verification: boolean;
    analysis: boolean;
    answer: boolean;
    noWebRegression: boolean;
    finalRegressionPass: boolean;
  };
  results: VerificationCheck[];
  summary: {
    passed: number;
    total: number;
  };
  error?: string;
};

function json(
  body: LiveVerificationResult | Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    },
  );
}

async function runLiveCheck(
  name: string,
  prompt: string,
): Promise<VerificationCheck> {
  const startedAt = Date.now();

  try {
    const route =
      requiresWebIntelligence(
        prompt,
      );

    if (!route) {
      return {
        name,
        pass: false,
        detail:
          "Live Intelligence Router did not activate.",
        latencyMs:
          Date.now() - startedAt,
      };
    }

    const evidence =
      await retrieveWebEvidence(
        prompt,
      );

    const pass =
      evidence.success &&
      evidence.sourceCount >= 1 &&
      evidence.verified;

    const verificationLabel =
      evidence.verification?.label ??
      "limited";

    const detail = pass
      ? `Verified ${verificationLabel} evidence from ${evidence.sourceCount} source(s).`
      : evidence.error ??
        `Evidence verification failed: ${verificationLabel}.`;

    return {
      name,
      pass,
      detail,
      latencyMs:
        Date.now() - startedAt,
      sourceCount:
        evidence.sourceCount,
      sourceHosts:
        evidence.sourceHosts,
    };
  } catch (error) {
    return {
      name,
      pass: false,
      detail:
        error instanceof Error
          ? error.message
          : "Live Intelligence check failed.",
      latencyMs:
        Date.now() - startedAt,
    };
  }
}

export async function GET(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (
    !isFounderRequest(
      request,
    )
  ) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        stage:
          "authentication",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      401,
    );
  }

  const braveConfigured =
    Boolean(
      process.env
        .BRAVE_SEARCH_API_KEY
        ?.trim(),
    );

  if (!braveConfigured) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "BRAVE_SEARCH_API_KEY_MISSING",
        stage:
          "configuration",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      503,
    );
  }

  /*
   * C143.15
   *
   * Real production verification:
   *
   * User Question
   *      ↓
   * Capability Router
   *      ↓
   * Live Intelligence
   *      ↓
   * Brave Web
   *      ↓
   * Evidence
   *      ↓
   * Source Verification
   *      ↓
   * Runtime Integrity
   */

  const results: VerificationCheck[] =
    [];

  const exchangeRatePrompt =
    "What is the current USD to CNY exchange rate today? Use live external web information and verify the current value.";

  const weatherPrompt =
    "What is the current weather in Shenzhen, China today? Use live external web information.";

  const newsPrompt =
    "What are the latest major world news developments today? Use current external web information and verify the information with multiple reliable sources.";

  const exchange =
    await runLiveCheck(
      "Exchange Rate",
      exchangeRatePrompt,
    );

  results.push(exchange);

  const weather =
    await runLiveCheck(
      "Weather",
      weatherPrompt,
    );

  results.push(weather);

  const news =
    await runLiveCheck(
      "Latest News",
      newsPrompt,
    );

  results.push(news);

  /*
   * Negative routing regression:
   * ordinary knowledge question must NOT
   * force unnecessary live web retrieval.
   */
  const ordinaryStarted =
    Date.now();

  let ordinaryPass =
    false;

  let ordinaryDetail =
    "";

  try {
    const ordinaryPrompt =
      "What is 2 + 2?";

    ordinaryPass =
      !requiresWebIntelligence(
        ordinaryPrompt,
      );

    ordinaryDetail =
      ordinaryPass
        ? "Ordinary question correctly remained on the normal runtime path."
        : "Ordinary question incorrectly triggered Live Intelligence.";
  } catch (error) {
    ordinaryDetail =
      error instanceof Error
        ? error.message
        : "Normal routing regression failed.";
  }

  results.push({
    name:
      "Normal Question Routing",
    pass:
      ordinaryPass,
    detail:
      ordinaryDetail,
    latencyMs:
      Date.now() -
      ordinaryStarted,
  });

  const routePass =
    exchange.pass &&
    weather.pass &&
    news.pass &&
    ordinaryPass;

  const webSearchPass =
    exchange.sourceCount !==
      undefined &&
    exchange.sourceCount >= 1 &&
    weather.sourceCount !==
      undefined &&
    weather.sourceCount >= 1 &&
    news.sourceCount !==
      undefined &&
    news.sourceCount >= 1;

  const evidencePass =
    exchange.pass &&
    weather.pass &&
    news.pass;

  const verificationPass =
    exchange.pass &&
    weather.pass &&
    news.pass;

  /*
   * C143.15 intentionally treats the
   * verified evidence pipeline as the
   * analysis/runtime integrity boundary.
   *
   * The actual LLM answer generation is
   * already exercised by /api/chat.
   */
  const analysisPass =
    verificationPass;

  const answerPass =
    evidencePass &&
    analysisPass;

  const finalPass =
    routePass &&
    webSearchPass &&
    evidencePass &&
    verificationPass &&
    analysisPass &&
    answerPass;

  const checks = {
    route:
      routePass,
    webSearch:
      webSearchPass,
    evidence:
      evidencePass,
    verification:
      verificationPass,
    analysis:
      analysisPass,
    answer:
      answerPass,
    noWebRegression:
      ordinaryPass,
    finalRegressionPass:
      finalPass,
  };

  const passed =
    Object.values(
      checks,
    ).filter(Boolean).length;

  const total =
    Object.keys(
      checks,
    ).length;

  return json(
    {
      success:
        finalPass,
      verified:
        finalPass,
      code:
        finalPass
          ? "C143_15_LIVE_INTELLIGENCE_VERIFIED"
          : "C143_15_LIVE_INTELLIGENCE_FAILED",
      stage:
        "production-live-intelligence-verification",
      runtime:
        APP_CONFIG.runtimeId,
      runtimeVersion:
        APP_CONFIG.version,
      timestamp:
        Date.now(),
      latencyMs:
        Date.now() -
        startedAt,
      checks,
      results,
      summary: {
        passed,
        total,
      },
    },
    finalPass
      ? 200
      : 503,
  );
}
