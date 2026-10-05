import "server-only";

import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

export type OutcomeReviewDecision =
  | "continue"
  | "revise"
  | "stop";

export type OutcomeReviewStatus =
  | "pending"
  | "decided";

export interface OutcomeReview {
  id: string;

  outcomeId: string;

  status:
    OutcomeReviewStatus;

  decision:
    OutcomeReviewDecision |
    null;

  summary:
    string;

  evidence:
    string[];

  blockers:
    string[];

  lessons:
    string[];

  nextGoal:
    string | null;

  createdAt:
    number;

  decidedAt:
    number | null;

  updatedAt:
    number;
}

export interface CreateOutcomeReviewInput {
  outcomeId: string;

  summary?: string;

  evidence?: string[];

  blockers?: string[];

  lessons?: string[];
}

export interface DecideOutcomeReviewInput {
  decision:
    OutcomeReviewDecision;

  nextGoal?:
    string | null;

  summary?:
    string;

  lessons?:
    string[];

  blockers?:
    string[];
}

const MAX_REVIEWS =
  100;

const MAX_TEXT_LENGTH =
  2000;

const MAX_LIST_ITEMS =
  20;

function getStorageKey():
  string {
  return createUserStorageKey(
    "outcome-reviews"
  );
}

function createId():
  string {
  return [
    "outcome-review",
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
  maxLength =
    MAX_TEXT_LENGTH
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

function normalizeList(
  value:
    unknown
): string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (
            item
          ) =>
            normalizeText(
              item,
              500
            )
        )
        .filter(
          Boolean
        )
    )
  ).slice(
    0,
    MAX_LIST_ITEMS
  );
}

function isDecision(
  value:
    unknown
): value is OutcomeReviewDecision {
  return (
    value ===
      "continue" ||
    value ===
      "revise" ||
    value ===
      "stop"
  );
}

function isReview(
  value:
    unknown
): value is OutcomeReview {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const review =
    value as
      Partial<OutcomeReview>;

  return (
    typeof review.id ===
      "string" &&
    typeof review.outcomeId ===
      "string" &&
    (
      review.status ===
        "pending" ||
      review.status ===
        "decided"
    ) &&
    (
      review.decision ===
        null ||
      isDecision(
        review.decision
      )
    ) &&
    typeof review.summary ===
      "string" &&
    Array.isArray(
      review.evidence
    ) &&
    Array.isArray(
      review.blockers
    ) &&
    Array.isArray(
      review.lessons
    ) &&
    (
      review.nextGoal ===
        null ||
      typeof review.nextGoal ===
        "string"
    ) &&
    typeof review.createdAt ===
      "number" &&
    (
      review.decidedAt ===
        null ||
      typeof review.decidedAt ===
        "number"
    ) &&
    typeof review.updatedAt ===
      "number"
  );
}

async function readReviews():
  Promise<OutcomeReview[]> {
  const stored =
    await storage.get<
      unknown
    >(
      getStorageKey()
    );

  if (
    !Array.isArray(
      stored
    )
  ) {
    return [];
  }

  return stored
    .filter(
      isReview
    )
    .sort(
      (
        first,
        second
      ) =>
        second.updatedAt -
        first.updatedAt
    )
    .slice(
      0,
      MAX_REVIEWS
    );
}

async function writeReviews(
  reviews:
    OutcomeReview[]
): Promise<void> {
  await storage.set(
    getStorageKey(),
    reviews
      .slice(
        0,
        MAX_REVIEWS
      )
  );
}

export async function listOutcomeReviews(
  outcomeId?:
    string
): Promise<OutcomeReview[]> {
  const reviews =
    await readReviews();

  if (
    !outcomeId
  ) {
    return reviews;
  }

  return reviews.filter(
    (
      review
    ) =>
      review.outcomeId ===
      outcomeId
  );
}

export async function getOutcomeReview(
  id:
    string
): Promise<OutcomeReview | null> {
  const reviews =
    await readReviews();

  return (
    reviews.find(
      (
        review
      ) =>
        review.id ===
        id
    ) ??
    null
  );
}

export async function getLatestOutcomeReview(
  outcomeId:
    string
): Promise<OutcomeReview | null> {
  const reviews =
    await listOutcomeReviews(
      outcomeId
    );

  return (
    reviews[0] ??
    null
  );
}

export async function createOutcomeReview(
  input:
    CreateOutcomeReviewInput
): Promise<OutcomeReview> {
  const outcomeId =
    normalizeText(
      input.outcomeId,
      200
    );

  if (
    !outcomeId
  ) {
    throw new Error(
      "Outcome id is required."
    );
  }

  const now =
    Date.now();

  const review:
    OutcomeReview = {
    id:
      createId(),

    outcomeId,

    status:
      "pending",

    decision:
      null,

    summary:
      normalizeText(
        input.summary,
        MAX_TEXT_LENGTH
      ),

    evidence:
      normalizeList(
        input.evidence
      ),

    blockers:
      normalizeList(
        input.blockers
      ),

    lessons:
      normalizeList(
        input.lessons
      ),

    nextGoal:
      null,

    createdAt:
      now,

    decidedAt:
      null,

    updatedAt:
      now,
  };

  const reviews =
    await readReviews();

  await writeReviews([
    review,
    ...reviews,
  ]);

  return review;
}

export async function updateOutcomeReview(
  id:
    string,
  input:
    DecideOutcomeReviewInput
): Promise<OutcomeReview | null> {
  const reviews =
    await readReviews();

  const index =
    reviews.findIndex(
      (
        review
      ) =>
        review.id ===
        id
    );

  if (
    index === -1
  ) {
    return null;
  }

  if (
    !isDecision(
      input.decision
    )
  ) {
    throw new Error(
      "A valid review decision is required."
    );
  }

  const current =
    reviews[index];

  const now =
    Date.now();

  const nextGoal =
    normalizeText(
      input.nextGoal,
      MAX_TEXT_LENGTH
    );

  const updated:
    OutcomeReview = {
    ...current,

    status:
      "decided",

    decision:
      input.decision,

    summary:
      input.summary !==
        undefined
        ? normalizeText(
            input.summary,
            MAX_TEXT_LENGTH
          )
        : current.summary,

    lessons:
      input.lessons !==
        undefined
        ? normalizeList(
            input.lessons
          )
        : current.lessons,

    blockers:
      input.blockers !==
        undefined
        ? normalizeList(
            input.blockers
          )
        : current.blockers,

    nextGoal:
      input.decision ===
        "stop"
        ? null
        : nextGoal ||
          current.nextGoal,

    decidedAt:
      now,

    updatedAt:
      now,
  };

  reviews[index] =
    updated;

  await writeReviews(
    reviews
  );

  return updated;
}

export function getOutcomeReviewStorageKey():
  string {
  return getStorageKey();
}
