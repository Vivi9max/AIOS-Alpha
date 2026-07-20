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

export interface FounderFeedbackRecord
  extends FeedbackRecord {
  userId: string;
}

const MAX_USER_FEEDBACK_RECORDS =
  100;

const MAX_FOUNDER_FEEDBACK_RECORDS =
  1000;

const FOUNDER_FEEDBACK_KEY =
  "aios:founder:feedback";

function getUserStorageKey():
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
    typeof value !== "object"
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

function isFounderFeedbackRecord(
  value: unknown
): value is FounderFeedbackRecord {
  if (
    !isFeedbackRecord(
      value
    )
  ) {
    return false;
  }

  const record =
    value as Partial<FounderFeedbackRecord>;

  return (
    typeof record.userId ===
      "string"
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
      -MAX_USER_FEEDBACK_RECORDS
    );
}

function normalizeFounderFeedback(
  value: unknown
): FounderFeedbackRecord[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      isFounderFeedbackRecord
    )
    .slice(
      -MAX_FOUNDER_FEEDBACK_RECORDS
    );
}

async function readUserFeedback():
  Promise<FeedbackRecord[]> {
  const stored =
    await storage.get<
      FeedbackRecord[]
    >(
      getUserStorageKey()
    );

  return normalizeFeedback(
    stored
  );
}

async function writeUserFeedback(
  records:
    FeedbackRecord[]
): Promise<void> {
  await storage.set(
    getUserStorageKey(),
    records.slice(
      -MAX_USER_FEEDBACK_RECORDS
    )
  );
}

async function readFounderFeedback():
  Promise<FounderFeedbackRecord[]> {
  const stored =
    await storage.get<
      FounderFeedbackRecord[]
    >(
      FOUNDER_FEEDBACK_KEY
    );

  return normalizeFounderFeedback(
    stored
  );
}

async function writeFounderFeedback(
  records:
    FounderFeedbackRecord[]
): Promise<void> {
  await storage.set(
    FOUNDER_FEEDBACK_KEY,
    records.slice(
      -MAX_FOUNDER_FEEDBACK_RECORDS
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
    await readUserFeedback();

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

  await writeUserFeedback(
    records
  );

  return record;
}

export async function appendFounderFeedback(
  record:
    FeedbackRecord,

  userId:
    string
): Promise<FounderFeedbackRecord> {
  const records =
    await readFounderFeedback();

  const founderRecord:
    FounderFeedbackRecord = {
    ...record,

    userId:
      userId
        .trim()
        .slice(
          0,
          100
        ) || "unknown",
  };

  const existingIndex =
    records.findIndex(
      (item) =>
        item.id ===
        founderRecord.id
    );

  if (
    existingIndex >= 0
  ) {
    records[
      existingIndex
    ] = founderRecord;
  } else {
    records.push(
      founderRecord
    );
  }

  await writeFounderFeedback(
    records
  );

  return founderRecord;
}

export async function listFeedback():
  Promise<FeedbackRecord[]> {
  const records =
    await readUserFeedback();

  return records.sort(
    (a, b) =>
      b.createdAt -
      a.createdAt
  );
}

export async function listFounderFeedback():
  Promise<FounderFeedbackRecord[]> {
  const records =
    await readFounderFeedback();

  return records.sort(
    (a, b) =>
      b.createdAt -
      a.createdAt
  );
}

export async function getFeedbackCount():
  Promise<number> {
  const records =
    await readUserFeedback();

  return records.length;
}

export async function getFounderFeedbackCount():
  Promise<number> {
  const records =
    await readFounderFeedback();

  return records.length;
}

export function getFeedbackStorageKey():
  string {
  return getUserStorageKey();
}

export function getFounderFeedbackStorageKey():
  string {
  return FOUNDER_FEEDBACK_KEY;
}