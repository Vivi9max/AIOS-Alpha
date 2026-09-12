import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

export type CommercialObjectiveStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type CommercialStage =
  | "idea"
  | "validation"
  | "acquisition"
  | "conversion"
  | "delivery"
  | "retention"
  | "scaling";

export interface CommercialObjective {
  id: string;

  title: string;
  description: string;

  status: CommercialObjectiveStatus;
  stage: CommercialStage;

  currency: string;

  revenueTarget: number;
  revenueActual: number;

  costTarget: number;
  costActual: number;

  customerTarget: number;
  customerActual: number;

  outcomeId: string | null;
  taskId: string | null;

  successCriteria: string;

  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface CommercialOverview {
  objectives: CommercialObjective[];

  activeObjective: CommercialObjective | null;

  revenueTarget: number;
  revenueActual: number;
  revenueGap: number;

  customerTarget: number;
  customerActual: number;
  customerGap: number;

  progress: number;

  status:
    | "no-objective"
    | "active"
    | "completed"
    | "paused";
}

const STORAGE_RESOURCE =
  "commercial-objectives";

const MAX_OBJECTIVES = 100;

function storageKey(): string {
  return createUserStorageKey(
    STORAGE_RESOURCE,
  );
}

function createId(): string {
  return [
    "commercial",
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2, 9),
  ].join("-");
}

function normalizeText(
  value: unknown,
  maxLength: number,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function normalizeMoney(
  value: unknown,
): number {
  const number =
    typeof value ===
    "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      number * 100,
    ) / 100,
  );
}

function normalizeCount(
  value: unknown,
): number {
  const number =
    typeof value ===
    "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(number),
  );
}

function normalizeCurrency(
  value: unknown,
): string {
  const currency =
    normalizeText(
      value,
      8,
    ).toUpperCase();

  function normalizeCurrency(
  value: unknown,
): string {
  const currency =
    normalizeText(
      value,
      16,
    ).toUpperCase();

  return (
    currency ||
    "UNSPECIFIED"
  );
}

function normalizeStatus(
  value: unknown,
): CommercialObjectiveStatus {
  if (
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "planned";
}

function normalizeStage(
  value: unknown,
): CommercialStage {
  if (
    value === "validation" ||
    value === "acquisition" ||
    value === "conversion" ||
    value === "delivery" ||
    value === "retention" ||
    value === "scaling"
  ) {
    return value;
  }

  return "idea";
}

function normalizeObjective(
  value: unknown,
): CommercialObjective | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const item =
    value as Partial<CommercialObjective>;

  if (
    typeof item.id !==
      "string" ||
    typeof item.title !==
      "string" ||
    typeof item.description !==
      "string" ||
    typeof item.successCriteria !==
      "string" ||
    typeof item.createdAt !==
      "number" ||
    typeof item.updatedAt !==
      "number"
  ) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    description:
      item.description,

    status:
      normalizeStatus(
        item.status,
      ),

    stage:
      normalizeStage(
        item.stage,
      ),

    currency:
      normalizeCurrency(
        item.currency,
      ),

    revenueTarget:
      normalizeMoney(
        item.revenueTarget,
      ),

    revenueActual:
      normalizeMoney(
        item.revenueActual,
      ),

    costTarget:
      normalizeMoney(
        item.costTarget,
      ),

    costActual:
      normalizeMoney(
        item.costActual,
      ),

    customerTarget:
      normalizeCount(
        item.customerTarget,
      ),

    customerActual:
      normalizeCount(
        item.customerActual,
      ),

    outcomeId:
      typeof item.outcomeId ===
        "string"
        ? item.outcomeId
        : null,

    taskId:
      typeof item.taskId ===
        "string"
        ? item.taskId
        : null,

    successCriteria:
      item.successCriteria,

    createdAt:
      item.createdAt,

    updatedAt:
      item.updatedAt,

    completedAt:
      typeof item.completedAt ===
        "number"
        ? item.completedAt
        : undefined,
  };
}

async function readObjectives(): Promise<
  CommercialObjective[]
> {
  const stored =
    await storage.get<
      unknown[]
    >(
      storageKey(),
    );

  if (
    !Array.isArray(
      stored,
    )
  ) {
    return [];
  }

  return stored
    .map(
      normalizeObjective,
    )
    .filter(
      (
        item,
      ): item is CommercialObjective =>
        item !== null,
    )
    .slice(
      -MAX_OBJECTIVES,
    );
}

async function writeObjectives(
  objectives: CommercialObjective[],
): Promise<void> {
  await storage.set(
    storageKey(),
    objectives.slice(
      -MAX_OBJECTIVES,
    ),
  );
}

export interface CreateCommercialObjectiveInput {
  title: string;
  description?: string;

  status?:
    CommercialObjectiveStatus;

  stage?: CommercialStage;

  currency?: string;

  revenueTarget?: number;
  costTarget?: number;
  customerTarget?: number;

  outcomeId?: string | null;
  taskId?: string | null;

  successCriteria?: string;
}

export async function listCommercialObjectives(): Promise<
  CommercialObjective[]
> {
  const objectives =
    await readObjectives();

  return objectives.sort(
    (
      first,
      second,
    ) =>
      second.updatedAt -
      first.updatedAt,
  );
}

export async function getCommercialObjective(
  id: string,
): Promise<CommercialObjective | null> {
  const objectives =
    await readObjectives();

  return (
    objectives.find(
      (
        item,
      ) =>
        item.id === id,
    ) ?? null
  );
}

export async function createCommercialObjective(
  input: CreateCommercialObjectiveInput,
): Promise<CommercialObjective> {
  const title =
    normalizeText(
      input.title,
      200,
    );

  if (!title) {
    throw new Error(
      "Commercial objective title is required.",
    );
  }

  const objectives =
    await readObjectives();

  const duplicate =
    objectives.find(
      (
        item,
      ) =>
        item.status !==
          "cancelled" &&
        item.status !==
          "completed" &&
        item.title
          .toLowerCase() ===
          title.toLowerCase(),
    );

  if (duplicate) {
    throw new Error(
      `DUPLICATE_COMMERCIAL_OBJECTIVE:${duplicate.id}`,
    );
  }

  const now =
    Date.now();

  const objective: CommercialObjective =
    {
      id: createId(),

      title,

      description:
        normalizeText(
          input.description,
          2000,
        ),

      status:
        normalizeStatus(
          input.status ??
            "planned",
        ),

      stage:
        normalizeStage(
          input.stage ??
            "validation",
        ),

      currency:
        normalizeCurrency(
          input.currency,
        ),

      revenueTarget:
        normalizeMoney(
          input.revenueTarget,
        ),

      revenueActual: 0,

      costTarget:
        normalizeMoney(
          input.costTarget,
        ),

      costActual: 0,

      customerTarget:
        normalizeCount(
          input.customerTarget,
        ),

      customerActual: 0,

      outcomeId:
        input.outcomeId ??
        null,

      taskId:
        input.taskId ??
        null,

      successCriteria:
        normalizeText(
          input.successCriteria,
          1000,
        ) ||
        "Generate measurable commercial progress and record verified business results.",

      createdAt: now,
      updatedAt: now,
    };

  objectives.push(
    objective,
  );

  await writeObjectives(
    objectives,
  );

  return objective;
}

export interface UpdateCommercialObjectiveInput {
  title?: string;
  description?: string;

  status?:
    CommercialObjectiveStatus;

  stage?: CommercialStage;

  currency?: string;

  revenueTarget?: number;
  revenueActual?: number;

  costTarget?: number;
  costActual?: number;

  customerTarget?: number;
  customerActual?: number;

  outcomeId?: string | null;
  taskId?: string | null;

  successCriteria?: string;
}

export async function updateCommercialObjective(
  id: string,
  updates: UpdateCommercialObjectiveInput,
): Promise<CommercialObjective | null> {
  const objectives =
    await readObjectives();

  const index =
    objectives.findIndex(
      (
        item,
      ) =>
        item.id === id,
    );

  if (index === -1) {
    return null;
  }

  const current =
    objectives[index];

  const status =
    updates.status ??
    current.status;

  const updated: CommercialObjective =
    {
      ...current,

      title:
        updates.title ===
          undefined
          ? current.title
          : normalizeText(
              updates.title,
              200,
            ) ||
            current.title,

      description:
        updates.description ===
          undefined
          ? current.description
          : normalizeText(
              updates.description,
              2000,
            ),

      status,

      stage:
        updates.stage ===
          undefined
          ? current.stage
          : normalizeStage(
              updates.stage,
            ),

      currency:
        updates.currency ===
          undefined
          ? current.currency
          : normalizeCurrency(
              updates.currency,
            ),

      revenueTarget:
        updates.revenueTarget ===
          undefined
          ? current.revenueTarget
          : normalizeMoney(
              updates.revenueTarget,
            ),

      revenueActual:
        updates.revenueActual ===
          undefined
          ? current.revenueActual
          : normalizeMoney(
              updates.revenueActual,
            ),

      costTarget:
        updates.costTarget ===
          undefined
          ? current.costTarget
          : normalizeMoney(
              updates.costTarget,
            ),

      costActual:
        updates.costActual ===
          undefined
          ? current.costActual
          : normalizeMoney(
              updates.costActual,
            ),

      customerTarget:
        updates.customerTarget ===
          undefined
          ? current.customerTarget
          : normalizeCount(
              updates.customerTarget,
            ),

      customerActual:
        updates.customerActual ===
          undefined
          ? current.customerActual
          : normalizeCount(
              updates.customerActual,
            ),

      outcomeId:
        updates.outcomeId ===
          undefined
          ? current.outcomeId
          : updates.outcomeId,

      taskId:
        updates.taskId ===
          undefined
          ? current.taskId
          : updates.taskId,

      successCriteria:
        updates.successCriteria ===
          undefined
          ? current.successCriteria
          : normalizeText(
              updates.successCriteria,
              1000,
            ),

      completedAt:
        status ===
        "completed"
          ? current.completedAt ??
            Date.now()
          : current.completedAt,

      updatedAt:
        Date.now(),
    };

  objectives[index] =
    updated;

  await writeObjectives(
    objectives,
  );

  return updated;
}

export async function getCommercialOverview(): Promise<CommercialOverview> {
  const objectives =
    await listCommercialObjectives();

  const activeObjective =
    objectives.find(
      (
        item,
      ) =>
        item.status ===
        "active",
    ) ??
    null;

  const target =
    activeObjective ??
    objectives.find(
      (
        item,
      ) =>
        item.status ===
        "planned",
    ) ??
    null;

  if (!target) {
    return {
      objectives,
      activeObjective: null,

      revenueTarget: 0,
      revenueActual: 0,
      revenueGap: 0,

      customerTarget: 0,
      customerActual: 0,
      customerGap: 0,

      progress: 0,

      status:
        "no-objective",
    };
  }

  const revenueProgress =
    target.revenueTarget >
    0
      ? Math.min(
          100,
          Math.round(
            (target.revenueActual /
              target.revenueTarget) *
              100,
          ),
        )
      : 0;

  const customerProgress =
    target.customerTarget >
    0
      ? Math.min(
          100,
          Math.round(
            (target.customerActual /
              target.customerTarget) *
              100,
          ),
        )
      : 0;

  const progress =
    target.revenueTarget >
      0 &&
    target.customerTarget >
      0
      ? Math.round(
          (revenueProgress +
            customerProgress) /
            2,
        )
      : Math.max(
          revenueProgress,
          customerProgress,
        );

  const status =
    target.status ===
    "completed"
      ? "completed"
      : target.status ===
          "paused"
        ? "paused"
        : "active";

  return {
    objectives,
    activeObjective,

    revenueTarget:
      target.revenueTarget,

    revenueActual:
      target.revenueActual,

    revenueGap:
      Math.max(
        0,
        target.revenueTarget -
          target.revenueActual,
      ),

    customerTarget:
      target.customerTarget,

    customerActual:
      target.customerActual,

    customerGap:
      Math.max(
        0,
        target.customerTarget -
          target.customerActual,
      ),

    progress,

    status,
  };
}
