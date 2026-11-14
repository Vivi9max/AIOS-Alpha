import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const helperPath =
  "lib/autonomous-development-objective-contract.ts";

const helperSource =
  await readFile(helperPath, "utf8");

const compiled =
  ts.transpileModule(
    helperSource,
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    },
  );

const compileErrors =
  (compiled.diagnostics || []).filter(
    (diagnostic) =>
      diagnostic.category ===
      ts.DiagnosticCategory.Error,
  );

assert.equal(
  compileErrors.length,
  0,
  "Objective contract helper must compile without TypeScript errors.",
);

const helperUrl =
  `data:text/javascript;base64,${Buffer.from(
    compiled.outputText,
    "utf8",
  ).toString("base64")}`;

const {
  MAX_AUTONOMOUS_OBJECTIVE_CHARS,
  countObjectiveCharacters,
  getObjectiveLengthError,
} = await import(helperUrl);

test(
  "objective contract uses the 16000 Unicode-character ceiling",
  () => {
    assert.equal(
      MAX_AUTONOMOUS_OBJECTIVE_CHARS,
      16000,
    );
  },
);

test(
  "objective lengths 1000, 4000, 12000 and 16000 are accepted",
  () => {
    for (const size of [
      1000,
      4000,
      12000,
      16000,
    ]) {
      const objective =
        "a".repeat(size);

      assert.equal(
        countObjectiveCharacters(objective),
        size,
      );

      assert.equal(
        getObjectiveLengthError(objective),
        null,
        `Expected ${size} characters to be accepted.`,
      );
    }
  },
);

test(
  "objective length 16001 is rejected",
  () => {
    const objective =
      "a".repeat(16001);

    assert.equal(
      countObjectiveCharacters(objective),
      16001,
    );

    assert.ok(
      getObjectiveLengthError(objective),
      "An objective exceeding 16000 characters must be rejected.",
    );
  },
);

test(
  "Chinese characters are counted as Unicode code points",
  () => {
    const objective =
      "中".repeat(12000);

    assert.equal(
      countObjectiveCharacters(objective),
      12000,
    );

    assert.equal(
      getObjectiveLengthError(objective),
      null,
    );
  },
);

test(
  "Emoji are counted as Unicode code points, not UTF-16 code units",
  () => {
    const accepted =
      "😀".repeat(16000);

    const rejected =
      "😀".repeat(16001);

    assert.equal(
      accepted.length,
      32000,
      "This fixture confirms that JavaScript UTF-16 length differs from code-point count.",
    );

    assert.equal(
      countObjectiveCharacters(accepted),
      16000,
    );

    assert.equal(
      getObjectiveLengthError(accepted),
      null,
    );

    assert.equal(
      countObjectiveCharacters(rejected),
      16001,
    );

    assert.ok(
      getObjectiveLengthError(rejected),
    );
  },
);

test(
  "mixed Chinese, English and Emoji use one consistent character count",
  () => {
    const objective =
      "AIOS自主开发🚀".repeat(1000);

    const expected =
      Array.from(objective).length;

    assert.equal(
      countObjectiveCharacters(objective),
      expected,
    );

    assert.equal(
      getObjectiveLengthError(objective),
      null,
    );
  },
);

test(
  "empty and whitespace-only objectives are rejected",
  () => {
    assert.ok(
      getObjectiveLengthError(""),
    );

    assert.ok(
      getObjectiveLengthError("   \n\t  "),
    );
  },
);

test(
  "Agent no longer silently truncates objectives",
  async () => {
    const source =
      await readFile(
        "lib/github/autonomous-development-agent.ts",
        "utf8",
      );

    assert.match(
      source,
      /getObjectiveLengthError/,
    );

    assert.doesNotMatch(
      source,
      /MAX_OBJECTIVE_LENGTH\s*=\s*4000/,
    );

    assert.doesNotMatch(
      source,
      /\.slice\s*\(\s*0\s*,\s*MAX_OBJECTIVE_LENGTH/,
    );
  },
);

test(
  "Safety Gate uses the shared objective contract",
  async () => {
    const source =
      await readFile(
        "lib/github/autonomous-development-safety-gate.ts",
        "utf8",
      );

    assert.match(
      source,
      /getObjectiveLengthError/,
    );

    assert.doesNotMatch(
      source,
      /MAX_OBJECTIVE_LENGTH\s*=\s*4000/,
    );
  },
);

test(
  "all objective pipeline modules reference the shared contract",
  async () => {
    const paths = [
      "lib/planner/development-intent.ts",
      "lib/github/planner-autonomous-dispatch.ts",
      "lib/github/autonomous-development-prompt.ts",
      "lib/github/autonomous-development-control-plane.ts",
      "lib/github/autonomous-development-agent.ts",
      "lib/github/autonomous-development-safety-gate.ts",
    ];

    for (const path of paths) {
      const source =
        await readFile(path, "utf8");

      assert.match(
        source,
        /autonomous-development-objective-contract/,
        `${path} must use the shared objective contract.`,
      );
    }
  },
);

console.log(
  "C170.7.3 objective contract regression suite loaded.",
);
