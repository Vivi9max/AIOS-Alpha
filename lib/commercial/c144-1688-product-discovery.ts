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
  "C144.4.3";
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
const MAX_CANDIDATES =
  30;
const BATCH_SIZE =
  5;
const MAX_RUNTIME_BATCHES =
  6;
const MIN_EVIDENCE =
  6;
const MIN_INDEPENDENT_HOSTS =
  2;
const MIN_VERIFIED_SEARCHES =
  2;
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
interface SearchRunResult {
  query: string;
  result: WebIntelligenceResult | null;
  error?: string;
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
function normalizeHost(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(
      /^www\./,
      "",
    )
    .trim();
}
function is1688Host(
  value: string,
): boolean {
  const host =
    normalizeHost(
      value,
    );
  return (
    host === "1688.com" ||
    host.endsWith(
      ".1688.com",
    )
  );
}
function extractJsonObject(
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
  try {
    const parsed =
      JSON.parse(
        source,
      );
    if (
      parsed &&
      typeof parsed ===
        "object"
    ) {
      return parsed as RuntimeCandidateResponse;
    }
  } catch {
  }
  const objectStart =
    source.indexOf(
      "{",
    );
  const objectEnd =
    source.lastIndexOf(
      "}",
    );
  if (
    objectStart === -1 ||
    objectEnd <= objectStart
  ) {
    return null;
  }
  try {
    return JSON.parse(
      source.slice(
        objectStart,
        objectEnd + 1,
      ),
    ) as RuntimeCandidateResponse;
  } catch {
    return null;
  }
}
function buildEvidencePacket(
  evidence:
    WebIntelligenceResult["evidence"],
): string {
  return evidence
    .slice(
      0,
      80,
    )
    .map(
      (item) =>
        [
          `SOURCE_ID: ${item.id}`,
          `TITLE: ${item.title}`,
          `HOST: ${item.hostname}`,
          `URL: ${item.url}`,
          `SNIPPETS: ${item.snippets
            .slice(
              0,
              5,
            )
            .join(
              " ",
            )}`,
        ].join(
          "\n",
        ),
    )
    .join(
      "\n\n",
    );
}
function buildBatchPrompt(
  evidence:
    WebIntelligenceResult["evidence"],
  batchNumber: number,
  existingNames: string[],
): string {
  const packet =
    buildEvidencePacket(
      evidence,
    );
  const existing =
    existingNames.length > 0
      ? existingNames.join(
          " | ",
        )
      : "None";
  return [
    "You are AIOS Commerce Engine.",
    "",
    `This is evidence-bound product discovery batch ${batchNumber} of ${MAX_RUNTIME_BATCHES}.`,
    "",
    "Find up to 5 real product candidates for China domestic ecommerce.",
    "",
    "Business constraints:",
    "- beginner",
    "- no inventory",
    "- no warehouse",
    "- one-piece dropshipping",
    "- procurement platform must be 1688",
    "- low starting cost",
    "- low operational risk",
    "- content-friendly",
    "- target first order within 30 days",
    "",
    "CRITICAL EVIDENCE RULES:",
    "1. Use only products directly supported by the supplied evidence.",
    "2. Do not invent a product name.",
    "3. Do not invent a supplier.",
    "4. Do not invent a 1688 URL.",
    "5. Do not invent a purchase price.",
    "6. Do not invent sales volume.",
    "7. Do not invent demand.",
    "8. Do not invent a one-piece-dropshipping claim.",
    "9. Do not estimate a purchase price from general knowledge.",
    "10. Every candidate must reference at least two supplied evidence IDs.",
    "11. At least one evidence ID must point to an actual 1688.com source.",
    "12. The other evidence must come from an independent host.",
    "13. If a field is not supported by evidence, do not create the candidate.",
    "14. Return fewer than 5 candidates when evidence is insufficient.",
    "",
    "PRICE RULE:",
    "The purchase price must be explicitly supported by evidence.",
    "The suggested retail price must be supported by evidence or clearly marked as a test price based on observed market pricing in the supplied evidence.",
    "Do not fabricate a precise market price when the evidence does not support one.",
    "",
    "MARGIN RULE:",
    "grossMarginCny must equal suggestedRetailPriceCny minus purchasePriceCny.",
    "grossMarginPercent must equal grossMarginCny divided by suggestedRetailPriceCny multiplied by 100.",
    "",
    "EXCLUDE:",
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
    "PREFER:",
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
    "Products already accepted in earlier batches:",
    existing,
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
    "SUPPLIED EVIDENCE:",
    packet,
  ].join(
    "\n",
  );
}
function evidenceText(
  item:
    WebIntelligenceResult["evidence"][number],
): string {
  return [
    item.title,
    item.hostname,
    item.url,
    ...item.snippets,
  ]
    .join(
      " ",
    )
    .toLowerCase();
}
function evidenceSupportsProduct(
  productName: string,
  item:
    WebIntelligenceResult["evidence"][number],
): boolean {
  const normalizedProduct =
    productName
      .toLowerCase()
      .replace(
        /\s+/g,
        "",
      );
  if (
    normalizedProduct.length <
    2
  ) {
    return false;
  }
  const source =
    evidenceText(
      item,
    ).replace(
      /\s+/g,
      "",
    );
  return source.includes(
    normalizedProduct,
  );
}
function evidenceSupportsPrice(
  price: number,
  item:
    WebIntelligenceResult["evidence"][number],
): boolean {
  const source =
    evidenceText(
      item,
    );
  const priceText =
    String(
      Math.round(
        price,
      ),
    );
  if (
    source.includes(
      `${priceText}元`,
    ) ||
    source.includes(
      `${priceText}起`,
    ) ||
    source.includes(
      `${priceText}¥`,
    ) ||
    source.includes(
      `¥${priceText}`,
    )
  ) {
    return true;
  }
  const decimal =
    price
      .toFixed(2)
      .replace(
        /\.00$/,
        "",
      );
  return (
    source.includes(
      `${decimal}元`,
    ) ||
    source.includes(
      `${decimal}起`,
    )
  );
}
function validateCandidate(
  raw: RuntimeCandidate,
  evidenceMap:
    Map<
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
  const suppliedMargin =
    number(
      raw.grossMarginCny,
    );
  const suppliedMarginPercent =
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
    suppliedMargin === null ||
    suppliedMarginPercent === null ||
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
    !is1688Host(
      procurementUrl,
    )
  ) {
    return null;
  }
  if (
    purchasePrice <= 0 ||
    retailPrice <= 0 ||
    purchasePrice >= retailPrice ||
    testCost < 0
  ) {
    return null;
  }
  const calculatedMargin =
    retailPrice -
    purchasePrice;
  const calculatedMarginPercent =
    (calculatedMargin /
      retailPrice) *
    100;
  if (
    Math.abs(
      calculatedMargin -
        suppliedMargin,
    ) >
      0.01
  ) {
    return null;
  }
  if (
    Math.abs(
      calculatedMarginPercent -
        suppliedMarginPercent,
    ) >
      0.5
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
      .map(
        (id) =>
          evidenceMap.get(
            id,
          ),
      )
      .filter(
        (
          item,
        ): item is WebIntelligenceResult["evidence"][number] =>
          Boolean(
            item,
          ),
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
          normalizeHost(
            item.hostname,
          ),
      ),
    );
  if (
    hosts.size <
    2
  ) {
    return null;
  }
  const productEvidence =
    matchedEvidence.filter(
      (item) =>
        evidenceSupportsProduct(
          productName,
          item,
        ),
    );
  if (
    productEvidence.length <
    2
  ) {
    return null;
  }
  const procurementEvidence =
    matchedEvidence.filter(
      (item) =>
        is1688Host(
          item.hostname,
        ) &&
        evidenceSupportsProduct(
          productName,
          item,
        ),
    );
  if (
    procurementEvidence.length <
    1
  ) {
    return null;
  }
  const priceEvidence =
    matchedEvidence.some(
      (item) =>
        evidenceSupportsPrice(
          purchasePrice,
          item,
        ),
    );
  if (
    !priceEvidence
  ) {
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
      calculatedMargin,
    grossMarginPercent:
      calculatedMarginPercent,
    testCostCny:
      testCost,
    contentPotential,
    overallRisk,
    evidenceIds,
    evidenceUrls,
  };
}
function rankCandidates(
  candidates:
    C1441688ProductCandidate[],
): C1441688ProductCandidate[] {
  const unique =
    new Map<
      string,
      C1441688ProductCandidate
    >();
  for (
    const candidate of
    candidates
  ) {
    const key =
      candidate.productName
        .toLowerCase()
        .replace(
          /\s+/g,
          "",
        );
    if (
      !unique.has(
        key,
      )
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
      (
        a,
        b,
      ) => {
        const scoreA =
          a.grossMarginPercent *
            0.4 +
          Math.min(
            100,
            a.evidenceIds.length *
              15,
          ) *
            0.25 +
          Math.max(
            0,
            100 -
              a.testCostCny,
          ) *
            0.2;
        const scoreB =
          b.grossMarginPercent *
            0.4 +
          Math.min(
            100,
            b.evidenceIds.length *
              15,
          ) *
            0.25 +
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
      MAX_CANDIDATES,
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
        "Each candidate must be directly bound to real procurement and demand evidence.",
        "",
        "AIOS must never fabricate candidates, prices, suppliers, sales, orders, revenue, or profit.",
      ].join(
        "\n",
      ),
    );
  return task.id;
}
async function runSearches(): Promise<SearchRunResult[]> {
  const results:
    SearchRunResult[] = [];
  for (
    const query of
    SEARCH_QUERIES
  ) {
    try {
      const result =
        await retrieveWebEvidence(
          query,
        );
      results.push({
        query,
        result,
      });
    } catch (error) {
      results.push({
        query,
        result: null,
        error:
          error instanceof Error
            ? error.message
            : "WEB_SEARCH_FAILED",
      });
    }
  }
  return results;
}
function collectEvidence(
  searchResults:
    SearchRunResult[],
): {
  evidence:
    WebIntelligenceResult["evidence"];
  evidenceMap:
    Map<
      string,
      WebIntelligenceResult["evidence"][number]
    >;
  successfulSearchCount: number;
  verifiedSearchCount: number;
  independentHosts: number;
} {
  const evidenceMap =
    new Map<
      string,
      WebIntelligenceResult["evidence"][number]
    >();
  let successfulSearchCount =
    0;
  let verifiedSearchCount =
    0;
  for (
    const searchResult of
    searchResults
  ) {
    const result =
      searchResult.result;
    if (
      !result ||
      !result.success ||
      result.evidence.length ===
        0
    ) {
      continue;
    }
    successfulSearchCount +=
      1;
    if (
      result.verified
    ) {
      verifiedSearchCount +=
        1;
    }
    for (
      const item of
      result.evidence
    ) {
      if (
        !evidenceMap.has(
          item.id,
        )
      ) {
        evidenceMap.set(
          item.id,
          item,
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
          normalizeHost(
            item.hostname,
          ),
      ),
    ).size;
  return {
    evidence,
    evidenceMap,
    successfulSearchCount,
    verifiedSearchCount,
    independentHosts,
  };
}
async function runRuntimeBatch(
  evidence:
    WebIntelligenceResult["evidence"],
  batchNumber: number,
  existingNames: string[],
): Promise<{
  rawCount: number;
  candidates:
    C1441688ProductCandidate[];
  parseFailed: boolean;
  runtimeFailed: boolean;
  runtimeError?: string;
}> {
  const aggregateWeb:
    WebIntelligenceResult =
    {
      success: true,
      query:
        `C144 1688 product discovery batch ${batchNumber}`,
      verified: true,
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
        verified: true,
        score: 0.8,
        label: "medium",
        independentSourceCount:
          evidence.length,
        primarySourceFound:
          evidence.some(
            (item) =>
              is1688Host(
                item.hostname,
              ),
          ),
        corroborated:
          new Set(
            evidence.map(
              (item) =>
                normalizeHost(
                  item.hostname,
                ),
            ),
          ).size >= 2,
      },
      retrievalMode:
        "web-search",
    };
  let runtime;
  try {
    runtime =
      await executeRuntime({
        prompt:
          buildBatchPrompt(
            evidence,
            batchNumber,
            existingNames,
          ),
        locale:
          "zh-CN",
        webContext:
          aggregateWeb,
      });
  } catch (error) {
    return {
      rawCount: 0,
      candidates: [],
      parseFailed: false,
      runtimeFailed: true,
      runtimeError:
        error instanceof Error
          ? error.message
          : "COMMERCE_DISCOVERY_RUNTIME_EXCEPTION",
    };
  }
  if (
    !runtime.success
  ) {
    return {
      rawCount: 0,
      candidates: [],
      parseFailed: false,
      runtimeFailed: true,
      runtimeError:
        "COMMERCE_DISCOVERY_RUNTIME_FAILED",
    };
  }
  const parsed =
    extractJsonObject(
      runtime.content,
    );
  if (!parsed) {
    return {
      rawCount: 0,
      candidates: [],
      parseFailed: true,
      runtimeFailed: false,
      runtimeError:
        "COMMERCE_DISCOVERY_JSON_PARSE_FAILED",
    };
  }
  const rawCandidates =
    Array.isArray(
      parsed.candidates,
    )
      ? parsed.candidates
      : [];
  const candidates =
    rawCandidates
      .map(
        (item) =>
          validateCandidate(
            item as RuntimeCandidate,
            new Map(
              evidence.map(
                (source) => [
                  source.id,
                  source,
                ],
              ),
            ),
          ),
      )
      .filter(
        (
          item,
        ): item is C1441688ProductCandidate =>
          Boolean(
            item,
          ),
      );
  return {
    rawCount:
      rawCandidates.length,
    candidates,
    parseFailed: false,
    runtimeFailed: false,
  };
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
  let searchResults:
    SearchRunResult[] = [];
  let evidence:
    WebIntelligenceResult["evidence"] = [];
  let evidenceMap =
    new Map<
      string,
      WebIntelligenceResult["evidence"][number]
    >();
  let successfulSearchCount =
    0;
  let verifiedSearchCount =
    0;
  let independentHosts =
    0;
  let runtimeBatchCount =
    0;
  let runtimeParseFailures =
    0;
  let runtimeFailures =
    0;
  let rawCandidateCount =
    0;
  let discardedCandidateCount =
    0;
  try {
    searchResults =
      await runSearches();
    const collected =
      collectEvidence(
        searchResults,
      );
    evidence =
      collected.evidence;
    evidenceMap =
      collected.evidenceMap;
    successfulSearchCount =
      collected.successfulSearchCount;
    verifiedSearchCount =
      collected.verifiedSearchCount;
    independentHosts =
      collected.independentHosts;
    if (
      evidence.length <
        MIN_EVIDENCE ||
      independentHosts <
        MIN_INDEPENDENT_HOSTS ||
      verifiedSearchCount <
        MIN_VERIFIED_SEARCHES
    ) {
      const result:
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
            successfulSearchCount,
          sourceCount:
            evidence.length,
          independentHosts,
          candidates: [],
          evidence,
          discardedCandidateCount: 0,
          conclusion:
            "Live search completed, but verified commercial evidence is insufficient for safe 1688 product discovery.",
          nextStep:
            "Inspect the retained search evidence and rerun after the web evidence path returns stronger 1688 procurement and demand evidence.",
          error:
            searchResults
              .every(
                (item) =>
                  !item.result,
              )
              ? "ALL_WEB_SEARCHES_FAILED"
              : undefined,
        };
      await updatePersistentTask(
        taskId,
        {
          status: "todo",
          description:
            [
              "Commercial Objective:",
              project.objective.id,
              "",
              `Searches: ${SEARCH_QUERIES.length}`,
              `Successful searches: ${successfulSearchCount}`,
              `Verified searches: ${verifiedSearchCount}`,
              `Sources: ${evidence.length}`,
              `Independent hosts: ${independentHosts}`,
              "",
              result.nextStep,
            ].join(
              "\n",
            ),
        },
      );
      await storage.set(
        RESULT_STORAGE_KEY,
        result,
      );
      return result;
    }
    const accepted:
      C1441688ProductCandidate[] =
      [];
    const acceptedNames:
      string[] = [];
    for (
      let batchNumber = 1;
      batchNumber <=
        MAX_RUNTIME_BATCHES;
      batchNumber += 1
    ) {
      if (
        accepted.length >=
        MAX_CANDIDATES
      ) {
        break;
      }
      runtimeBatchCount +=
        1;
      const batch =
        await runRuntimeBatch(
          evidence,
          batchNumber,
          acceptedNames,
        );
      rawCandidateCount +=
        batch.rawCount;
      if (
        batch.parseFailed
      ) {
        runtimeParseFailures +=
          1;
      }
      if (
        batch.runtimeFailed
      ) {
        runtimeFailures +=
          1;
      }
      discardedCandidateCount +=
        Math.max(
          0,
          batch.rawCount -
            batch.candidates.length,
        );
      const merged =
        rankCandidates([
          ...accepted,
          ...batch.candidates,
        ]);
      accepted.length = 0;
      accepted.push(
        ...merged,
      );
      acceptedNames.length =
        0;
      acceptedNames.push(
        ...accepted.map(
          (candidate) =>
            candidate.productName,
        ),
      );
      if (
        accepted.length >=
        MAX_CANDIDATES
      ) {
        break;
      }
      if (
        batch.runtimeFailed ||
        batch.parseFailed
      ) {
        continue;
      }
    }
    const candidates =
      rankCandidates(
        accepted,
      );
    const ready =
      candidates.length >=
      MAX_CANDIDATES;
    const result:
      C1441688ProductDiscoveryResult =
      {
        success: ready,
        status: ready
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
          successfulSearchCount,
        sourceCount:
          evidence.length,
        independentHosts,
        candidates,
        evidence,
        discardedCandidateCount:
          discardedCandidateCount +
          Math.max(
            0,
            rawCandidateCount -
              candidates.length -
              discardedCandidateCount,
          ),
        conclusion:
          ready
            ? "AIOS produced 30 evidence-bound 1688 one-piece dropshipping candidates from verified live evidence."
            : `AIOS produced ${candidates.length} evidence-bound candidates. It did not fabricate the remaining candidates.`,
        nextStep:
          ready
            ? "Manually validate the top 10 suppliers, one-piece dropshipping terms, sample cost, shipping, actual listing price, and content test conditions."
            : "Strengthen the live procurement and demand evidence path, then rerun C144.4.3.",
        error:
          runtimeParseFailures >
          0
            ? "RUNTIME_BATCH_JSON_PARSE_PARTIAL"
            : runtimeFailures >
              0
              ? "RUNTIME_BATCH_PARTIAL_FAILURE"
              : undefined,
      };
    await storage.set(
      RESULT_STORAGE_KEY,
      result,
    );
    await updatePersistentTask(
      taskId,
      {
        status:
          ready
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
            `Searches: ${SEARCH_QUERIES.length}`,
            `Successful searches: ${successfulSearchCount}`,
            `Verified searches: ${verifiedSearchCount}`,
            `Sources: ${evidence.length}`,
            `Independent hosts: ${independentHosts}`,
            `Runtime batches: ${runtimeBatchCount}`,
            `Runtime parse failures: ${runtimeParseFailures}`,
            `Runtime failures: ${runtimeFailures}`,
            `Raw candidates: ${rawCandidateCount}`,
            `Validated candidates: ${candidates.length}`,
            "",
            result.nextStep,
            "",
            "No external order, customer, revenue, or profit is claimed by this task.",
          ].join(
            "\n",
          ),
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
          successfulSearchCount,
        sourceCount:
          evidence.length,
        independentHosts,
        candidates: [],
        evidence,
        discardedCandidateCount:
          discardedCandidateCount,
        conclusion:
          "The 1688 product discovery task failed before a verified commercial result could be produced.",
        nextStep:
          "Inspect the retained web evidence and Runtime batch diagnostics, then rerun C144.4.3.",
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_C144_4_3_ERROR",
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
      MAX_CANDIDATES &&
    result.sourceCount >=
      MIN_EVIDENCE &&
    result.independentHosts >=
      MIN_INDEPENDENT_HOSTS &&
    Boolean(
      result.taskId,
    ) &&
    Boolean(
      result.objectiveId,
    )
  );
}
