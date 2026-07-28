import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

import type {
  CreateOutcomeInput,
  Outcome,
  OutcomeMilestone,
  OutcomePriority,
  OutcomeStatus,
  OutcomeSummary,
  UpdateOutcomeInput,
} from "@/lib/outcome/types";

const MAX_OUTCOMES =
  100;

function getStorageKey():
  string {
  return createUserStorageKey(
    "outcomes"
  );
}

function createId(
  prefix:
    string
): string {
  return [
    prefix,
    Date.now().toString(
      36
    ),
    Math.random()
      .toString(36)
      .slice(
        2,
        10
      ),
  ].join(
    "-"
  );
}

function normalizeText(
  value:
    unknown,

  maxLength:
    number
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .replace(
      /\r\n/g,
      "\n"
    )
    .trim()
    .slice(
      0,
      maxLength
    );
}

function normalizePriority(
  value:
    unknown
): OutcomePriority {
  if (
    value ===
      "low" ||
    value ===
      "high" ||
    value ===
      "critical"
  ) {
    return value;
  }

  return "normal";
}

function normalizeStatus(
  value:
    unknown
): OutcomeStatus {
  if (
    value ===
      "active" ||
    value ===
      "blocked" ||
    value ===
      "completed" ||
    value ===
      "archived"
  ) {
    return value;
  }

  return "planned";
}

function normalizeProgress(
  value:
    unknown
): number {
  const number =
    typeof value ===
    "number"
      ? value
      : Number(
          value
        );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        number
      )
    )
  );
}

function isMilestone(
  value:
    unknown
): value is OutcomeMilestone {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const milestone =
    value as
      Partial<OutcomeMilestone>;

  return (
    typeof milestone.id ===
      "string" &&
    typeof milestone.title ===
      "string" &&
    typeof milestone.description ===
      "string" &&
    (
      milestone.status ===
        "pending" ||
      milestone.status ===
        "active" ||
      milestone.status ===
        "completed" ||
      milestone.status ===
        "blocked"
    ) &&
    typeof milestone.order ===
      "number" &&
    Array.isArray(
      milestone.taskIds
    ) &&
    typeof milestone.createdAt ===
      "number" &&
    typeof milestone.updatedAt ===
      "number"
  );
}

function isOutcome(
  value:
    unknown
): value is Outcome {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const outcome =
    value as
      Partial<Outcome>;

  return (
    typeof outcome.id ===
      "string" &&
    typeof outcome.title ===
      "string" &&
    typeof outcome.description ===
      "string" &&
    typeof outcome.successCriteria ===
      "string" &&
    (
      outcome.status ===
        "planned" ||
      outcome.status ===
        "active" ||
      outcome.status ===
        "blocked" ||
      outcome.status ===
        "completed" ||
      outcome.status ===
        "archived"
    ) &&
    (
      outcome.priority ===
        "low" ||
      outcome.priority ===
        "normal" ||
      outcome.priority ===
        "high" ||
      outcome.priority ===
        "critical"
    ) &&
    typeof outcome.progress ===
      "number" &&
    (
      outcome.targetDate ===
        null ||
      typeof outcome.targetDate ===
        "number"
    ) &&
    Array.isArray(
      outcome.milestones
    ) &&
    outcome.milestones.every(
      isMilestone
    ) &&
    Array.isArray(
      outcome.taskIds
    ) &&
    typeof outcome.createdAt ===
      "number" &&
    typeof outcome.updatedAt ===
      "number"
  );
}

function normalizeOutcomes(
  value:
    unknown
): Outcome[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .filter(
      isOutcome
    )
    .slice(
      -MAX_OUTCOMES
    );
}

async function readOutcomes():
  Promise<Outcome[]> {
  const stored =
    await storage.get<
      Outcome[]
    >(
      getStorageKey()
    );

  return normalizeOutcomes(
    stored
  );
}

async function writeOutcomes(
  outcomes:
    Outcome[]
): Promise<void> {
  await storage.set(
    getStorageKey(),
    outcomes.slice(
      -MAX_OUTCOMES
    )
  );
}

function createMilestones(
  items:
    CreateOutcomeInput["milestones"]
): OutcomeMilestone[] {
  const now =
    Date.now();

  return (
    items ?? []
  )
    .map(
      (
        item,
        index
      ) => ({
        id:
          createId(
            "milestone"
          ),

        title:
          normalizeText(
            item.title,
            160
          ),

        description:
          normalizeText(
            item.description,
            1000
          ),

        status:
          index === 0
            ? "active" as const
            : "pending" as const,

        order:
          index + 1,

        taskIds:
          [],

        createdAt:
          now,

        updatedAt:
          now,
      })
    )
    .filter(
      (
        milestone
      ) =>
        Boolean(
          milestone.title
        )
    );
}

export async function listOutcomes():
  Promise<Outcome[]> {
  const outcomes =
    await readOutcomes();

  return outcomes.sort(
    (
      first,
      second
    ) =>
      second.updatedAt -
      first.updatedAt
  );
}

export async function getOutcome(
  id:
    string
): Promise<Outcome | null> {
  const outcomes =
    await readOutcomes();

  return (
    outcomes.find(
      (
        outcome
      ) =>
        outcome.id ===
        id
    ) ??
    null
  );
}

export async function createOutcome(
  input:
    CreateOutcomeInput
): Promise<Outcome> {
  const title =
    normalizeText(
      input.title,
      200
    );

  if (
    !title
  ) {
    throw new Error(
      "Outcome title is required."
    );
  }

  const outcomes =
    await readOutcomes();

  const duplicate =
    outcomes.find(
      (
        outcome
      ) =>
        outcome.status !==
          "archived" &&
        outcome.status !==
          "completed" &&
        outcome.title
          .trim()
          .toLowerCase() ===
        title.toLowerCase()
    );

  if (
    duplicate
  ) {
    throw new Error(
      `DUPLICATE_OUTCOME:${duplicate.id}`
    );
  }

  const now =
    Date.now();

  const milestones =
    createMilestones(
      input.milestones
    );

  const outcome:
    Outcome = {
    id:
      createId(
        "outcome"
      ),

    title,

    description:
      normalizeText(
        input.description,
        2000
      ),

    successCriteria:
      normalizeText(
        input.successCriteria,
        1000
      ),

    status:
      "planned",

    priority:
      normalizePriority(
        input.priority
      ),

    progress:
      0,

    targetDate:
      typeof input.targetDate ===
        "number" &&
      Number.isFinite(
        input.targetDate
      )
        ? input.targetDate
        : null,

    milestones,

    taskIds:
      [],

    createdAt:
      now,

    updatedAt:
      now,
  };

  outcomes.push(
    outcome
  );

  await writeOutcomes(
    outcomes
  );

  return outcome;
}

export async function updateOutcome(
  id:
    string,

  updates:
    UpdateOutcomeInput
): Promise<Outcome | null> {
  const outcomes =
    await readOutcomes();

  const index =
    outcomes.findIndex(
      (
        outcome
      ) =>
        outcome.id ===
        id
    );

  if (
    index === -1
  ) {
    return null;
  }

  const current =
    outcomes[index];

  const status =
    updates.status ===
      undefined
      ? current.status
      : normalizeStatus(
          updates.status
        );

  const progress =
    updates.progress ===
      undefined
      ? current.progress
      : normalizeProgress(
          updates.progress
        );

  const updated:
    Outcome = {
    ...current,

    title:
      updates.title ===
        undefined
        ? current.title
        : normalizeText(
              updates.title,
              200
            ) ||
          current.title,

    description:
      updates.description ===
        undefined
        ? current.description
        : normalizeText(
            updates.description,
            2000
          ),

    successCriteria:
      updates.successCriteria ===
        undefined
        ? current.successCriteria
        : normalizeText(
            updates.successCriteria,
            1000
          ),

    status,

    priority:
      updates.priority ===
        undefined
        ? current.priority
        : normalizePriority(
            updates.priority
          ),

    targetDate:
      updates.targetDate ===
        undefined
        ? current.targetDate
        : typeof updates.targetDate ===
              "number" &&
            Number.isFinite(
              updates.targetDate
            )
          ? updates.targetDate
          : null,

    progress:
      status ===
        "completed"
        ? 100
        : progress,

    taskIds:
      updates.taskIds ===
        undefined
        ? current.taskIds
        : Array.from(
            new Set(
              updates.taskIds.filter(
                (
                  taskId
                ) =>
                  typeof taskId ===
                    "string" &&
                  taskId.trim()
              )
            )
          ),

    completedAt:
      status ===
        "completed"
        ? current.completedAt ??
          Date.now()
        : undefined,

    updatedAt:
      Date.now(),
  };

  outcomes[index] =
    updated;

  await writeOutcomes(
    outcomes
  );

  return updated;
}

export async function updateOutcomeMilestone(
  outcomeId:
    string,

  milestoneId:
    string,

  updates: {
    status?:
      OutcomeMilestone["status"];

    title?:
      string;

    description?:
      string;

    taskIds?:
      string[];
  }
): Promise<Outcome | null> {
  const outcomes =
    await readOutcomes();

  const outcomeIndex =
    outcomes.findIndex(
      (
        outcome
      ) =>
        outcome.id ===
        outcomeId
    );

  if (
    outcomeIndex === -1
  ) {
    return null;
  }

  const outcome =
    outcomes[
      outcomeIndex
    ];

  const milestoneIndex =
    outcome.milestones.findIndex(
      (
        milestone
      ) =>
        milestone.id ===
        milestoneId
    );

  if (
    milestoneIndex ===
    -1
  ) {
    return null;
  }

  const milestone =
    outcome.milestones[
      milestoneIndex
    ];

  const status =
    updates.status ??
    milestone.status;

  const updatedMilestone:
    OutcomeMilestone = {
    ...milestone,

    title:
      updates.title ===
        undefined
        ? milestone.title
        : normalizeText(
              updates.title,
              160
            ) ||
          milestone.title,

    description:
      updates.description ===
        undefined
        ? milestone.description
        : normalizeText(
            updates.description,
            1000
          ),

    status,

    taskIds:
      updates.taskIds ===
        undefined
        ? milestone.taskIds
        : Array.from(
            new Set(
              updates.taskIds.filter(
                (
                  taskId
                ) =>
                  typeof taskId ===
                    "string" &&
                  taskId.trim()
              )
            )
          ),

    completedAt:
      status ===
        "completed"
        ? milestone.completedAt ??
          Date.now()
        : undefined,

    updatedAt:
      Date.now(),
  };

  const milestones =
    [
      ...outcome.milestones,
    ];

  milestones[
    milestoneIndex
  ] =
    updatedMilestone;

  const completedMilestones =
    milestones.filter(
      (
        item
      ) =>
        item.status ===
        "completed"
    ).length;

  const progress =
    milestones.length > 0
      ? Math.round(
          (
            completedMilestones /
            milestones.length
          ) *
            100
        )
      : outcome.progress;

  const allCompleted =
    milestones.length > 0 &&
    completedMilestones ===
      milestones.length;

  outcomes[
    outcomeIndex
  ] = {
    ...outcome,

    milestones,

    progress:
      allCompleted
        ? 100
        : progress,

    status:
      allCompleted
        ? "completed"
        : outcome.status ===
            "planned"
          ? "active"
          : outcome.status,

    completedAt:
      allCompleted
        ? outcome.completedAt ??
          Date.now()
        : outcome.completedAt,

    updatedAt:
      Date.now(),
  };

  await writeOutcomes(
    outcomes
  );

  return outcomes[
    outcomeIndex
  ];
}

export async function deleteOutcome(
  id:
    string
): Promise<boolean> {
  const outcomes =
    await readOutcomes();

  const nextOutcomes =
    outcomes.filter(
      (
        outcome
      ) =>
        outcome.id !==
        id
    );

  if (
    nextOutcomes.length ===
    outcomes.length
  ) {
    return false;
  }

  await writeOutcomes(
    nextOutcomes
  );

  return true;
}

export async function getOutcomeSummary():
  Promise<OutcomeSummary> {
  const outcomes =
    await readOutcomes();

  const total =
    outcomes.length;

  const progressTotal =
    outcomes.reduce(
      (
        sum,
        outcome
      ) =>
        sum +
        outcome.progress,
      0
    );

  return {
    total,

    planned:
      outcomes.filter(
        (
          outcome
        ) =>
          outcome.status ===
          "planned"
      ).length,

    active:
      outcomes.filter(
        (
          outcome
        ) =>
          outcome.status ===
          "active"
      ).length,

    blocked:
      outcomes.filter(
        (
          outcome
        ) =>
          outcome.status ===
          "blocked"
      ).length,

    completed:
      outcomes.filter(
        (
          outcome
        ) =>
          outcome.status ===
          "completed"
      ).length,

    archived:
      outcomes.filter(
        (
          outcome
        ) =>
          outcome.status ===
          "archived"
      ).length,

    averageProgress:
      total > 0
        ? Math.round(
            progressTotal /
              total
          )
        : 0,
  };
}

export function getOutcomeStorageKey():
  string {
  return getStorageKey();
}