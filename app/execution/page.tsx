"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type PlanId = "alpha" | "free" | "pro" | "business";
type JobStatus = "queued" | "running" | "completed" | "failed";
type TaskStatus = "todo" | "doing" | "done";
type VerificationStatus = "pending" | "passed" | "failed";

interface ExecutionJob {
  id: string;
  planId?: string;
  goal: string;
  input: string;
  taskId?: string;
  status: JobStatus;
  result?: string;
  error?: string;
  retryCount: number;
  verification: {
    status: VerificationStatus;
    message?: string;
    checkedAt: number;
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
}

interface Usage {
  planId: PlanId;
  date: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  capability: "execution";
}

interface Entitlement {
  planId: PlanId;
  capability: "execution";
  allowed: boolean;
}

interface PlannerState {
  found: boolean;
  outcome: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | null;
  nextTask: {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
  } | null;
  progress: number;
  completedTasks: number;
  remainingTasks: number;
  queueSize: number;
}

interface ApiResponse {
  success: boolean;
  code?: string;
  error?: string;
  message?: string;
  job?: ExecutionJob;
  jobs?: ExecutionJob[];
  usage?: Usage;
  entitlement?: Entitlement;
}

const plans: Array<[PlanId, string]> = [
  ["alpha", "Alpha"],
  ["free", "Free"],
  ["pro", "Pro"],
  ["business", "Business"],
];

const pageCopy = {
  en: {
    eyebrow: "AIOS EXECUTION",
    version: "C136.2",
    title: "Execute",
    description: "Turn a goal into an action, then review the verified result.",
    goal: "What do you want AIOS to do?",
    goalPlaceholder: "Describe the outcome you want.",
    context: "Context or instructions",
    contextPlaceholder: "Add anything AIOS should know before executing.",
    execute: "Execute",
    executing: "Executing...",
    continuePlanner: "Continue Planner",
    plannerReady: "Next task ready",
    plannerEmpty: "No next task",
    plannerDescription: "Continue the next planned task without rebuilding the plan.",
    nextTask: "Next action",
    progress: "Progress",
    queue: "Queue",
    result: "Result",
    verified: "Verified",
    needsReview: "Needs review",
    failed: "Execution failed",
    running: "Running",
    queued: "Queued",
    completed: "Completed",
    retry: "Try again",
    retrying: "Retrying...",
    refresh: "Refresh",
    recent: "Recent executions",
    recentDescription: "Your latest execution results.",
    empty: "No executions yet.",
    usage: "Today",
    remaining: "remaining",
    unlimited: "unlimited",
    blocked: "Execution unavailable",
    allowed: "Ready",
    plan: "Plan",
    details: "Details",
    hideDetails: "Hide details",
    showDetails: "Execution details",
    verificationMessage: "Verification",
    retryCount: "Retries",
    updated: "Updated",
    jobId: "Job ID",
    plannerTask: "Planner task",
    enterGoal: "Please enter a goal.",
    dailyLimit: "Daily execution limit reached.",
    capabilityUnavailable: "Execution is not available for this plan.",
    executionSuccess: "Execution completed.",
    executionFailed: "Execution failed.",
    connection: "Unable to connect to the Execution API.",
    plannerComplete: "The Planner queue is complete.",
    plannerSuccess: "The next Planner task was executed.",
    plannerFailed: "The Planner task failed.",
    plannerConnection: "Unable to connect to Planner execution.",
    retrySuccess: "Execution retried.",
    retryFailed: "Retry failed.",
    retryConnection: "Unable to retry execution.",
    loadFailed: "Unable to load execution state.",
  },
  "zh-CN": {
    eyebrow: "AIOS 执行",
    version: "C136.2",
    title: "执行",
    description: "告诉 AIOS 你要完成什么，执行后直接查看已验证结果。",
    goal: "你希望 AIOS 完成什么？",
    goalPlaceholder: "描述你想要的结果。",
    context: "补充信息或指令",
    contextPlaceholder: "提供执行前需要知道的上下文。",
    execute: "执行",
    executing: "执行中...",
    continuePlanner: "继续 Planner",
    plannerReady: "下一项任务已准备好",
    plannerEmpty: "暂无下一项任务",
    plannerDescription: "直接继续规划中的下一项任务，无需重新规划。",
    nextTask: "下一步",
    progress: "进度",
    queue: "队列",
    result: "结果",
    verified: "已验证",
    needsReview: "待检查",
    failed: "执行失败",
    running: "执行中",
    queued: "排队中",
    completed: "已完成",
    retry: "再次执行",
    retrying: "重试中...",
    refresh: "刷新",
    recent: "最近执行",
    recentDescription: "最近的执行结果。",
    empty: "还没有执行记录。",
    usage: "今日",
    remaining: "剩余",
    unlimited: "无限制",
    blocked: "暂不可执行",
    allowed: "可以执行",
    plan: "方案",
    details: "详情",
    hideDetails: "隐藏详情",
    showDetails: "执行详情",
    verificationMessage: "验证",
    retryCount: "重试",
    updated: "更新时间",
    jobId: "任务 ID",
    plannerTask: "Planner 任务",
    enterGoal: "请输入执行目标。",
    dailyLimit: "已达到今日执行上限。",
    capabilityUnavailable: "当前方案暂不支持执行。",
    executionSuccess: "执行已完成。",
    executionFailed: "执行失败。",
    connection: "无法连接 Execution API。",
    plannerComplete: "Planner 队列已完成。",
    plannerSuccess: "下一项 Planner 任务已执行。",
    plannerFailed: "Planner 任务执行失败。",
    plannerConnection: "无法连接 Planner 执行服务。",
    retrySuccess: "已重新执行。",
    retryFailed: "重试失败。",
    retryConnection: "无法重新执行任务。",
    loadFailed: "无法加载执行状态。",
  },
  ja: {
    eyebrow: "AIOS 実行",
    version: "C136.2",
    title: "実行",
    description: "AIOS に目的を伝え、実行後に検証済みの結果を確認します。",
    goal: "AIOS に何をしてほしいですか？",
    goalPlaceholder: "求める結果を入力してください。",
    context: "追加情報または指示",
    contextPlaceholder: "実行前に必要な情報を入力してください。",
    execute: "実行",
    executing: "実行中...",
    continuePlanner: "Planner を続行",
    plannerReady: "次のタスクを実行できます",
    plannerEmpty: "次のタスクはありません",
    plannerDescription: "計画を作り直さず、次の Planner タスクを続行します。",
    nextTask: "次のアクション",
    progress: "進捗",
    queue: "キュー",
    result: "結果",
    verified: "検証済み",
    needsReview: "確認が必要",
    failed: "実行失敗",
    running: "実行中",
    queued: "待機中",
    completed: "完了",
    retry: "再実行",
    retrying: "再試行中...",
    refresh: "更新",
    recent: "最近の実行",
    recentDescription: "最近の実行結果です。",
    empty: "実行履歴はまだありません。",
    usage: "今日",
    remaining: "残り",
    unlimited: "無制限",
    blocked: "実行できません",
    allowed: "実行可能",
    plan: "プラン",
    details: "詳細",
    hideDetails: "詳細を隠す",
    showDetails: "実行詳細",
    verificationMessage: "検証",
    retryCount: "再試行",
    updated: "更新",
    jobId: "ジョブ ID",
    plannerTask: "Planner タスク",
    enterGoal: "実行目標を入力してください。",
    dailyLimit: "日次実行上限に達しました。",
    capabilityUnavailable: "このプランでは実行できません。",
    executionSuccess: "実行が完了しました。",
    executionFailed: "実行に失敗しました。",
    connection: "Execution API に接続できません。",
    plannerComplete: "Planner キューは完了しています。",
    plannerSuccess: "次の Planner タスクを実行しました。",
    plannerFailed: "Planner タスクの実行に失敗しました。",
    plannerConnection: "Planner 実行に接続できません。",
    retrySuccess: "再実行しました。",
    retryFailed: "再試行に失敗しました。",
    retryConnection: "再実行できません。",
    loadFailed: "実行状態を読み込めません。",
  },
} as const;

function getCopy(locale: string) {
  if (locale === "zh-CN") return pageCopy["zh-CN"];
  if (locale === "ja") return pageCopy.ja;
  return pageCopy.en;
}

function plannerFromResponse(data: any): PlannerState {
  const execution = data?.execution ?? {};
  const task = execution.nextTask ?? null;
  return {
    found: Boolean(data?.success && data?.outcome),
    outcome: data?.outcome
      ? {
          id: data.outcome.id,
          title: data.outcome.title,
          status: data.outcome.status,
          priority: data.outcome.priority,
        }
      : null,
    nextTask: task
      ? {
          id: task.id,
          title: task.title,
          description: task.description ?? "",
          status: task.status,
        }
      : null,
    progress: Number(execution.progress ?? 0),
    completedTasks: Number(execution.completedTasks ?? 0),
    remainingTasks: Number(execution.remainingTasks ?? 0),
    queueSize: Number(execution.queueSize ?? execution.queue?.length ?? 0),
  };
}

function statusLabel(status: string, copy: ReturnType<typeof getCopy>) {
  if (status === "queued") return copy.queued;
  if (status === "running") return copy.running;
  if (status === "completed") return copy.completed;
  if (status === "passed") return copy.verified;
  if (status === "failed") return copy.failed;
  return copy.needsReview;
}

function timeText(value?: number) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function ExecutionPage() {
  const { locale } = useLanguage();
  const copy = getCopy(locale);

  const [planId, setPlanId] = useState<PlanId>("alpha");
  const [goal, setGoal] = useState("");
  const [input, setInput] = useState("");
  const [jobs, setJobs] = useState<ExecutionJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [planner, setPlanner] = useState<PlannerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const blocked = useMemo(
    () =>
      Boolean(entitlement && !entitlement.allowed) ||
      Boolean(usage && usage.limit !== null && (usage.remaining ?? 0) <= 0),
    [entitlement, usage],
  );

  const apply = useCallback((data: ApiResponse) => {
    if (data.entitlement) setEntitlement(data.entitlement);
    if (data.usage) setUsage(data.usage);
    if (data.job) {
      setJobs((current) =>
        current.some((item) => item.id === data.job!.id)
          ? current.map((item) => (item.id === data.job!.id ? data.job! : item))
          : [data.job!, ...current],
      );
      setSelectedJobId(data.job.id);
    }
  }, []);

  const loadPlanner = useCallback(async () => {
    try {
      const response = await fetch("/api/planner/execute", { cache: "no-store" });
      const raw = await response.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("Planner API returned HTTP " + response.status + ".");
      }
      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? "Planner API returned HTTP " + response.status + ".");
      }
      setPlanner(plannerFromResponse(data));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.loadFailed);
    }
  }, [copy.loadFailed]);

  const loadJobs = useCallback(
    async (currentPlan: PlanId = planId) => {
      try {
        const response = await fetch("/api/execution/jobs?plan=" + currentPlan, {
          cache: "no-store",
        });
        const raw = await response.text();
        let data: ApiResponse;
        try {
          data = JSON.parse(raw) as ApiResponse;
        } catch {
          throw new Error("Execution API returned HTTP " + response.status + ".");
        }
        apply(data);
        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          setSelectedJobId((current) =>
            current && data.jobs!.some((job) => job.id === current)
              ? current
              : data.jobs![0]?.id ?? null,
          );
        } else if (!data.success) {
          setMessage(data.error ?? copy.loadFailed);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : copy.loadFailed);
      }
    },
    [apply, copy.loadFailed, planId],
  );

  useEffect(() => {
    void loadJobs(planId);
    void loadPlanner();
  }, [loadJobs, loadPlanner, planId]);

  async function executeManual() {
    if (!goal.trim()) {
      setMessage(copy.enterGoal);
      return;
    }
    if (blocked) {
      setMessage(usage?.remaining === 0 ? copy.dailyLimit : copy.capabilityUnavailable);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/execution/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          goal: goal.trim(),
          input: input.trim() || goal.trim(),
          execute: true,
        }),
      });
      const data = (await response.json()) as ApiResponse;
      apply(data);
      setMessage(
        data.success ? copy.executionSuccess : data.error ?? copy.executionFailed,
      );
      await Promise.all([loadJobs(planId), loadPlanner()]);
    } catch {
      setMessage(copy.connection);
    } finally {
      setLoading(false);
    }
  }

  async function executePlannerNext() {
    if (blocked) {
      setMessage(usage?.remaining === 0 ? copy.dailyLimit : copy.capabilityUnavailable);
      return;
    }
    setPlannerLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/execution/planner-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = (await response.json()) as ApiResponse;
      apply(data);
      setMessage(
        data.success
          ? data.code === "PLAN_COMPLETE"
            ? copy.plannerComplete
            : copy.plannerSuccess
          : data.error ?? copy.plannerFailed,
      );
      await Promise.all([loadJobs(planId), loadPlanner()]);
    } catch {
      setMessage(copy.plannerConnection);
    } finally {
      setPlannerLoading(false);
    }
  }

  async function retryJob() {
    if (!selectedJob || selectedJob.status !== "failed") return;
    if (blocked) {
      setMessage(usage?.remaining === 0 ? copy.dailyLimit : copy.capabilityUnavailable);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/execution/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedJob.id, action: "retry", planId }),
      });
      const data = (await response.json()) as ApiResponse;
      apply(data);
      setMessage(data.success ? copy.retrySuccess : data.error ?? copy.retryFailed);
      await Promise.all([loadJobs(planId), loadPlanner()]);
    } catch {
      setMessage(copy.retryConnection);
    } finally {
      setLoading(false);
    }
  }

  const card: CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 20,
    boxSizing: "border-box",
  };

  const muted: CSSProperties = {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55,
  };

  const primaryButton: CSSProperties = {
    width: "100%",
    minHeight: 48,
    border: 0,
    borderRadius: 12,
    padding: "0 16px",
    fontWeight: 800,
    fontSize: 14,
  };

  const statusTone =
    selectedJob?.verification.status === "passed"
      ? "#15803d"
      : selectedJob?.status === "failed" || selectedJob?.verification.status === "failed"
        ? "#b91c1c"
        : "#475569";

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 980,
          margin: "0 auto",
          padding: "28px 14px 52px",
          boxSizing: "border-box",
          color: "#0f172a",
        }}
      >
        <header style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#6366f1",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.1em",
            }}
          >
            {copy.eyebrow}
            <span style={{ color: "#94a3b8" }}>{copy.version}</span>
          </div>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: "clamp(32px, 8vw, 48px)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {copy.title}
          </h1>
          <p style={{ ...muted, maxWidth: 650, margin: "10px 0 0" }}>
            {copy.description}
          </p>
        </header>

        {message && (
          <div
            role="status"
            style={{
              marginBottom: 14,
              padding: "11px 13px",
              borderRadius: 12,
              background: "#eef2ff",
              color: "#3730a3",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        <section style={{ ...card, padding: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 260px" }}>
              <div style={{ fontSize: 18, fontWeight: 850 }}>{copy.goal}</div>
              <div style={{ ...muted, marginTop: 4 }}>{copy.contextPlaceholder}</div>
            </div>
            <label style={{ display: "grid", gap: 5, width: "100%", maxWidth: 160 }}>
              <span style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>{copy.plan}</span>
              <select
                value={planId}
                onChange={(event) => {
                  setPlanId(event.target.value as PlanId);
                  setUsage(null);
                  setEntitlement(null);
                  setMessage("");
                }}
                disabled={loading || plannerLoading}
                style={{
                  minHeight: 38,
                  padding: "0 9px",
                  border: "1px solid #dbe1ea",
                  borderRadius: 9,
                  background: "#ffffff",
                  fontWeight: 750,
                }}
              >
                {plans.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: "block", color: "#334155", fontSize: 12, fontWeight: 800 }}>
            {copy.goal}
          </label>
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder={copy.goalPlaceholder}
            rows={3}
            disabled={loading || plannerLoading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 7,
              resize: "vertical",
              padding: 13,
              border: "1px solid #dbe1ea",
              borderRadius: 12,
              fontSize: 15,
              lineHeight: 1.5,
              outline: "none",
            }}
          />

          <label style={{ display: "block", marginTop: 14, color: "#334155", fontSize: 12, fontWeight: 800 }}>
            {copy.context}
          </label>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={copy.contextPlaceholder}
            rows={3}
            disabled={loading || plannerLoading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 7,
              resize: "vertical",
              padding: 13,
              border: "1px solid #dbe1ea",
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.5,
              outline: "none",
            }}
          />

          <button
            type="button"
            onClick={() => void executeManual()}
            disabled={loading || plannerLoading || blocked}
            style={{
              ...primaryButton,
              marginTop: 14,
              background: loading || plannerLoading || blocked ? "#cbd5e1" : "#4f46e5",
              color: "#ffffff",
              cursor: loading || plannerLoading || blocked ? "not-allowed" : "pointer",
            }}
          >
            {loading ? copy.executing : blocked ? copy.blocked : copy.execute}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 13,
              color: "#64748b",
              fontSize: 12,
            }}
          >
            <span>
              {copy.usage}: {usage?.used ?? 0} / {usage?.limit === null ? copy.unlimited : usage?.limit ?? "—"}
            </span>
            <span>
              {usage?.remaining === null ? copy.unlimited : `${usage?.remaining ?? "—"} ${copy.remaining}`}
            </span>
            <span style={{ color: entitlement?.allowed ? "#15803d" : "#64748b", fontWeight: 750 }}>
              {entitlement ? (entitlement.allowed ? copy.allowed : copy.blocked) : "—"}
            </span>
          </div>
        </section>

        <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
          <div style={{ ...card, background: "#0f172a", color: "#ffffff", borderColor: "#0f172a" }}>
            <div style={{ color: "#a5b4fc", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em" }}>
              {copy.continuePlanner}
            </div>
            <h2 style={{ margin: "8px 0 0", fontSize: 21 }}>{planner?.nextTask ? copy.plannerReady : copy.plannerEmpty}</h2>
            <p style={{ margin: "7px 0 0", color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>{copy.plannerDescription}</p>
            <div style={{ marginTop: 16, padding: 13, borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>{copy.nextTask}</div>
              <strong style={{ display: "block", marginTop: 5, fontSize: 14, lineHeight: 1.45 }}>
                {planner?.nextTask?.title ?? copy.plannerEmpty}
              </strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 9 }}>
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>{copy.progress}</div>
                <strong style={{ display: "block", marginTop: 4, fontSize: 21 }}>{planner?.progress ?? 0}%</strong>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>{copy.queue}</div>
                <strong style={{ display: "block", marginTop: 4, fontSize: 21 }}>{planner?.queueSize ?? 0}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void executePlannerNext()}
              disabled={plannerLoading || loading || blocked || !planner?.nextTask}
              style={{
                ...primaryButton,
                marginTop: 14,
                background: plannerLoading || loading || blocked || !planner?.nextTask ? "#334155" : "#4f46e5",
                color: "#ffffff",
                cursor: plannerLoading || loading || blocked || !planner?.nextTask ? "not-allowed" : "pointer",
              }}
            >
              {plannerLoading ? copy.executing : blocked ? copy.blocked : planner?.nextTask ? copy.continuePlanner : copy.plannerEmpty}
            </button>
          </div>

          <div style={{ ...card, minHeight: 250 }}>
            <div style={{ color: "#6366f1", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em" }}>{copy.result}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
              <h2 style={{ margin: 0, fontSize: 21 }}>{selectedJob ? statusLabel(selectedJob.status, copy) : copy.result}</h2>
              <span style={{ color: statusTone, fontSize: 11, fontWeight: 850 }}>
                {selectedJob ? statusLabel(selectedJob.verification.status, copy) : copy.needsReview}
              </span>
            </div>
            <div style={{ marginTop: 12, minHeight: 105, padding: 14, borderRadius: 12, background: "#f8fafc", color: "#334155", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13, lineHeight: 1.65 }}>
              {selectedJob?.result ?? selectedJob?.error ?? copy.empty}
            </div>
            {selectedJob?.verification.message && (
              <div style={{ marginTop: 10, color: "#64748b", fontSize: 11, lineHeight: 1.5 }}>
                {copy.verificationMessage}: {selectedJob.verification.message}
              </div>
            )}
            {selectedJob?.status === "failed" && (
              <button
                type="button"
                onClick={() => void retryJob()}
                disabled={loading || blocked}
                style={{
                  ...primaryButton,
                  marginTop: 12,
                  background: "#ffffff",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  cursor: loading || blocked ? "not-allowed" : "pointer",
                }}
              >
                {loading ? copy.retrying : blocked ? copy.blocked : copy.retry}
              </button>
            )}
          </div>
        </section>

        <section style={{ ...card, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#6366f1", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em" }}>{copy.recent}</div>
              <p style={{ ...muted, margin: "5px 0 0" }}>{copy.recentDescription}</p>
            </div>
            <button
              type="button"
              onClick={() => { void loadJobs(planId); void loadPlanner(); }}
              disabled={loading || plannerLoading}
              style={{ minHeight: 36, padding: "0 12px", border: "1px solid #dbe1ea", borderRadius: 9, background: "#ffffff", color: "#475569", fontSize: 12, fontWeight: 750, cursor: loading || plannerLoading ? "not-allowed" : "pointer" }}
            >
              {copy.refresh}
            </button>
          </div>

          {jobs.length === 0 ? (
            <div style={{ marginTop: 14, padding: "28px 18px", border: "1px dashed #cbd5e1", borderRadius: 13, background: "#f8fafc", color: "#64748b", textAlign: "center", fontSize: 13 }}>
              {copy.empty}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              {jobs.map((job) => {
                const selected = selectedJobId === job.id;
                const tone = job.verification.status === "passed" ? "#15803d" : job.status === "failed" ? "#b91c1c" : "#475569";
                return (
                  <div key={job.id} style={{ border: selected ? "1px solid #c7d2fe" : "1px solid #e5e7eb", borderRadius: 12, background: selected ? "#eef2ff" : "#ffffff", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      style={{ width: "100%", border: 0, background: "transparent", padding: "13px 14px", textAlign: "left", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <strong style={{ minWidth: 0, color: "#0f172a", fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>{job.goal}</strong>
                        <span style={{ flexShrink: 0, color: tone, fontSize: 10, fontWeight: 850 }}>{statusLabel(job.status, copy)}</span>
                      </div>
                      <div style={{ marginTop: 6, color: "#64748b", fontSize: 10, lineHeight: 1.5 }}>
                        {job.verification.status === "passed" ? copy.verified : copy.needsReview} · {copy.updated} {timeText(job.updatedAt)}
                      </div>
                    </button>
                    {selected && (
                      <div style={{ padding: "0 14px 13px" }}>
                        <button
                          type="button"
                          onClick={() => setShowDetails((value) => !value)}
                          style={{ border: 0, background: "transparent", padding: 0, color: "#4f46e5", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                        >
                          {showDetails ? copy.hideDetails : copy.showDetails}
                        </button>
                        {showDetails && (
                          <div style={{ display: "grid", gap: 5, marginTop: 9, color: "#64748b", fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" }}>
                            <div>{copy.verificationMessage}: {statusLabel(job.verification.status, copy)}</div>
                            <div>{copy.retryCount}: {job.retryCount}</div>
                            <div>{copy.updated}: {timeText(job.updatedAt)}</div>
                            {job.taskId && <div>{copy.plannerTask}: {job.taskId}</div>}
                            <div>{copy.jobId}: {job.id}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </WorkspaceShell>
  );
}
