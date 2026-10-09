
import "server-only";

import {
  storage,
} from "@/lib/server-storage";

import type {
  InboundLead,
  InboundLeadAssessment,
} from "@/lib/commercial/c144-inbound-demand-engine";

export type InboundLeadStatus =
  | "new"
  | "follow-up"
  | "converted"
  | "closed";

export interface InboundLeadRecord {
  id: string;
  lead: InboundLead;
  assessment: InboundLeadAssessment;
  replyDraft: string;
  status: InboundLeadStatus;
  note: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY =
  "aios:founder:inbound-leads";

const MAX_RECORDS = 500;
const MAX_TEXT_LENGTH = 2000;

function createId(): string {
  return [
    "inbound",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

function cleanText(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isStatus(
  value: unknown,
): value is InboundLeadStatus {
  return (
    value === "new" ||
    value === "follow-up" ||
    value === "converted" ||
    value === "closed"
  );
}

function isRecord(
  value: unknown,
): value is InboundLeadRecord {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as Partial<InboundLeadRecord>;

  return (
    typeof candidate.id === "string" &&
    Boolean(candidate.lead) &&
    typeof candidate.lead === "object" &&
    Boolean(candidate.assessment) &&
    typeof candidate.assessment === "object" &&
    typeof candidate.replyDraft === "string" &&
    isStatus(candidate.status) &&
    typeof candidate.note === "string" &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.updatedAt === "number"
  );
}

function normalizeRecords(
  value: unknown,
): InboundLeadRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .slice(-MAX_RECORDS);
}

async function readRecords():
Promise<InboundLeadRecord[]> {
  const stored =
    await storage.get<unknown>(
      STORAGE_KEY,
    );

  return normalizeRecords(stored);
}

async function writeRecords(
  records: InboundLeadRecord[],
): Promise<void> {
  await storage.set(
    STORAGE_KEY,
    records.slice(-MAX_RECORDS),
  );
}

export async function listInboundLeadRecords(
  options?: {
    status?: InboundLeadStatus;
    limit?: number;
  },
): Promise<InboundLeadRecord[]> {
  const records = await readRecords();

  const filtered = options?.status
    ? records.filter(
        (record) =>
          record.status === options.status,
      )
    : records;

  const sorted = filtered.sort(
    (a, b) =>
      b.updatedAt - a.updatedAt,
  );

  const requestedLimit =
    options?.limit ?? 100;

  const limit = Math.min(
    500,
    Math.max(
      1,
      Math.floor(requestedLimit),
    ),
  );

  return sorted.slice(0, limit);
}

export async function getInboundLeadRecord(
  id: string,
): Promise<InboundLeadRecord | null> {
  const cleanId = cleanText(id, 120);

  if (!cleanId) {
    return null;
  }

  const records = await readRecords();

  return (
    records.find(
      (record) => record.id === cleanId,
    ) ?? null
  );
}

export async function createInboundLeadRecord(
  input: {
    lead: InboundLead;
    assessment: InboundLeadAssessment;
    replyDraft: string;
    note?: string;
  },
): Promise<InboundLeadRecord> {
  const now = Date.now();

  const record: InboundLeadRecord = {
    id: createId(),

    lead: {
      businessType: cleanText(
        input.lead.businessType,
        200,
      ),
      currentAds: input.lead.currentAds,
      hasAdData: input.lead.hasAdData,
      decisionRole: input.lead.decisionRole,
      budgetRange: input.lead.budgetRange,
      urgency: input.lead.urgency,
      goal: cleanText(input.lead.goal),
      currentProblem: cleanText(
        input.lead.currentProblem,
      ),
      sourceChannel: input.lead.sourceChannel,
    },

    assessment: input.assessment,

    replyDraft: cleanText(
      input.replyDraft,
      4000,
    ),

    status: "new",

    note: cleanText(input.note),

    createdAt: now,
    updatedAt: now,
  };

  const records = await readRecords();

  records.push(record);

  await writeRecords(records);

  return record;
}

export async function updateInboundLeadRecord(
  id: string,
  updates: {
    status?: InboundLeadStatus;
    note?: string;
  },
): Promise<InboundLeadRecord | null> {
  const cleanId = cleanText(id, 120);

  if (!cleanId) {
    return null;
  }

  const records = await readRecords();

  const index = records.findIndex(
    (record) => record.id === cleanId,
  );

  if (index < 0) {
    return null;
  }

  const current = records[index];

  const updated: InboundLeadRecord = {
    ...current,

    status:
      updates.status !== undefined
        ? updates.status
        : current.status,

    note:
      updates.note !== undefined
        ? cleanText(updates.note)
        : current.note,

    updatedAt: Date.now(),
  };

  records[index] = updated;

  await writeRecords(records);

  return updated;
}

export async function deleteInboundLeadRecord(
  id: string,
): Promise<boolean> {
  const cleanId = cleanText(id, 120);

  if (!cleanId) {
    return false;
  }

  const records = await readRecords();

  const remaining = records.filter(
    (record) => record.id !== cleanId,
  );

  if (remaining.length === records.length) {
    return false;
  }

  await writeRecords(remaining);

  return true;
}

export function getInboundLeadStorageKey():
string {
  return STORAGE_KEY;
}
