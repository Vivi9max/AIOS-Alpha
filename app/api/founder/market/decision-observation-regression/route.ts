import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  resetMarketDecisionHistory,
  runMarketDecisionHistory,
} from "@/lib/runtime/market/market-decision-history-runtime";

import {
  runMarketDecisionHistoryQuery,
} from "@/lib/runtime/market/market-decision-history-query-runtime";

import {
  runMarketDecisionObservation,
} from "@/lib/runtime/market/market-decision-observation-runtime";

type Check = {
  name: string;
  passed: boolean;
  detail: string;
};

type RegressionCase = {
  name: string;
  passed: boolean;
  checks: Check[];
  latencyMs: number;
};

const universe = [
  {
    symbol:
      "NVDA",

    market:
      "us" as const,
  },
];

async function observe(): Promise<any> {
  const result =
    await runMarketDecisionObservation({
      mode:
        "observe",

      universe,
    });

  return result;
}

async function runObservationReadOnly(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  await resetMarketDecisionHistory(
    "NVDA",
    "us",
  );

  const before =
    await runMarketDecisionHistoryQuery({
      symbol:
        "NVDA",

      market:
        "us",
    });

  const observed =
    await observe();

  const after =
    await runMarketDecisionHistoryQuery({
      symbol:
        "NVDA",

      market:
        "us",
    });

  const checks: Check[] = [
    {
      name:
        "OBSERVATION_SUCCEEDED",

      passed:
        observed.success ===
        true,

      detail:
        `Observation code: ${observed.code}.`,
    },

    {
      name:
        "OBSERVATION_IS_READ_ONLY",

      passed:
        observed.mutated ===
          false &&
        observed.versionCreated ===
          null,

      detail:
        "Observation did not mutate history.",
    },

    {
      name:
        "HISTORY_VERSION_UNCHANGED",

      passed:
        before.currentVersion ===
        after.currentVersion,

      detail:
        `Version before=${before.currentVersion}, after=${after.currentVersion}.`,
    },
  ];

  return {
    name:
      "OBSERVATION_READ_ONLY",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function runIdempotentMutation(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  await resetMarketDecisionHistory(
    "NVDA",
    "us",
  );

  const observed =
    await observe();

  const record =
    observed.observation?.record;

  const first =
    await runMarketDecisionObservation({
      mode:
        "mutate",

      symbol:
        "NVDA",

      market:
        "us",

      record,
    });

  const second =
    await runMarketDecisionObservation({
      mode:
        "mutate",

      symbol:
        "NVDA",

      market:
        "us",

      record,
    });

  const history =
    await runMarketDecisionHistoryQuery({
      symbol:
        "NVDA",

      market:
        "us",

      limit:
        10,
    });

  const checks: Check[] = [
    {
      name:
        "FIRST_MUTATION_CREATED_VERSION",

      passed:
        first.code ===
          "C147_11_MUTATION_PASS" &&
        first.versionCreated ===
          1,

      detail:
        `First mutation code=${first.code}, version=${first.versionCreated}.`,
    },

    {
      name:
        "SECOND_MUTATION_NOOP",

      passed:
        second.code ===
          "C147_11_MUTATION_NOOP" &&
        second.mutated ===
          false,

      detail:
        `Second mutation code=${second.code}.`,
    },

    {
      name:
        "IDEMPOTENT_HISTORY",

      passed:
        history.currentVersion ===
          1 &&
        history.totalVersions ===
          1,

      detail:
        `History versions=${history.totalVersions}.`,
    },
  ];

  return {
    name:
      "IDEMPOTENT_MUTATION",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function runNewObservationMutation(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  await resetMarketDecisionHistory(
    "NVDA",
    "us",
  );

  const observed =
    await observe();

  const record =
    observed.observation?.record;

  if (
    !record
  ) {
    return {
      name:
        "NEW_OBSERVATION_MUTATION",

      passed:
        false,

      checks: [
        {
          name:
            "RECORD_AVAILABLE",

          passed:
            false,

          detail:
            "Observation did not return a decision record.",
        },
      ],

      latencyMs:
        Date.now() -
        startedAt,
    };
  }

  const first =
    await runMarketDecisionObservation({
      mode:
        "mutate",

      symbol:
        "NVDA",

      market:
        "us",

      record,
    });

  const changedRecord = {
    ...record,

    generatedAt:
      new Date().toISOString(),

    valuation: {
      ...record.valuation,

      pe:
        record.valuation.pe ===
        null
          ? 25
          : record.valuation.pe *
            1.10,
    },
  };

  const second =
    await runMarketDecisionObservation({
      mode:
        "mutate",

      symbol:
        "NVDA",

      market:
        "us",

      record:
        changedRecord,
    });

  const history =
    await runMarketDecisionHistoryQuery({
      symbol:
        "NVDA",

      market:
        "us",

      limit:
        10,
    });

  const checks: Check[] = [
    {
      name:
        "FIRST_VERSION_CREATED",

      passed:
        first.versionCreated ===
        1,

      detail:
        `First version=${first.versionCreated}.`,
    },

    {
      name:
        "NEW_OBSERVATION_CREATED",

      passed:
        second.code ===
          "C147_11_MUTATION_PASS" &&
        second.versionCreated ===
          2,

      detail:
        `Second mutation code=${second.code}, version=${second.versionCreated}.`,
    },

    {
      name:
        "REASSESSMENT_ATTACHED",

      passed:
        Boolean(
          second.observation
            ?.reassessmentAvailable,
        ),

      detail:
        "The new observation is linked to previous history for reassessment.",
    },

    {
      name:
        "HISTORY_VERSION_TWO",

      passed:
        history.currentVersion ===
          2 &&
        history.totalVersions ===
          2,

      detail:
        `History versions=${history.totalVersions}.`,
    },
  ];

  return {
    name:
      "NEW_OBSERVATION_MUTATION",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function runCrossSecurityGuard(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  const observed =
    await observe();

  const record =
    observed.observation?.record;

  if (
    !record
  ) {
    return {
      name:
        "SECURITY_IDENTITY_GUARD",

      passed:
        false,

      checks: [
        {
          name:
            "OBSERVATION_AVAILABLE",

          passed:
            false,

          detail:
            "Observation unavailable.",
        },
      ],

      latencyMs:
        Date.now() -
        startedAt,
    };
  }

  const result =
    await runMarketDecisionObservation({
      mode:
        "mutate",

      symbol:
        "AAPL",

      market:
        "us",

      record,
    });

  const checks: Check[] = [
    {
      name:
        "CROSS_SYMBOL_BLOCKED",

      passed:
        result.code ===
          "C147_11_MUTATION_BLOCKED" &&
        result.mutated ===
          false,

      detail:
        `Mutation code=${result.code}.`,
    },

    {
      name:
        "NO_VERSION_CREATED",

      passed:
        result.versionCreated ===
        null,

      detail:
        "Cross-security mutation did not create a version.",
    },
  ];

  return {
    name:
      "SECURITY_IDENTITY_GUARD",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function runQueryReadOnly(): Promise<RegressionCase> {
  const startedAt =
    Date.now();

  await resetMarketDecisionHistory(
    "NVDA",
    "us",
  );

  const observed =
    await observe();

  const record =
    observed.observation?.record;

  await runMarketDecisionObservation({
    mode:
      "mutate",

    record,
  });

  const before =
    await runMarketDecisionHistoryQuery({
      symbol:
        "NVDA",

      market:
        "us",
    });

  const after =
    await runMarketDecisionHistoryQuery({
      symbol:
        "NVDA",

      market:
        "us",
    });

  const checks: Check[] = [
    {
      name:
        "QUERY_SUCCESS",

      passed:
        after.success ===
        true,

      detail:
        `Query code=${after.code}.`,
    },

    {
      name:
        "QUERY_READ_ONLY",

      passed:
        before.currentVersion ===
          after.currentVersion &&
        before.totalVersions ===
          after.totalVersions,

      detail:
        `Versions before=${before.currentVersion}, after=${after.currentVersion}.`,
    },

    {
      name:
        "READ_ONLY_FLAG",

      passed:
        after.readOnly ===
        true,

      detail:
        "C147.10 remains read-only.",
    },
  ];

  return {
    name:
      "QUERY_READ_ONLY",

    passed:
      checks.every(
        (check) =>
          check.passed,
      ),

    checks,

    latencyMs:
      Date.now() -
      startedAt,
  };
}

async function executeRegression() {
  const startedAt =
    Date.now();

  const cases = [
    await runObservationReadOnly(),
    await runIdempotentMutation(),
    await runNewObservationMutation(),
    await runCrossSecurityGuard(),
    await runQueryReadOnly(),
  ];

  const passed =
    cases.filter(
      (item) =>
        item.passed,
    ).length;

  const failed =
    cases.length -
    passed;

  return {
    success:
      failed ===
      0,

    code:
      failed ===
      0
        ? "C147_11_OBSERVATION_MUTATION_REGRESSION_PASS"
        : "C147_11_OBSERVATION_MUTATION_REGRESSION_PARTIAL",

    passed,

    failed,

    total:
      cases.length,

    stage:
      "C147.11",

    mode:
      "behavioral",

    runtimeMs:
      Date.now() -
      startedAt,

    cases,
  };
}

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        success: false,

        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const result =
      await executeRegression();

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        code:
          "C147_11_OBSERVATION_MUTATION_REGRESSION_ERROR",

        error:
          error instanceof Error
            ? error.message
            : "C147.11 regression failed.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  return GET(
    request,
  );
}
