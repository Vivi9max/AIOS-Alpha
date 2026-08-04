export type KnowledgeSource =
  | "execution"
  | "planner"
  | "memory"
  | "outcome"
  | "task"
  | "runtime"
  | "founder"
  | "manual";

export type KnowledgeImportance =
  | "low"
  | "normal"
  | "high"
  | "critical";

export type KnowledgeCategory =
  | "experience"
  | "strategy"
  | "workflow"
  | "product"
  | "engineering"
  | "user"
  | "business";

export interface KnowledgeEvidence {
  id: string;
  source: KnowledgeSource;
  referenceId: string | null;
  summary: string;
  createdAt: number;
}

export interface KnowledgeEntry {
  id: string;

  title: string;

  summary: string;

  content: string;

  category: KnowledgeCategory;

  importance: KnowledgeImportance;

  source: KnowledgeSource;

  confidence: number;

  tags: string[];

  evidence: KnowledgeEvidence[];

  relatedOutcomeIds: string[];

  relatedTaskIds: string[];

  relatedMemoryIds: string[];

  createdAt: number;

  updatedAt: number;
}

export interface KnowledgeQuery {
  keyword?: string;

  category?: KnowledgeCategory;

  importance?: KnowledgeImportance;

  source?: KnowledgeSource;

  limit?: number;
}

export interface KnowledgeSearchResult {
  entries: KnowledgeEntry[];

  total: number;

  query: KnowledgeQuery;
}

export interface KnowledgeSummary {
  total: number;

  critical: number;

  high: number;

  averageConfidence: number;

  latestUpdatedAt: number | null;
}