import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

export type FeedbackCategory =
  | "great"
  | "good"
  | "neutral"
  | "bad"
  | "bug";

export interface FeedbackRecord {
  id: string;

  category:
    FeedbackCategory;

  rating: number;

  message: string;

  page: string;

  runtimeVersion: string;

  createdAt: number;
}

const MAX_FEEDBACK_RECORDS =
  100;

function getStorageKey():
  string {
  return createUserStorageKey(
    "feedback"
  );
}

function createFeedbackId():
  string {
  return [
    "feedback",
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join("-");
}

function isFeedbackCategory(
  value: unknown
): value is FeedbackCategory {
  return (
    value === "great" ||
    value === "good" ||
    value === "neutral" ||
    value === "bad" ||
    value === "bug"
  );
}

function isFeedbackRecord(
  value: unknown
): value is FeedbackRecord {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const record =
    value as Partial<FeedbackRecord>;

  return (
    typeof record.id ===
      "string" &&
    isFeedbackCategory(
      record.category
    ) &&
    typeof record.rating ===
      "number" &&
    typeof record.message ===
      "string" &&
    typeof record.page ===
      "string" &&
    typeof record.runtimeVersion ===
      "string" &&
    typeof record.createdAt ===
      "number"
  );
}

function normalizeFeedback(
  value: unknown
): FeedbackRecord[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      isFeedbackRecord
    )
    .slice(
      -MAX_FEEDBACK_RECORDS
    );
}

async function readFeedback():
  Promise<FeedbackRecord[]> {
  const stored =
    await storage.get<
      FeedbackRecord[]
    >(
      getStorageKey()
    );

  return normalizeFeedback(
    stored
  );
}

async function writeFeedback(
  records:
    FeedbackRecord[]
): Promise<void> {
  await storage.set(
    getStorageKey(),
    records.slice(
      -MAX_FEEDBACK_RECORDS
    )
  );
}

export async function createFeedback(
  input: {
    category:
      FeedbackCategory;

    rating:
      number;

    message?:
      string;

    page?:
      string;

    runtimeVersion?:
      string;
  }
): Promise<FeedbackRecord> {
  const records =
    await readFeedback();

  const safeRating =
    Math.min(
      5,
      Math.max(
        1,
        Math.round(
          input.rating
        )
      )
    );

  const record:
    FeedbackRecord = {
    id:
      createFeedbackId(),

    category:
      input.category,

    rating:
      safeRating,

    message:
      input.message
        ?.trim()
        .slice(
          0,
          1000
        ) ?? "",

    page:
      input.page
        ?.trim()
        .slice(
          0,
          100
        ) || "workspace",

    runtimeVersion:
      input.runtimeVersion
        ?.trim()
        .slice(
          0,
          20
        ) || "0.4",

    createdAt:
      Date.now(),
  };

  records.push(
    record
  );

  await writeFeedback(
    records
  );

  return record;
}

export async function listFeedback():
  Promise<FeedbackRecord[]> {
  const records =
    await readFeedback();

  return records.sort(
    (a, b) =>
      b.createdAt -
      a.createdAt
  );
}

export async function getFeedbackCount():
  Promise<number> {
  const records =
    await readFeedback();

  return records.length;
}

export function getFeedbackStorageKey():
  string {
  return getStorageKey();
}