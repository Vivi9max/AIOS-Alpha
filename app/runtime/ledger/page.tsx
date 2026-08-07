"use client";

import { useCallback, useEffect, useState } from "react";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface LedgerEntry {
  id: string;
  action: string;
  decision: "allowed" | "blocked";
  mode: string;
  code: string | null;
  message: string;
  taskTitle: string | null;
  maxConcurrentTasks: number;
  doingCount: number;
  createdAt: number;
}

interface LedgerResponse {
  success: boolean;
  entries?: LedgerEntry[];
  summary?: { total: number; allowed: number; blocked: number; completed: number };
  error?: string;
}

export default function ExecutionLedgerPage() {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/planner/ledger?limit=50", { cache: "no-store" });
      setData(await response.json() as LedgerResponse);
    } catch {
      setData({ success: false, error: "执行证据读取失败。" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const summary = data?.summary ?? { total: 0, allowed: 0, blocked: 0, completed: 0 };

  return (
    <WorkspaceShell>
      <main style={{ width: "100%", maxWidth: 900, margin: "0 auto", color: "#111827" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <p style={{ margin: 0, color: "#2563eb", fontSize: 12, fontWeight: 800, letterSpacing: ".12em" }}>PLANNER EVIDENCE</p>
            <h1 style={{ margin: "7px 0 0", fontSize: 30 }}>Execution Ledger</h1>
            <p style={{ margin: "9px 0 0", color: "#64748b", lineHeight: 1.6 }}>每一次允许、阻止与完成都有可追溯证据。</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} style={{ minHeight: 42, padding: "0 16px", border: 0, borderRadius: 12, background: "#111827", color: "white", fontWeight: 700 }}>
            {loading ? "同步中…" : "刷新证据"}
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
          {[ ["全部决策", summary.total], ["允许", summary.allowed], ["阻止", summary.blocked], ["已完成", summary.completed] ].map(([label, value]) => (
            <div key={String(label)} style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" }}>
              <strong style={{ display: "block", fontSize: 24 }}>{value}</strong>
              <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
            </div>
          ))}
        </section>

        {!data?.success && data?.error && <p role="alert" style={{ padding: 14, borderRadius: 12, background: "#fef2f2", color: "#b91c1c" }}>{data.error}</p>}

        <section style={{ display: "grid", gap: 10 }}>
          {!loading && data?.entries?.length === 0 && <div style={{ padding: 24, border: "1px dashed #cbd5e1", borderRadius: 16, color: "#64748b" }}>尚无执行证据。创建或推进任务后，记录会自动出现在这里。</div>}
          {data?.entries?.map((entry) => (
            <article key={entry.id} style={{ padding: 16, border: `1px solid ${entry.decision === "allowed" ? "#bbf7d0" : "#fecaca"}`, borderRadius: 16, background: entry.decision === "allowed" ? "#f0fdf4" : "#fef2f2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{entry.decision === "allowed" ? "✓ 已允许" : "⛔ 已阻止"} · {formatAction(entry.action)}</strong>
                <time style={{ color: "#64748b", fontSize: 12 }}>{new Date(entry.createdAt).toLocaleString("zh-CN", { hour12: false })}</time>
              </div>
              <p style={{ margin: "9px 0 0", lineHeight: 1.55 }}>{entry.taskTitle || entry.message}</p>
              <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>模式 {entry.mode} · 并行 {entry.doingCount}/{entry.maxConcurrentTasks}{entry.code ? ` · ${entry.code}` : ""}</p>
            </article>
          ))}
        </section>
      </main>
    </WorkspaceShell>
  );
}

function formatAction(action: string): string {
  return ({ "task-create": "创建任务", "task-start": "启动任务", "task-complete": "完成任务", "task-update": "更新任务", "task-delete": "删除任务", "outcome-start-next": "启动下一项", "outcome-complete-current": "完成当前项" } as Record<string, string>)[action] ?? action;
}
