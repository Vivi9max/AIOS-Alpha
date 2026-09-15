import { initializeFirstCashflowProject } from "@/lib/commercial/first-cashflow-project";
import {
  executeLiveCommercialOpportunity,
  isLiveCommercialOpportunityReady,
  type LiveCommercialOpportunityResult,
} from "@/lib/runtime/live-commercial-opportunity";
export interface C144FirstCustomerTask {
  id: string;
  title: string;
  status: "todo" | "doing" | "done" | "blocked";
  priority: "critical";
  objectiveId: string;
  target: string;
  successSignal: string;
  executionMode: "manual-founder";
  externalSideEffectExecuted: false;
}
export interface C144FirstCustomerDiscoveryResult {
  success: boolean;
  status: "ready" | "search-blocked" | "runtime-blocked";
  taskId: string;
  objectiveId: string;
  task?: C144FirstCustomerTask;
  opportunity?: LiveCommercialOpportunityResult;
  nextStep: string;
}
const C144_TASK_ID = "C144-FIRST-CUSTOMER";
const FIRST_CUSTOMER_DISCOVERY_PROMPT = `
AIOS FIRST CUSTOMER DISCOVERY TASK
Goal:
Find the most realistic path to AIOS's first paying customer.
Current commercial objective:
AIOS 30-Day First Cashflow Project.
Target revenue: CNY 5,000.
Target customers: 1.
Primary offer:
AIOS-powered cross-border market intelligence,
product validation, competitive research,
opportunity discovery, and market-entry decision support.
TARGET MARKET:
Prioritize real businesses and organizations connected to:
1. Chinese manufacturers, suppliers, exporters, sellers, brands, or small businesses.
2. Companies seeking Japan market entry or expansion.
3. Cross-border e-commerce businesses.
4. Companies expanding overseas.
5. Companies testing products or validating demand before entering a new market.
6. Businesses with current Japan-related sales, hiring, distribution, partnerships,
   overseas expansion,招商, sourcing, exporting, or market-entry activity.
IMPORTANT:
Do NOT return generic market theory.
Do NOT return only consumer trends.
Do NOT return only AI industry news.
Do NOT return only broad e-commerce statistics.
We need evidence that can lead to a real paying business customer.
LIVE WEB RESEARCH REQUIREMENTS:
Use current external web information and prioritize recent information.
Search for explicit current commercial signals including:
- market trend
- sales
- competitors
- market share
- sales growth
- product demand
- cross-border e-commerce
- overseas expansion
- Japan market entry
- Japan expansion
- China export
- Chinese company overseas expansion
- company hiring
- company recruitment
- distributor search
- supplier search
- partnership
- market-entry activity
- product launch
- new market
- international business
- Japan business
- Japan sales
- Japan distribution
Use equivalent Chinese and Japanese concepts where appropriate:
- 市场趋势
- 销量
- 竞争对手
- 市场份额
- 销售增长
- 产品需求
- 跨境电商
- 出海
- 日本市场
- 日本市场进入
- 日本业务
- 日本销售
- 日本渠道
- 海外扩张
- 招聘
- 招商
- 经销商
- 供应商
- 合作
- 市场进入
- 产品验证
COMPANY / CUSTOMER IDENTIFICATION:
Look specifically for real companies, brands, manufacturers, exporters,
cross-border sellers, e-commerce operators, distributors, and organizations.
Where public information supports it, identify:
- company or brand name
- business type
- relevant market
- Japan or overseas activity
- current commercial signal
- why this signal indicates a potential need
- source supporting the signal
Do not claim that a company is a qualified lead merely because it appears in a search result.
Do not claim that a company wants AIOS.
Do not claim that anyone has been contacted.
Do not claim that anyone replied.
Do not claim a customer exists.
Do not claim revenue exists.
EVIDENCE REQUIREMENTS:
Return multiple independent current public sources whenever possible.
Prefer:
- official company websites
- company announcements
- recruitment pages
- public business information
- reputable business or industry media
- credible market or e-commerce reports
Avoid relying on a single source.
The evidence must support an actual commercial opportunity rather than a generic topic.
COMMERCIAL DECISION:
From the verified evidence, determine the single highest-priority customer segment
or business opportunity that AIOS can realistically approach first.
Then produce:
1. FACTS supported by current sources.
2. COMMERCIAL JUDGMENT.
3. KEY RISKS.
4. OPPORTUNITY.
5. RECOMMENDED ACTIONS.
6. The smallest practical manual customer-acquisition action.
7. A measurable success signal.
The recommended action must be realistic for a solo founder operating without
social-media, messaging, advertising, or marketplace execution APIs.
CURRENT EXECUTION MODEL:
AIOS performs:
- live intelligence
- evidence verification
- analysis
- commercial decision
- opportunity prioritization
- execution planning
- task generation
- result analysis
Founder performs external actions manually until authorized external adapters exist.
Therefore:
AIOS MUST NOT claim to have sent messages,
published content,
contacted prospects,
created advertising campaigns,
created marketplace listings,
received replies,
won customers,
or generated revenue.
FINAL OUTPUT OBJECTIVE:
Convert verified live market intelligence into ONE highest-priority
first-customer acquisition task that the founder can execute manually.
The task should help identify and manually approach 5 highly relevant prospective
customers or businesses based on verified evidence, with the goal of obtaining
at least 1 qualified response or request for more information.
`.trim();
function buildTask(objectiveId: string): C144FirstCustomerTask {
  return {
    id: C144_TASK_ID,
    title: "Find and validate the first paying customer",
    status: "todo",
    priority: "critical",
    objectiveId,
    target:
      "Identify and manually approach 5 highly relevant prospective customers or businesses based on the verified opportunity.",
    successSignal:
      "At least 1 prospective customer provides a qualified response or requests more information.",
    executionMode: "manual-founder",
    externalSideEffectExecuted: false,
  };
}
function buildBlockedResult(
  status: "search-blocked" | "runtime-blocked",
  objectiveId: string,
  opportunity?: LiveCommercialOpportunityResult,
): C144FirstCustomerDiscoveryResult {
  return {
    success: false,
    status,
    taskId: C144_TASK_ID,
    objectiveId,
    opportunity,
    nextStep:
      status === "search-blocked"
        ? "Strengthen the live evidence before converting it into a commercial decision."
        : "Review the commercial runtime block before starting the first-customer task.",
  };
}
export async function discoverFirstCustomer(): Promise<C144FirstCustomerDiscoveryResult> {
  const project = await initializeFirstCashflowProject();
  if (!project.success || !project.objective) {
    return {
      success: false,
      status: "runtime-blocked",
      taskId: C144_TASK_ID,
      objectiveId: project.objective?.id ?? "",
      nextStep:
        "Initialize the first cashflow commercial objective before running customer discovery.",
    };
  }
  const objectiveId = project.objective.id;
  const opportunity = await executeLiveCommercialOpportunity({
    objectiveId,
    prompt: FIRST_CUSTOMER_DISCOVERY_PROMPT,
  });
  if (!isLiveCommercialOpportunityReady(opportunity)) {
    return buildBlockedResult(
      opportunity.status === "web-failed"
        ? "search-blocked"
        : "runtime-blocked",
      objectiveId,
      opportunity,
    );
  }
  const task = buildTask(objectiveId);
  return {
    success: true,
    status: "ready",
    taskId: task.id,
    objectiveId,
    task,
    opportunity,
    nextStep:
      "Manually validate and approach the 5 highest-priority prospective customers identified from the verified opportunity.",
  };
}
export async function executeC144FirstCustomerTask(): Promise<C144FirstCustomerDiscoveryResult> {
  return discoverFirstCustomer();
}
export function isC144FirstCustomerTaskReady(
  result: C144FirstCustomerDiscoveryResult,
): boolean {
  return (
    result.success === true &&
    result.status === "ready" &&
    result.taskId === C144_TASK_ID &&
    Boolean(result.objectiveId) &&
    Boolean(result.task) &&
    result.task.status !== "blocked" &&
    Boolean(result.opportunity) &&
    isLiveCommercialOpportunityReady(result.opportunity!)
  );
}
export function isC144FirstCustomerDiscoveryReady(
  result: C144FirstCustomerDiscoveryResult,
): boolean {
  return isC144FirstCustomerTaskReady(result);
}
