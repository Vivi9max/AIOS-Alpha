import "server-only";

import {
  createCommercialObjective,
  listCommercialObjectives,
} from "@/lib/commercial/operating-layer";

import {
  ensureCommercialOperatingLoop,
} from "@/lib/commercial/operating-loop";

import {
  C168_AD_ACQUISITION_DEFINITION,
  C168_AD_ACQUISITION_ID,
} from "@/lib/commercial/c168-ad-acquisition";

export interface C168AdAcquisitionLoopResult {
  success: boolean;
  reused: boolean;
  objectiveId: string;
  outcomeId: string;
  taskId: string;
  milestoneId: string | null;
  objectiveTitle: string;
  nextAction: string;
}

const C168_OBJECTIVE_TITLE =
  "C168 深圳家装广告获客现金流验证";

function buildObjectiveDescription(): string {
  return [
    C168_AD_ACQUISITION_DEFINITION.positioning,
    "",
    "Target:",
    `Market: ${C168_AD_ACQUISITION_DEFINITION.target.market}`,
    `Industries: ${C168_AD_ACQUISITION_DEFINITION.target.industries.join(", ")}`,
    `Geography: ${C168_AD_ACQUISITION_DEFINITION.target.geography}`,
    `Ideal Customer: ${C168_AD_ACQUISITION_DEFINITION.target.idealCustomer}`,
    "",
    "Primary Objective:",
    C168_AD_ACQUISITION_DEFINITION.primaryObjective,
    "",
    "Commercial Offer:",
    "48小时广告获客诊断 - CNY 399",
    "",
    "Upgrade Offer:",
    "7天广告获客验证 - CNY 699",
    "",
    "Operating Workflow:",
    C168_AD_ACQUISITION_DEFINITION.workflow
      .map(
        (stage, index) =>
          `${index + 1}. ${stage.name}: ${stage.objective}`,
      )
      .join("\n"),
  ].join("\n");
}

function buildSuccessCriteria(): string {
  return [
    "在30天内获得至少1个真实付费广告获客诊断客户。",
    "客户身份、需求、联系、付款和交付均必须有真实证据。",
    "完成至少一次真实广告获客诊断交付。",
    "不得把模型推测写成真实客户结果。",
    "真实收入减去已验证直接成本后必须大于0，才视为现金流验证成功。",
  ].join("\n");
}

function findExistingObjective(
  objectives: Awaited<
    ReturnType<typeof listCommercialObjectives>
  >,
) {
  return (
    objectives.find(
      (objective) =>
        objective.title ===
        C168_OBJECTIVE_TITLE &&
        objective.status !== "cancelled" &&
        objective.status !== "completed",
    ) ?? null
  );
}

export async function ensureC168AdAcquisitionLoop(): Promise<C168AdAcquisitionLoopResult> {
  const objectives =
    await listCommercialObjectives();

  const existing =
    findExistingObjective(
      objectives,
    );

  const objective =
    existing ??
    (await createCommercialObjective({
      title:
        C168_OBJECTIVE_TITLE,
      description:
        buildObjectiveDescription(),
      status: "planned",
      stage: "acquisition",
      currency: "CNY",
      revenueTarget: 399,
      costTarget: 100,
      customerTarget: 1,
      outcomeId: null,
      taskId: null,
      successCriteria:
        buildSuccessCriteria(),
      deadlineDays: 30,
    }));

  const loop =
    await ensureCommercialOperatingLoop(
      objective.id,
    );

  return {
    success:
      loop.success,
    reused:
      Boolean(existing),
    objectiveId:
      loop.objectiveId,
    outcomeId:
      loop.outcomeId,
    taskId:
      loop.taskId,
    milestoneId:
      loop.milestoneId,
    objectiveTitle:
      objective.title,
    nextAction:
      "研究并筛选第一批深圳家装、旧房局改、全屋定制广告获客候选客户。",
  };
}

export {
  C168_AD_ACQUISITION_ID,
};
