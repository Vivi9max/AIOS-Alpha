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
  executeRuntime,
} from "@/lib/runtime/engine";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type VerificationCheck = {
  name: string;
  pass: boolean;
  detail: string;
  latencyMs: number;
};

type Scenario = {
  name: string;
  prompt: string;
  expectWeb: boolean;
  expectDecision: boolean;
};

function json(
  body: Record<string, unknown>,
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

function hasCapabilityDenial(
  content: string,
): boolean {
  const normalized =
    content
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const patterns = [
    "i cannot access the web",
    "i can't access the web",
    "i do not have access to the web",
    "i don't have access to the web",
    "cannot browse the web",
    "can't browse the web",
    "无法访问互联网",
    "无法联网",
    "不能联网",
    "无法获取实时信息",
    "无法获取最新信息",
    "我不能访问网页",
    "我无法访问网页",
  ];

  return patterns.some(
    (pattern) =>
      normalized.includes(pattern),
  );
}

function hasNativeDecisionStructure(
  content: string,
): boolean {
  const normalized =
    content
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const conclusion =
    normalized.includes("conclusion") ||
    normalized.includes("结论") ||
    normalized.includes("結論");

  const action =
    normalized.includes("recommended action") ||
    normalized.includes("recommended next step") ||
    normalized.includes("建议行动") ||
    normalized.includes("下一步") ||
    normalized.includes("推奨アクション") ||
    normalized.includes("次のステップ");

  return conclusion && action;
}

function hasCrowdedMarkdownTable(
  content: string,
): boolean {
  const lines =
    content.split("\n");

  let tableLines = 0;

  for (const line of lines) {
    const trimmed =
      line.trim();

    if (
      trimmed.startsWith("|") &&
      trimmed.endsWith("|")
    ) {
      tableLines += 1;
    }
  }

  return tableLines >= 3;
}

async function runScenario(
  scenario: Scenario,
): Promise<{
  checks: VerificationCheck[];
  result: Awaited<
    ReturnType<typeof executeRuntime>
  >;
}> {
  const checks: VerificationCheck[] = [];
  const startedAt =
    Date.now();

  const result =
    await executeRuntime({
      prompt:
        scenario.prompt,
      locale: "en",
    });

  const runtimePass =
    result.success === true;

  checks.push({
    name:
      `${scenario.name} / Runtime`,
    pass:
      runtimePass,
    detail:
      runtimePass
        ? "executeRuntime completed successfully."
        : result.error ??
          "Runtime execution failed.",
    latencyMs:
      Date.now() -
      startedAt,
  });

  const plannerPass =
    Boolean(
      result.planId &&
      result.planType &&
      result.intent,
    );

  checks.push({
    name:
      `${scenario.name} / Planner`,
    pass:
      plannerPass,
    detail:
      plannerPass
        ? `Planner produced plan ${result.planId}.`
        : "Planner metadata missing.",
    latencyMs:
      Date.now() -
      startedAt,
  });

  const webPass =
    scenario.expectWeb
      ? result.webIntelligence?.required === true &&
        result.webIntelligence.success === true &&
        result.webIntelligence.verified === true &&
        result.webIntelligence.sourceCount >= 2 &&
        result.webIntelligence.sourceHosts.length >= 2
      : !result.webIntelligence?.required;

  checks.push({
    name:
      `${scenario.name} / Web Routing`,
    pass:
      webPass,
    detail:
      scenario.expectWeb
        ? webPass
          ? `Verified web evidence from ${result.webIntelligence?.sourceCount ?? 0} source(s).`
          : "Expected verified Web Intelligence but did not receive it."
        : webPass
          ? "Normal question correctly remained off the Web Intelligence path."
          : "Normal question unexpectedly entered the Web Intelligence path.",
    latencyMs:
      Date.now() -
      startedAt,
  });

  const decisionPass =
    scenario.expectDecision
      ? result.liveDecision?.success === true &&
        result.liveDecision.ready === true &&
        Boolean(
          result.liveDecision.conclusion &&
          result.liveDecision.nextStep,
        )
      : !result.liveDecision;

  checks.push({
    name:
      `${scenario.name} / Decision`,
    pass:
      decisionPass,
    detail:
      scenario.expectDecision
        ? decisionPass
          ? "Usable Decision Layer result returned."
          : "Expected a usable Decision Layer result."
        : decisionPass
          ? "No live decision was created for the ordinary question."
          : "Unexpected live decision on ordinary question.",
    latencyMs:
      Date.now() -
      startedAt,
  });

  const answerPass =
    typeof result.content ===
      "string" &&
    result.content.trim().length > 0;

  checks.push({
    name:
      `${scenario.name} / Answer`,
    pass:
      answerPass,
    detail:
      answerPass
        ? "Runtime returned a non-empty answer."
        : "Runtime returned an empty answer.",
    latencyMs:
      Date.now() -
      startedAt,
  });

  const denialPass =
    !hasCapabilityDenial(
      result.content,
    );

  checks.push({
    name:
      `${scenario.name} / Capability`,
    pass:
      denialPass,
    detail:
      denialPass
        ? "No false capability denial detected."
        : "Answer contains a false web-capability denial.",
    latencyMs:
      Date.now() -
      startedAt,
  });

  const tablePass =
    !hasCrowdedMarkdownTable(
      result.content,
    );

  checks.push({
    name:
      `${scenario.name} / Answer Format`,
    pass:
      tablePass,
    detail:
      tablePass
        ? "No crowded Markdown table detected."
        : "Crowded Markdown table detected.",
    latencyMs:
      Date.now() -
      startedAt,
  });

  if (scenario.expectDecision) {
    const nativeAnswerPass =
      hasNativeDecisionStructure(
        result.content,
      );

    checks.push({
      name:
        `${scenario.name} / Native Decision Answer`,
      pass:
        nativeAnswerPass,
      detail:
        nativeAnswerPass
          ? "Native Decision Answer structure detected."
          : "Native Decision Answer structure was not detected.",
      latencyMs:
        Date.now() -
        startedAt,
    });
  }

  return {
    checks,
    result,
  };
}

export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (!isFounderRequest(request)) {
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

  if (
    !process.env.BRAVE_SEARCH_API_KEY?.trim()
  ) {
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

  const scenarios: Scenario[] = [
    {
      name:
        "Exchange Rate",
      prompt:
        "What is the current USD to CNY exchange rate today? Use live external web information, verify the evidence, make a practical judgment, and recommend the safest useful next step.",
      expectWeb:
        true,
      expectDecision:
        true,
    },
    {
      name:
        "Weather",
      prompt:
        "What is the current weather in Shenzhen today? Use live external web information, verify the evidence, analyze the situation, and recommend the most useful next step.",
      expectWeb:
        true,
      expectDecision:
        true,
    },
    {
      name:
        "Latest News",
      prompt:
        "What are the latest major global news developments today? Use live external web information, verify multiple sources, identify the most important judgment, and recommend the next useful action.",
      expectWeb:
        true,
      expectDecision:
        true,
    },
    {
      name:
        "Normal Question",
      prompt:
        "Explain in simple terms why a good business goal should be measurable.",
      expectWeb:
        false,
      expectDecision:
        false,
    },
  ];

  const allChecks: VerificationCheck[] = [];
  const scenarioResults: Record<
    string,
    Record<string, unknown>
  > = {};

  try {
    for (const scenario of scenarios) {
      const scenarioResult =
        await runScenario(
          scenario,
        );

      allChecks.push(
        ...scenarioResult.checks,
      );

      scenarioResults[
        scenario.name
      ] = {
        success:
          scenarioResult.result.success,
        planId:
          scenarioResult.result.planId,
        planType:
          scenarioResult.result.planType,
        intent:
          scenarioResult.result.intent,
        webIntelligence:
          scenarioResult.result
            .webIntelligence,
        liveDecision:
          scenarioResult.result
            .liveDecision,
        answerPresent:
          Boolean(
            scenarioResult.result
              .content
              .trim(),
          ),
        nativeDecisionAnswer:
          scenario.expectDecision
            ? hasNativeDecisionStructure(
                scenarioResult.result
                  .content,
              )
            : false,
        capabilityDenial:
          hasCapabilityDenial(
            scenarioResult.result
              .content,
          ),
        crowdedMarkdownTable:
          hasCrowdedMarkdownTable(
            scenarioResult.result
              .content,
          ),
        answerPreview:
          scenarioResult.result
            .content
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 600),
      };
    }

    const finalPass =
      allChecks.length > 0 &&
      allChecks.every(
        (check) =>
          check.pass,
      );

    const passed =
      allChecks.filter(
        (check) =>
          check.pass,
      ).length;

    return json(
      {
        success:
          finalPass,
        verified:
          finalPass,
        code:
          finalPass
            ? "C143_25_RUNTIME_E2E_PASS"
            : "C143_25_RUNTIME_E2E_FAILED",
        stage:
          "production-main-runtime-e2e-verification",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
        pipeline:
          "executeRuntime -> Planner -> Web -> Evidence Verification -> Decision -> Native Decision Answer -> Runtime Response",
        scenarios:
          scenarios.map(
            (scenario) =>
              scenario.name,
          ),
        checks:
          allChecks,
        summary: {
          passed,
          total:
            allChecks.length,
          failed:
            allChecks.length -
            passed,
        },
        scenarioResults,
      },
      finalPass
        ? 200
        : 503,
    );
  } catch (error) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "C143_25_RUNTIME_E2E_EXCEPTION",
        stage:
          "production-main-runtime-e2e-verification",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeVersion:
          APP_CONFIG.version,
        error:
          error instanceof Error
            ? error.message
            : "Runtime E2E verification failed.",
        timestamp:
          Date.now(),
        latencyMs:
          Date.now() -
          startedAt,
      },
      503,
    );
  }
}
