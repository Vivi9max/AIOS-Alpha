"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  KnowledgeEntry,
} from "@/lib/knowledge/types";

interface KnowledgeSummary {
  total: number;
  critical: number;
  high: number;
  averageConfidence: number;
  latestUpdatedAt: number | null;
}

interface ApiResponse {
  success: boolean;
  entries?: KnowledgeEntry[];
  summary?: KnowledgeSummary;
}

export default function KnowledgePanel() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [summary, setSummary] =
    useState<KnowledgeSummary | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [keyword, setKeyword] =
    useState("");

  async function loadKnowledge() {
    setLoading(true);

    try {
      const [listRes, summaryRes] =
        await Promise.all([
          fetch("/api/knowledge", {
            cache: "no-store",
          }),

          fetch(
            "/api/knowledge?summary=true",
            {
              cache: "no-store",
            }
          ),
        ]);

      const list =
        (await listRes.json()) as ApiResponse;

      const stat =
        (await summaryRes.json()) as ApiResponse;

      setEntries(list.entries ?? []);

      setSummary(stat.summary ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKnowledge();
  }, []);

  const filtered =
    useMemo(() => {
      if (!keyword.trim()) {
        return entries;
      }

      const value =
        keyword.toLowerCase();

      return entries.filter((item) => {
        return (
          item.title
            .toLowerCase()
            .includes(value) ||
          item.summary
            .toLowerCase()
            .includes(value) ||
          item.tags.some((tag) =>
            tag
              .toLowerCase()
              .includes(value)
          )
        );
      });
    }, [entries, keyword]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Knowledge Engine
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Knowledge Center
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Planner、Execution Memory
            与长期知识统一入口。
          </p>
        </div>

        <button
          onClick={() => void loadKnowledge()}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard
          title="Knowledge"
          value={summary?.total ?? 0}
        />

        <StatCard
          title="Critical"
          value={
            summary?.critical ?? 0
          }
        />

        <StatCard
          title="High"
          value={summary?.high ?? 0}
        />

        <StatCard
          title="Confidence"
          value={`${summary?.averageConfidence ?? 0}%`}
        />
      </div>

      <div className="mt-6">
        <input
          value={keyword}
          onChange={(e) =>
            setKeyword(
              e.target.value
            )
          }
          placeholder="Search knowledge..."
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <div className="mt-6 space-y-3">
        {loading && (
          <div className="rounded-xl border p-6 text-center text-slate-500">
            Loading...
          </div>
        )}

        {!loading &&
          filtered.length === 0 && (
            <div className="rounded-xl border p-6 text-center text-slate-500">
              No knowledge found.
            </div>
          )}

        {filtered.map((entry) => (
          <article
            key={entry.id}
            className="rounded-xl border p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-bold">
                {entry.title}
              </h3>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                {entry.importance}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {entry.summary}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>
                {entry.category}
              </span>

              <span>
                {entry.confidence}%
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-bold">
        {value}
      </div>
    </div>
  );
}