import { storage } from "@/lib/server-storage";
import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

import type {
  KnowledgeEntry,
  KnowledgeQuery,
  KnowledgeSearchResult,
  KnowledgeSummary,
} from "./types";

const STORAGE_KEY = createUserStorageKey(
  "knowledge"
);

const MAX_ENTRIES = 1000;

function now() {
  return Date.now();
}

async function load(): Promise<
  KnowledgeEntry[]
> {
  const data =
    await storage.get<
      KnowledgeEntry[]
    >(STORAGE_KEY);

  if (!Array.isArray(data))
    return [];

  return data.sort(
    (a, b) =>
      b.updatedAt -
      a.updatedAt
  );
}

async function save(
  entries: KnowledgeEntry[]
) {
  await storage.set(
    STORAGE_KEY,
    entries.slice(
      0,
      MAX_ENTRIES
    )
  );
}

export async function listKnowledge() {
  return load();
}

export async function getKnowledge(
  id: string
) {
  const entries =
    await load();

  return (
    entries.find(
      (e) => e.id === id
    ) ?? null
  );
}

export async function createKnowledge(
  entry: KnowledgeEntry
) {
  const entries =
    await load();

  entries.unshift({
    ...entry,
    createdAt:
      entry.createdAt ||
      now(),
    updatedAt:
      now(),
  });

  await save(entries);

  return entry;
}

export async function updateKnowledge(
  id: string,
  patch: Partial<KnowledgeEntry>
) {
  const entries =
    await load();

  const index =
    entries.findIndex(
      (e) => e.id === id
    );

  if (index < 0)
    return null;

  entries[index] = {
    ...entries[index],
    ...patch,
    updatedAt: now(),
  };

  await save(entries);

  return entries[index];
}

export async function deleteKnowledge(
  id: string
) {
  const entries =
    await load();

  const filtered =
    entries.filter(
      (e) => e.id !== id
    );

  await save(filtered);

  return filtered.length !==
    entries.length;
}

export async function searchKnowledge(
  query: KnowledgeQuery
): Promise<KnowledgeSearchResult> {
  let result =
    await load();

  if (query.keyword) {
    const keyword =
      query.keyword.toLowerCase();

    result =
      result.filter(
        (e) =>
          e.title
            .toLowerCase()
            .includes(
              keyword
            ) ||
          e.summary
            .toLowerCase()
            .includes(
              keyword
            ) ||
          e.content
            .toLowerCase()
            .includes(
              keyword
            ) ||
          e.tags.some((t) =>
            t
              .toLowerCase()
              .includes(
                keyword
              )
          )
      );
  }

  if (query.category)
    result =
      result.filter(
        (e) =>
          e.category ===
          query.category
      );

  if (query.source)
    result =
      result.filter(
        (e) =>
          e.source ===
          query.source
      );

  if (query.importance)
    result =
      result.filter(
        (e) =>
          e.importance ===
          query.importance
      );

  const limit =
    query.limit ?? 50;

  return {
    entries:
      result.slice(
        0,
        limit
      ),
    total:
      result.length,
    query,
  };
}

export async function summarizeKnowledge(): Promise<KnowledgeSummary> {
  const entries =
    await load();

  const total =
    entries.length;

  const critical =
    entries.filter(
      (e) =>
        e.importance ===
        "critical"
    ).length;

  const high =
    entries.filter(
      (e) =>
        e.importance ===
        "high"
    ).length;

  const averageConfidence =
    total === 0
      ? 0
      : Math.round(
          entries.reduce(
            (
              sum,
              item
            ) =>
              sum +
              item.confidence,
            0
          ) / total
        );

  return {
    total,
    critical,
    high,
    averageConfidence,
    latestUpdatedAt:
      total > 0
        ? entries[0]
            .updatedAt
        : null,
  };
}