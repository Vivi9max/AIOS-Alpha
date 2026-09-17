import {
executeCommerceMarketIntelligence,
} from “./commerce-market-intelligence-runtime”;

import type {
CommerceMarketIntelligence,
} from “./commerce-market-intelligence-runtime”;

import type {
CommerceProductIntelligence,
} from “./commerce-product-intelligence-runtime”;

export interface CommerceCandidateInput {
name: string;
category: string;
type: string;
sellingPoints?: string[];
demonstration?: string[];
commercialSignalScore?: number;
}

export interface CommerceCandidateResult {
rank: number;
candidate: CommerceCandidateInput;
productIntelligence: CommerceProductIntelligence;
marketIntelligence?: CommerceMarketIntelligence;
evidenceScore: number;
evidenceCompleteness: number;
priceSignalScore: number;
supplySignalScore: number;
competitionSignalScore: number;
contentSignalScore: number;
verified: boolean;
priority: “high” | “medium” | “low” | “unknown”;
unknowns: string[];
nextActions: string[];
}

export interface CommerceCandidatePoolResult {
success: boolean;
code: string;
requestedCount: number;
processedCount: number;
verifiedCount: number;
highPriorityCount: number;
candidates: CommerceCandidateResult[];
shortlist: CommerceCandidateResult[];
comparison: {
rankingMethod: string[];
strongestEvidence: string[];
weakestEvidence: string[];
};
boundaries: string[];
error?: string;
}

const MAX_CANDIDATES = 30;
const MAX_SHORTLIST = 10;
const DEFAULT_CONCURRENCY = 2;

function clean(
value: unknown,
): string {
return typeof value === “string”
? value
.replace(/\s+/g, “ “)
.trim()
: “”;
}

function unique(
values: string[],
max = 20,
): string[] {
return Array.from(
new Set(
values
.map(clean)
.filter(Boolean),
),
).slice(0, max);
}

function clamp(
value: number,
): number {
return Math.max(
0,
Math.min(
100,
Math.round(value),
),
);
}

function normalizeCandidate(
input: CommerceCandidateInput,
): CommerceCandidateInput {
return {
name: clean(input.name),
category: clean(input.category),
type: clean(input.type),
sellingPoints: unique(
input.sellingPoints ?? [],
8,
),
demonstration: unique(
input.demonstration ?? [],
8,
),
commercialSignalScore: clamp(
Number(
input.commercialSignalScore ?? 0,
),
),
};
}

function buildProductIntelligence(
candidate: CommerceCandidateInput,
): CommerceProductIntelligence {
const sellingPoints =
unique(
candidate.sellingPoints ?? [],
8,
);

const demonstration =
unique(
candidate.demonstration ?? [],
8,
);

return {
success: true,
code:
“C145_1_COMMERCE_PRODUCT_INTELLIGENCE_PASS”,
product: {
name: candidate.name,
category: candidate.category,
type: candidate.type,
},
visualSignals: {
appearance: [],
packaging: [],
demonstration,
peopleActions: [],
textOverlays: [],
priceSignals: [],
},
sellingPoints,
targetCustomer:
“待进一步验证”,
marketingPattern: {
hook:
“待进一步验证”,
demonstration:
demonstration.join(”、”) ||
“待进一步验证”,
emotionalTrigger:
“待进一步验证”,
purchaseTrigger:
“待进一步验证”,
},
evidence: [],
confidence: {
product: 100,
sellingPoints:
sellingPoints.length > 0
? 70
: 0,
price: 0,
commercialSignal:
clamp(
Number(
candidate.commercialSignalScore ?? 0,
),
),
},
unknowns: [
“候选商品尚未完成独立 Video Vision 验证。”,
“真实售价需要外部证据确认。”,
“真实采购成本需要1688证据确认。”,
],
nextActions: [
“对候选商品执行独立 Video Vision 商品识别。”,
],
source: {
type: “video-vision”,
model:
“C145.4 candidate-pool input”,
},
};
}

function scoreCandidate(
product: CommerceProductIntelligence,
market: CommerceMarketIntelligence,
): CommerceCandidateResult {
const marketVerified =
market.verification.marketVerified;

const supplyVerified =
market.verification.supplyVerified;

const priceFound =
market.verification.priceEvidenceFound;

const competitorFound =
market.verification.competitorEvidenceFound;

const supplierFound =
market.verification.supplierEvidenceFound;

const marketScore =
marketVerified ? 100 : 0;

const supplyScore =
supplyVerified ? 100 : 0;

const priceScore =
priceFound
? market.priceSignals.length > 0
? 100
: 50
: 0;

/*

* Competition is deliberately treated as an
* evidence-availability signal, not as a claim
* that the market is objectively competitive.
    */
    const competitionScore =
    competitorFound
    ? 100
    : 0;

const contentScore =
clamp(
product.confidence
.commercialSignal,
);

const completenessParts = [
marketVerified,
supplyVerified,
priceFound,
competitorFound,
supplierFound,
];

const evidenceCompleteness =
clamp(
(
completenessParts.filter(
Boolean,
).length /
completenessParts.length
) * 100,
);

const evidenceScore =
clamp(
marketScore * 0.25 +
supplyScore * 0.25 +
priceScore * 0.20 +
competitionScore * 0.10 +
contentScore * 0.20,
);

let priority:
| “high”
| “medium”
| “low”
| “unknown”;

if (
market.verification.overallVerified &&
evidenceScore >= 80
) {
priority = “high”;
} else if (
market.verification.overallVerified &&
evidenceScore >= 60
) {
priority = “medium”;
} else if (
market.verification.overallVerified
) {
priority = “low”;
} else {
priority = “unknown”;
}

const unknowns = unique([
…market.unknowns,
…product.unknowns,
“候选池比较不等于真实销量比较。”,
“候选池比较不等于真实利润比较。”,
“搜索价格不等于实际成交价格。”,
“搜索采购价格不等于最终采购成本。”,
], 20);

const nextActions = unique([
…market.nextActions,
“人工核验入选商品的1688供应商页面。”,
“人工确认相同规格下的市场售价。”,
], 10);

return {
rank: 0,
candidate: {
name:
product.product.name,
category:
product.product.category,
type:
product.product.type,
sellingPoints:
product.sellingPoints,
demonstration:
product.visualSignals
.demonstration,
commercialSignalScore:
product.confidence
.commercialSignal,
},
productIntelligence:
product,
marketIntelligence:
market,
evidenceScore,
evidenceCompleteness,
priceSignalScore:
priceScore,
supplySignalScore:
supplyScore,
competitionSignalScore:
competitionScore,
contentSignalScore:
contentScore,
verified:
market.verification
.overallVerified,
priority,
unknowns,
nextActions,
};
}

function rankCandidates(
candidates: CommerceCandidateResult[],
): CommerceCandidateResult[] {
return […candidates]
.sort(
(a, b) =>
b.evidenceScore -
a.evidenceScore ||
b.evidenceCompleteness -
a.evidenceCompleteness ||
b.supplySignalScore -
a.supplySignalScore ||
b.priceSignalScore -
a.priceSignalScore,
)
.map(
(item, index) => ({
…item,
rank: index + 1,
}),
);
}

function buildComparison(
candidates: CommerceCandidateResult[],
): CommerceCandidatePoolResult[“comparison”] {
if (candidates.length === 0) {
return {
rankingMethod: [
“没有可比较候选商品。”,
],
strongestEvidence: [],
weakestEvidence: [],
};
}

const strongest =
[…candidates]
.sort(
(a, b) =>
b.evidenceScore -
a.evidenceScore,
)
.slice(0, 5)
.map(
(item) =>
${item.candidate.name} · evidence ${item.evidenceScore}/100 · completeness ${item.evidenceCompleteness}%,
);

const weakest =
[…candidates]
.sort(
(a, b) =>
a.evidenceScore -
b.evidenceScore,
)
.slice(0, 5)
.map(
(item) =>
${item.candidate.name} · evidence ${item.evidenceScore}/100 · completeness ${item.evidenceCompleteness}%,
);

return {
rankingMethod: [
“证据完整度优先。”,
“市场证据与供应链证据分别计算。”,
“价格信号只代表外部价格证据存在，不代表最终利润。”,
“竞品信号只代表竞争证据存在，不直接判断竞争强弱。”,
“内容信号来自候选商品输入，不替代真实 Video Vision。”,
“没有证据的维度保持未知，不用模型猜测补齐。”,
],
strongestEvidence:
strongest,
weakestEvidence:
weakest,
};
}

async function processOneCandidate(
candidate: CommerceCandidateInput,
): Promise {
const normalized =
normalizeCandidate(
candidate,
);

const product =
buildProductIntelligence(
normalized,
);

try {
const market =
await executeCommerceMarketIntelligence(
product,
);

return scoreCandidate(
  product,
  market,
);

} catch (error) {
const message =
error instanceof Error
? error.message
: “Unknown candidate processing error.”;

const fallbackMarket =
  {
    success: false,
    code:
      "C145_4_CANDIDATE_MARKET_ERROR",
    product: {
      name: normalized.name,
      category:
        normalized.category,
      type:
        normalized.type,
      searchQueries: [],
    },
    marketEvidence: [],
    supplyEvidence: [],
    priceSignals: [],
    competitorSignals: [],
    supplierSignals: [],
    verification: {
      marketVerified: false,
      supplyVerified: false,
      priceEvidenceFound: false,
      competitorEvidenceFound: false,
      supplierEvidenceFound: false,
      independentMarketSources: 0,
      independentSupplySources: 0,
      overallVerified: false,
      score: 0,
    },
    confidence: {
      market: 0,
      supply: 0,
      price: 0,
      competition: 0,
    },
    unknowns: [
      "候选商品市场检索失败。",
    ],
    nextActions: [
      "重新执行该候选商品检索。",
    ],
    retrieval: {
      market: {
        success: false,
        query: "",
        sourceCount: 0,
        sourceHosts: [],
        verified: false,
      },
      price: {
        success: false,
        query: "",
        sourceCount: 0,
        sourceHosts: [],
        verified: false,
      },
      supply1688: {
        success: false,
        query: "",
        sourceCount: 0,
        sourceHosts: [],
        verified: false,
      },
    },
    error: message,
  } as CommerceMarketIntelligence;
return scoreCandidate(
  product,
  fallbackMarket,
);

}
}

export async function executeCommerceCandidatePool(
inputs: CommerceCandidateInput[],
options?: {
maxCandidates?: number;
concurrency?: number;
},
): Promise {
const requestedCount =
inputs.length;

const maxCandidates = Math.max(
1,
Math.min(
MAX_CANDIDATES,
Math.floor(
options?.maxCandidates ??
MAX_CANDIDATES,
),
),
);

const candidates =
inputs
.slice(0, maxCandidates)
.map(normalizeCandidate)
.filter(
(item) =>
Boolean(item.name),
);

if (candidates.length === 0) {
return {
success: false,
code:
“C145_4_COMMERCE_CANDIDATE_POOL_EMPTY”,
requestedCount,
processedCount: 0,
verifiedCount: 0,
highPriorityCount: 0,
candidates: [],
shortlist: [],
comparison: buildComparison([]),
boundaries: [
“C145.4 不自动创造没有输入依据的商品。”,
“C145.4 不承诺销量或利润。”,
],
error:
“At least one valid candidate is required.”,
};
}

const concurrency = Math.max(
1,
Math.min(
4,
Math.floor(
options?.concurrency ??
DEFAULT_CONCURRENCY,
),
),
);

const results:
CommerceCandidateResult[] = [];

for (
let index = 0;
index < candidates.length;
index += concurrency
) {
const batch =
candidates.slice(
index,
index + concurrency,
);

const batchResults =
  await Promise.all(
    batch.map(
      processOneCandidate,
    ),
  );
results.push(
  ...batchResults,
);

}

const ranked =
rankCandidates(results);

const shortlist =
ranked
.filter(
(item) =>
item.verified,
)
.slice(
0,
MAX_SHORTLIST,
);

const verifiedCount =
ranked.filter(
(item) =>
item.verified,
).length;

const highPriorityCount =
ranked.filter(
(item) =>
item.priority === “high”,
).length;

return {
success:
ranked.length > 0,
code:
“C145_4_COMMERCE_CANDIDATE_POOL_PASS”,
requestedCount,
processedCount:
ranked.length,
verifiedCount,
highPriorityCount,
candidates:
ranked,
shortlist,
comparison:
buildComparison(ranked),
boundaries: [
“C145.4 是证据比较层，不是自动选品承诺。”,
“没有证据的维度保持未知。”,
“搜索价格不等于实际成交价格。”,
“搜索采购价格不等于最终采购成本。”,
“候选排名不是销量排名。”,
“候选排名不是利润排名。”,
“不自动采购、不自动下单。”,
“进入抖音测试前仍需人工核验商品、供应商和经营成本。”,
],
};
}

export function createDefaultCommerceCandidates(): CommerceCandidateInput[] {
return [
{
name: “便携小风扇”,
category: “小家电”,
type: “便携风扇”,
sellingPoints: [“便携”, “小型化”, “移动使用”],
demonstration: [“手持展示”],
commercialSignalScore: 75,
},
{
name: “桌面小风扇”,
category: “小家电”,
type: “桌面风扇”,
sellingPoints: [“桌面使用”, “静音”, “USB供电”],
demonstration: [“桌面使用”],
commercialSignalScore: 70,
},
{
name: “挂脖小风扇”,
category: “小家电”,
type: “挂脖风扇”,
sellingPoints: [“免手持”, “便携”, “户外使用”],
demonstration: [“佩戴展示”],
commercialSignalScore: 75,
},
{
name: “制冷小风扇”,
category: “小家电”,
type: “制冷风扇”,
sellingPoints: [“降温”, “便携”, “多档调节”],
demonstration: [“制冷效果展示”],
commercialSignalScore: 78,
},
{
name: “迷你加湿器”,
category: “小家电”,
type: “便携加湿器”,
sellingPoints: [“小型化”, “便携”, “桌面使用”],
demonstration: [“雾化展示”],
commercialSignalScore: 70,
},
{
name: “USB桌面加湿器”,
category: “小家电”,
type: “USB加湿器”,
sellingPoints: [“USB供电”, “桌面”, “便携”],
demonstration: [“雾化展示”],
commercialSignalScore: 68,
},
{
name: “充电小夜灯”,
category: “家居用品”,
type: “LED小夜灯”,
sellingPoints: [“便携”, “氛围照明”, “充电”],
demonstration: [“夜间照明”],
commercialSignalScore: 72,
},
{
name: “感应小夜灯”,
category: “家居用品”,
type: “人体感应灯”,
sellingPoints: [“自动感应”, “安装简单”, “夜间照明”],
demonstration: [“感应亮灯”],
commercialSignalScore: 78,
},
{
name: “磁吸手机支架”,
category: “数码配件”,
type: “手机支架”,
sellingPoints: [“磁吸”, “便携”, “桌面使用”],
demonstration: [“吸附展示”],
commercialSignalScore: 75,
},
{
name: “折叠手机支架”,
category: “数码配件”,
type: “折叠支架”,
sellingPoints: [“折叠”, “便携”, “多角度”],
demonstration: [“折叠展示”],
commercialSignalScore: 70,
},
{
name: “桌面收纳盒”,
category: “家居用品”,
type: “桌面收纳”,
sellingPoints: [“收纳”, “节省空间”, “桌面整理”],
demonstration: [“收纳前后对比”],
commercialSignalScore: 68,
},
{
name: “线材收纳盒”,
category: “数码配件”,
type: “线材收纳”,
sellingPoints: [“整理线材”, “便携”, “桌面整洁”],
demonstration: [“整理展示”],
commercialSignalScore: 70,
},
{
name: “键盘清洁工具”,
category: “数码配件”,
type: “清洁工具”,
sellingPoints: [“清洁”, “小型化”, “易操作”],
demonstration: [“清洁前后”],
commercialSignalScore: 80,
},
{
name: “屏幕清洁套装”,
category: “数码配件”,
type: “清洁套装”,
sellingPoints: [“清洁”, “便携”, “多设备”],
demonstration: [“清洁前后”],
commercialSignalScore: 78,
},
{
name: “衣物去毛器”,
category: “家居用品”,
type: “衣物清洁”,
sellingPoints: [“去毛”, “便携”, “快速使用”],
demonstration: [“使用前后对比”],
commercialSignalScore: 82,
},
{
name: “便携 lint remover”,
category: “家居用品”,
type: “衣物去毛”,
sellingPoints: [“便携”, “去毛”, “快速”],
demonstration: [“衣物清洁展示”],
commercialSignalScore: 78,
},
{
name: “鞋子清洁刷”,
category: “家居用品”,
type: “鞋类清洁”,
sellingPoints: [“清洁”, “刷洗”, “便携”],
demonstration: [“清洁前后”],
commercialSignalScore: 76,
},
{
name: “厨房油污清洁刷”,
category: “厨房用品”,
type: “清洁工具”,
sellingPoints: [“去油污”, “刷洗”, “快速”],
demonstration: [“油污清洁”],
commercialSignalScore: 82,
},
{
name: “硅胶厨房刮刀”,
category: “厨房用品”,
type: “厨房工具”,
sellingPoints: [“刮取”, “易清洁”, “耐用”],
demonstration: [“食材刮取”],
commercialSignalScore: 68,
},
{
name: “封口夹”,
category: “厨房用品”,
type: “食品封口”,
sellingPoints: [“密封”, “防潮”, “重复使用”],
demonstration: [“包装封口”],
commercialSignalScore: 74,
},
{
name: “冰箱收纳盒”,
category: “家居用品”,
type: “冰箱收纳”,
sellingPoints: [“分类收纳”, “节省空间”, “透明”],
demonstration: [“收纳前后”],
commercialSignalScore: 72,
},
{
name: “旅行分装瓶”,
category: “日用百货”,
type: “旅行用品”,
sellingPoints: [“便携”, “分装”, “旅行”],
demonstration: [“装液展示”],
commercialSignalScore: 74,
},
{
name: “便携折叠水杯”,
category: “日用百货”,
type: “折叠水杯”,
sellingPoints: [“折叠”, “便携”, “户外”],
demonstration: [“展开折叠”],
commercialSignalScore: 76,
},
{
name: “桌面手机充电支架”,
category: “数码配件”,
type: “充电支架”,
sellingPoints: [“充电”, “支架”, “桌面”],
demonstration: [“充电展示”],
commercialSignalScore: 72,
},
{
name: “汽车手机支架”,
category: “汽车用品”,
type: “车载支架”,
sellingPoints: [“车载”, “固定”, “便携”],
demonstration: [“安装展示”],
commercialSignalScore: 75,
},
{
name: “汽车遮阳挡”,
category: “汽车用品”,
type: “遮阳用品”,
sellingPoints: [“遮阳”, “折叠”, “车内使用”],
demonstration: [“安装前后”],
commercialSignalScore: 72,
},
{
name: “便携雨衣”,
category: “户外用品”,
type: “轻便雨衣”,
sellingPoints: [“便携”, “防雨”, “收纳”],
demonstration: [“穿戴展示”],
commercialSignalScore: 70,
},
{
name: “折叠购物袋”,
category: “日用百货”,
type: “环保购物袋”,
sellingPoints: [“折叠”, “便携”, “重复使用”],
demonstration: [“展开折叠”],
commercialSignalScore: 68,
},
{
name: “桌面理线器”,
category: “数码配件”,
type: “理线器”,
sellingPoints: [“理线”, “桌面整洁”, “安装简单”],
demonstration: [“整理线材”],
commercialSignalScore: 72,
},
{
name: “便携电子秤”,
category: “日用百货”,
type: “电子秤”,
sellingPoints: [“便携”, “称重”, “旅行”],
demonstration: [“称重展示”],
commercialSignalScore: 76,
},
];
}
