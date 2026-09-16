import "server-only";

import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

import {
  retrieveWebEvidence,
  type WebIntelligenceResult,
} from "@/lib/web-intelligence";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

import {
  initializeFirstCashflowProject,
} from "@/lib/commercial/first-cashflow-project";

import {
  findDuplicateActiveTask,
  createPersistentTask,
  updatePersistentTask,
} from "@/lib/task/server-store";

export const C144_1688_PRODUCT_DISCOVERY_ID =
  "C144-1688-ONE-PIECE-DROPSHIPPING";

export const C144_1688_PRODUCT_DISCOVERY_VERSION =
  "C144.4.2";

export const C144_1688_PRODUCT_DISCOVERY_TASK_TITLE =
  "1688 One-Piece Dropshipping Product Discovery";

const RESULT_STORAGE_KEY =
  createUserStorageKey(
    "c144-1688-product-discovery",
  );

const SEARCH_QUERIES = [
  "中国国内市场 1688 一件代发 新手 无库存 低成本 家居收纳 产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 厨房小工具 产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 车载用品 产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 宠物日用品 产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 办公文具 产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 清洁用品 产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 收纳整理 产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 出行用品 产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 户外轻量产品 需求 销量 竞争",
  "中国国内市场 1688 一件代发 新手 无库存 低成本 日用百货 内容展示 产品 需求 销量 竞争",
  "1688 一件代发 实力商家 超级工厂 48小时发货 7天无理由 低价 低风险",
  "1688 一件代发 实拍图 实拍视频 内容电商 产品 需求 竞争",
];

export interface C1441688ProductCandidate {
  rank: number;
  productName: string;
  category: string;
  whyNow: string;
  demandSignal: string;
  competition: string;
  procurement: {
    platform: "1688";
    url: string;
    purchasePriceCny: number;
    moq: string;
    shippingNotes: string;
    supplierRisk: string;
  };
  suggestedRetailPriceCny: number;
  grossMarginCny: number;
  grossMarginPercent: number;
  testCostCny: number;
  contentPotential: string;
  overallRisk: string;
  evidenceIds: string[];
  evidenceUrls: string[];
}

export interface C1441688ProductDiscoveryResult {
  success: boolean;
  status:
    | "ready"
    | "insufficient-evidence"
    | "blocked"
    | "error";
  operationId: string;
  version: string;
  taskId: string | null;
  objectiveId: string | null;
  generatedAt: number;
  searchQueryCount: number;
  successfulSearchCount: number;
  sourceCount: number;
  independentHosts: number;
  candidates: C1441688ProductCandidate[];
  evidence: WebIntelligenceResult["evidence"];
  discardedCandidateCount: number;
  conclusion: string;
  nextStep: string;
  error?: string;
}

interface RuntimeCandidate {
  productName?: unknown;
  category?: unknown;
  whyNow?: unknown;
  demandSignal?: unknown;
  competition?: unknown;
  procurement?: {
    platform?: unknown;
    url?: unknown;
    purchasePriceCny?: unknown;
    moq?: unknown;
    shippingNotes?: unknown;
    supplierRisk?: unknown;
  };
  suggestedRetailPriceCny?: unknown;
  grossMarginCny?: unknown;
  grossMarginPercent?: unknown;
  testCostCny?: unknown;
  contentPotential?: unknown;
  overallRisk?: unknown;
  evidenceIds?: unknown;
}

interface RuntimeCandidateResponse {
  candidates?: unknown;
}

function text(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function number(
  value: unknown,
): number | null {
  if (
    typeof value ===
    "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(
        value.replace(
          /,/g,
          "",
        ),
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }

  return null;
}

function uniqueStrings(
  values: unknown,
): string[] {
  if (
    !Array.isArray(
      values,
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map(text)
        .filter(Boolean),
    ),
  );
}

function extractJson(
  content: string,
): RuntimeCandidateResponse | null {
  const raw =
    content.trim();

  if (!raw) {
    return null;
  }

  const fenced =
    raw.match(
      /```(?:json)?\s*([\s\S]*?)```/i,
    );

  const source =
    fenced?.[1]?.trim() ??
    raw;

  const start =
    source.indexOf("{");

  const end =
    source.lastIndexOf("}");

  if (
    start === -1 ||
    end <= start
  ) {
    return null;
  }

  try {
    return JSON.parse(
      source.slice(
        start,
        end + 1,
      ),
    ) as RuntimeCandidateResponse;
  } catch {
    return null;
  }
}

function buildEvidencePacket(
  evidence: WebIntelligenceResult["evidence"],
): string {
  return evidence
    .slice(0, 80)
    .map(
      (item) =>
        [
          `SOURCE_ID: ${item.id}`,
          `TITLE: ${item.title}`,
          `HOST: ${item.hostname}`,
          `URL: ${item.url}`,
          `SNIPPETS: ${item.snippets
            .slice(0, 4)
            .join(" ")}`,
        ].join("\n"),
    )
    .join("\n\n");
}

function buildAnalysisPrompt(
  evidence: WebIntelligenceResult["evidence"],
): string {
  const packet =
    buildEvidencePacket(
      evidence,
    );

  return [
    "You are AIOS Commerce Engine.",
    "",
    "Execute the first real domestic China ecommerce product discovery task.",
    "",
    "Goal:",
    "Find 30 real candidate products for a beginner who has:",
    "- no inventory",
    "- no warehouse",
    "- one-piece dropshipping requirement",
    "- low starting cost",
    "- low operational risk",
    "- content-friendly product characteristics",
    "- a 30-day first-order target",
    "",
    "The procurement platform must be 1688.",
    "",
    "Important:",
    "Do not invent products, supplier names, prices, sales numbers, demand, margins, or URLs.",
    "Every candidate must be directly supported by the supplied evidence.",
    "Every candidate must contain at least two evidence IDs.",
    "At least one evidence source for every candidate must be an actual 1688.com source.",
    "The second source should independently support demand, competition, market use case, pricing, or another commercial signal.",
    "If evidence is insufficient, return fewer candidates instead of fabricating candidates.",
    "",
    "Avoid high-risk categories such as:",
    "- food",
    "- medical products",
    "- healthcare claims",
    "- cosmetics and skincare",
    "- unauthorized branded goods",
    "- IP merchandise",
    "- high-power electrical products",
    "- products requiring complex qualifications",
    "- fragile products with high damage risk",
    "",
    "Prefer:",
    "- home storage",
    "- kitchen tools",
    "- cleaning tools",
    "- car accessories",
    "- ordinary pet supplies",
    "- office supplies",
    "- travel organization",
    "- lightweight daily-use goods",
    "- visually demonstrable products",
    "",
    "Return ONLY valid JSON.",
    "",
    "Required structure:",
    "{",
    '  "candidates": [',
    "    {",
    '      "productName": "string",',
    '      "category": "string",',
    '      "whyNow": "string",',
    '      "demandSignal": "string",',
    '      "competition": "string",',
    '      "procurement": {',
    '        "platform": "1688",',
    '        "url": "string",',
    '        "purchasePriceCny": 0,',
    '        "moq": "string",',
    '        "shippingNotes": "string",',
    '        "supplierRisk": "string"',
    "      },",
    '      "suggestedRetailPriceCny": 0,',
    '      "grossMarginCny": 0,',
    '      "grossMarginPercent": 0,',
    '      "testCostCny": 0,',
    '      "contentPotential": "string",',
    '      "overallRisk": "string",',
    '      "evidenceIds": ["source-id-1", "source-id-2"]',
    "    }",
    "  ]",
    "}",
    "",
    "Evidence:",
    packet,
  ].join("\n");
}

function validateCandidate(
  raw: RuntimeCandidate,
  evidenceMap: Map<
    string,
    WebIntelligenceResult["evidence"][number]
  >,
): C1441688ProductCandidate | null {
  const productName =
    text(
      raw.productName,
    );

  const category =
    text(
      raw.category,
    );

  const whyNow =
    text(
      raw.whyNow,
    );

  const demandSignal =
    text(
      raw.demandSignal,
    );

  const competition =
    text(
      raw.competition,
    );

  const procurement =
    raw.procurement;

  const procurementUrl =
    text(
      procurement?.url,
    );

  const purchasePrice =
    number(
      procurement
        ?.purchasePriceCny,
    );

  const retailPrice =
    number(
      raw.suggestedRetailPriceCny,
    );

  const margin =
    number(
      raw.grossMarginCny,
    );

  const marginPercent =
    number(
      raw.grossMarginPercent,
    );

  const testCost =
    number(
      raw.testCostCny,
    );

  const contentPotential =
    text(
      raw.contentPotential,
    );

  const overallRisk =
    text(
      raw.overallRisk,
    );

  const evidenceIds =
    uniqueStrings(
      raw.evidenceIds,
    );

  if (
    !productName ||
    !category ||
    !whyNow ||
    !demandSignal ||
    !competition ||
    !procurementUrl ||
    purchasePrice === null ||
    retailPrice === null ||
    margin === null ||
    marginPercent === null ||
    testCost === null ||
    !contentPotential ||
    !overallRisk
  ) {
    return null;
  }

  if (
    procurement?.platform !==
    "1688"
  ) {
    return null;
  }

  if (
    !procurementUrl
      .toLowerCase()
      .includes("1688.com")
  ) {
    return null;
  }

  if (
    purchasePrice <= 0 ||
    retailPrice <= 0 ||
    margin < 0 ||
    marginPercent < 0 ||
    testCost < 0
  ) {
    return null;
  }

  if (
    evidenceIds.length <
    2
  ) {
    return null;
  }

  const matchedEvidence =
    evidenceIds
      .map((id) =>
        evidenceMap.get(id),
      )
      .filter(
        (
          item,
        ): item is WebIntelligenceResult["evidence"][number] =>
          Boolean(item),
      );

  if (
    matchedEvidence.length <
    2
  ) {
    return null;
  }

  const hosts =
    new Set(
      matchedEvidence.map(
        (item) =>
          item.hostname
            .toLowerCase(),
      ),
    );

  if (
    hosts.size <
    2
  ) {
    return null;
  }

  const has1688Evidence =
    matchedEvidence.some(
      (item) =>
        item.hostname
          .toLowerCase()
          .includes(
            "1688.com",
          ),
    );

  if (!has1688Evidence) {
    return null;
  }

  const evidenceUrls =
    matchedEvidence.map(
      (item) =>
        item.url,
    );

  return {
    rank: 0,
    productName,
    category,
    whyNow,
    demandSignal,
    competition,
    procurement: {
      platform:
        "1688",
      url:
        procurementUrl,
      purchasePriceCny:
        purchasePrice,
      moq:
        text(
          procurement?.moq,
        ) ||
        "Unknown - manual verification required",
      shippingNotes:
        text(
          procurement?.shippingNotes,
        ) ||
        "Manual verification required",
      supplierRisk:
        text(
          procurement?.supplierRisk,
        ) ||
        "Manual verification required",
    },
    suggestedRetailPriceCny:
      retailPrice,
    grossMarginCny:
      margin,
    grossMarginPercent:
      marginPercent,
    testCostCny:
      testCost,
    contentPotential,
    overallRisk,
    evidenceIds,
    evidenceUrls,
  };
}

function rankCandidates(
  candidates: C1441688ProductCandidate[],
): C1441688ProductCandidate[] {
  const unique =
    new Map<
      string,
      C1441688ProductCandidate
    >();

  for (const candidate of candidates) {
    const key =
      candidate.productName
        .toLowerCase()
        .replace(
          /\s+/g,
          "",
        );

    if (
      !unique.has(key)
    ) {
      unique.set(
        key,
        candidate,
      );
    }
  }

  return Array.from(
    unique.values(),
  )
    .sort(
      (a, b) => {
        const scoreA =
          a.grossMarginPercent * 0.4 +
          Math.min(
            100,
            a.evidenceIds.length *
              15,
          ) * 0.25 +
          Math.max(
            0,
            100 -
              a.testCostCny,
          ) *
            0.2;

        const scoreB =
          b.grossMarginPercent * 0.4 +
          Math.min(
            100,
            b.evidenceIds.length *
              15,
          ) * 0.25 +
          Math.max(
            0,
            100 -
              b.testCostCny,
          ) *
            0.2;

        return (
          scoreB -
          scoreA
        );
      },
    )
    .slice(
      0,
      30,
    )
    .map(
      (
        candidate,
        index,
      ) => ({
        ...candidate,
        rank:
          index + 1,
      }),
    );
}

async function getOrCreateTask(
  objectiveId: string,
): Promise<string> {
  const existing =
    await findDuplicateActiveTask(
      C144_1688_PRODUCT_DISCOVERY_TASK_TITLE,
    );

  if (existing) {
    return existing.id;
  }

  const task =
    await createPersistentTask(
      C144_1688_PRODUCT_DISCOVERY_TASK_TITLE,
      [
        "Commercial Objective:",
        objectiveId,
        "",
        "Input:",
        "China domestic market.",
        "Beginner.",
        "No inventory.",
        "One-piece dropshipping.",
        "Low cost.",
        "Low risk.",
        "Content-friendly.",
        "30-day first-order target.",
        "",
        "Output:",
        "30 real candidate products.",
        "Each candidate requires procurement evidence, demand signal, competition, margin room, supplier risk, content potential, and test cost.",
        "",
        "AIOS must never fabricate candidates, prices, suppliers, sales, orders, revenue, or profit.",
      ].join("\n"),
    );

  return task.id;
}

export async function runC1441688ProductDiscovery(): Promise<C1441688ProductDiscoveryResult> {
  const generatedAt =
    Date.now();

  const project =
    await initializeFirstCashflowProject();

  if (
    !project.success ||
    !project.objective
  ) {
    return {
      success: false,
      status: "blocked",
      operationId:
        C144_1688_PRODUCT_DISCOVERY_ID,
      version:
        C144_1688_PRODUCT_DISCOVERY_VERSION,
      taskId: null,
      objectiveId:
        project.objective?.id ??
        null,
      generatedAt,
      searchQueryCount:
        SEARCH_QUERIES.length,
      successfulSearchCount: 0,
      sourceCount: 0,
      independentHosts: 0,
      candidates: [],
      evidence: [],
      discardedCandidateCount: 0,
      conclusion:
        "The C144 commercial objective is not ready.",
      nextStep:
        project.nextAction,
      error:
        project.message,
    };
  }

  const taskId =
    await getOrCreateTask(
      project.objective.id,
    );

  await updatePersistentTask(
    taskId,
    {
      status: "doing",
    },
  );

  try {
    const webResults =
      await Promise.all(
        SEARCH_QUERIES.map(
          async (query) => {
            try {
              return await retrieveWebEvidence(
                query,
              );
            } catch {
              return null;
            }
          },
        ),
      );

    const successful =
      webResults.filter(
        (
          item,
        ): item is WebIntelligenceResult =>
          Boolean(
            item &&
              item.success &&
              item.evidence.length >
                0,
          ),
      );

    const evidenceMap =
      new Map<
        string,
        WebIntelligenceResult["evidence"][number]
      >();

    for (const result of successful) {
      for (const evidence of result.evidence) {
        if (
          !evidenceMap.has(
            evidence.id,
          )
        ) {
          evidenceMap.set(
            evidence.id,
            evidence,
          );
        }
      }
    }

    const evidence =
      Array.from(
        evidenceMap.values(),
      );

    const independentHosts =
      new Set(
        evidence.map(
          (item) =>
            item.hostname
              .toLowerCase(),
        ),
      ).size;

    const verifiedSearchCount =
      successful.filter(
        (item) =>
          item.verified,
      ).length;

    if (
      evidence.length <
        6 ||
      independentHosts <
        2 ||
      verifiedSearchCount <
        2
    ) {
      await updatePersistentTask(
        taskId,
        {
          status: "todo",
        },
      );

      const blockedResult:
        C1441688ProductDiscoveryResult =
        {
          success: false,
          status:
            "insufficient-evidence",
          operationId:
            C144_1688_PRODUCT_DISCOVERY_ID,
          version:
            C144_1688_PRODUCT_DISCOVERY_VERSION,
          taskId,
          objectiveId:
            project.objective.id,
          generatedAt,
          searchQueryCount:
            SEARCH_QUERIES.length,
          successfulSearchCount:
            verifiedSearchCount,
          sourceCount:
            evidence.length,
          independentHosts,
          candidates: [],
          evidence,
          discardedCandidateCount:
            0,
          conclusion:
            "Current live evidence is not sufficient to safely produce 30 real 1688 candidates.",
          nextStep:
            "Run the task again after stronger 1688 procurement and demand evidence is available.",
        };

      await storage.set(
        RESULT_STORAGE_KEY,
        blockedResult,
      );

      return blockedResult;
    }

    const aggregateWeb:
      WebIntelligenceResult =
      {
        success: true,
        query:
          "C144 1688 one-piece dropshipping product discovery",
        verified:
          verifiedSearchCount >=
          2,
        provider:
          "brave",
        evidence,
        sourceCount:
          evidence.length,
        sourceHosts:
          Array.from(
            new Set(
              evidence.map(
                (item) =>
                  item.hostname,
              ),
            ),
          ),
        verification: {
          verified:
            verifiedSearchCount >=
            2,
          score:
            Math.min(
              1,
              verifiedSearchCount /
                4,
            ),
          label:
            verifiedSearchCount >=
            4
              ? "high"
              : verifiedSearchCount >=
                2
                ? "medium"
                : "limited",
          independentSourceCount:
            evidence.length,
          primarySourceFound:
            evidence.some(
              (item) =>
                item.hostname
                  .toLowerCase()
                  .includes(
                    "1688.com",
                  ),
            ),
          corroborated:
            independentHosts >=
            2,
        },
        retrievalMode:
          "web-search",
      };

    const runtime =
      await executeRuntime({
        prompt:
          buildAnalysisPrompt(
            evidence,
          ),
        locale:
          "zh-CN",
        webContext:
          aggregateWeb,
      });

    if (
      !runtime.success
    ) {
      throw new Error(
        "COMMERCE_DISCOVERY_RUNTIME_FAILED",
      );
    }

    const parsed =
      extractJson(
        runtime.content,
      );

    if (!parsed) {
      throw new Error(
        "COMMERCE_DISCOVERY_JSON_PARSE_FAILED",
      );
    }

    const rawCandidates =
      Array.isArray(
        parsed.candidates,
      )
        ? parsed.candidates
        : [];

    const validated =
      rawCandidates
        .map(
          (item) =>
            validateCandidate(
              item as RuntimeCandidate,
              evidenceMap,
            ),
        )
        .filter(
          (
            item,
          ): item is C1441688ProductCandidate =>
            Boolean(item),
        );

    const candidates =
      rankCandidates(
        validated,
      );

    const result:
      C1441688ProductDiscoveryResult =
      {
        success:
          candidates.length >=
          30,
        status:
          candidates.length >=
          30
            ? "ready"
            : "insufficient-evidence",
        operationId:
          C144_1688_PRODUCT_DISCOVERY_ID,
        version:
          C144_1688_PRODUCT_DISCOVERY_VERSION,
        taskId,
        objectiveId:
          project.objective.id,
        generatedAt,
        searchQueryCount:
          SEARCH_QUERIES.length,
        successfulSearchCount:
          verifiedSearchCount,
        sourceCount:
          evidence.length,
        independentHosts,
        candidates,
        evidence,
        discardedCandidateCount:
          Math.max(
            0,
            rawCandidates.length -
              candidates.length,
          ),
        conclusion:
          candidates.length >=
          30
            ? "AIOS has produced 30 evidence-bound 1688 one-piece dropshipping candidates. The next stage is manual supplier validation and narrowing 30 to 10."
            : `AIOS produced ${candidates.length} evidence-bound candidates. It will not invent the remaining candidates.`,
        nextStep:
          candidates.length >=
          30
            ? "Manually validate supplier terms, sample cost, shipping, and actual listing conditions for the top 10."
            : "Strengthen live procurement and demand evidence, then rerun the discovery task.",
      };

    await storage.set(
      RESULT_STORAGE_KEY,
      result,
    );

    await updatePersistentTask(
      taskId,
      {
        status:
          result.success
            ? "doing"
            : "todo",
        description:
          [
            "Commercial Objective:",
            project.objective.id,
            "",
            `Latest run: ${new Date(
              generatedAt,
            ).toISOString()}`,
            `Candidates: ${candidates.length}/30`,
            `Sources: ${evidence.length}`,
            `Independent hosts: ${independentHosts}`,
            "",
            result.nextStep,
            "",
            "No external order, customer, revenue, or profit is claimed by this task.",
          ].join("\n"),
      },
    );

    return result;
  } catch (error) {
    await updatePersistentTask(
      taskId,
      {
        status: "todo",
      },
    );

    const result:
      C1441688ProductDiscoveryResult =
      {
        success: false,
        status: "error",
        operationId:
          C144_1688_PRODUCT_DISCOVERY_ID,
        version:
          C144_1688_PRODUCT_DISCOVERY_VERSION,
        taskId,
        objectiveId:
          project.objective.id,
        generatedAt,
        searchQueryCount:
          SEARCH_QUERIES.length,
        successfulSearchCount:
          0,
        sourceCount:
          0,
        independentHosts:
          0,
        candidates: [],
        evidence: [],
        discardedCandidateCount:
          0,
        conclusion:
          "The 1688 product discovery task failed before a verified commercial result could be produced.",
        nextStep:
          "Inspect the Runtime and live web evidence path, then rerun the task.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown C144.4.2 discovery error.",
      };

    await storage.set(
      RESULT_STORAGE_KEY,
      result,
    );

    return result;
  }
}

export async function getLatestC1441688ProductDiscovery(): Promise<C1441688ProductDiscoveryResult | null> {
  return storage.get<C1441688ProductDiscoveryResult>(
    RESULT_STORAGE_KEY,
  );
}

export function isC1441688ProductDiscoveryReady(
  result:
    C1441688ProductDiscoveryResult,
): boolean {
  return (
    result.success &&
    result.status ===
      "ready" &&
    result.candidates.length ===
      30 &&
    result.sourceCount >=
      6 &&
    result.independentHosts >=
      2 &&
    Boolean(
      result.taskId,
    ) &&
    Boolean(
      result.objectiveId,
    )
  );
}
