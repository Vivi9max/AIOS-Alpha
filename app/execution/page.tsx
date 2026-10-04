"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type PlanId =
  | "alpha"
  | "free"
  | "pro"
  | "business";

type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

type TaskStatus =
  | "todo"
  | "doing"
  | "done";

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
    status:
      | "pending"
      | "passed"
      | "failed";
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
  task?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
  nextTask?: PlannerState["nextTask"];
  progress?: number;
  completedTasks?: number;
  remainingTasks?: number;
  queueSize?: number;
}

const plans: Array<
  [PlanId, string]
> = [
  ["alpha", "Alpha"],
  ["free", "Free"],
  ["pro", "Pro"],
  ["business", "Business"],
];

type Locale = "en" | "zh-CN" | "ja";

const pageCopy = {
  en: {
    eyebrow: "AIOS EXECUTION",
    version: "C136.1",
    title: "Planner → Execution",
    description:
      "AIOS turns planned work into executable tasks, verifies results, updates task state and keeps the execution history visible.",
    manualTitle: "Manual Execution",
    manualDescription:
      "Run a direct execution job with plan entitlement and daily usage controls.",
    plan: "Plan",
    goal: "Execution goal",
    goalPlaceholder:
      "Describe what you want AIOS to execute.",
    input: "Execution input",
    inputPlaceholder:
      "Provide the context or instruction AIOS should execute.",
    execute: "Execute",
    executing: "Executing...",
    plannerTitle: "Planner Execution",
    plannerDescription:
      "Continue the current Planner queue by executing the next available task.",
    outcome: "Outcome",
    progress: "Progress",
    queue: "Queue",
    nextTask: "Next task",
    noNextTask: "No task is ready to execute.",
    executeNext: "Execute Next Planner Task",
    runningPlanner: "Running Planner Task...",
    unavailable: "Planner Execution Unavailable",
    queueComplete: "Planner Queue Complete",
    usage: "Daily Usage",
    remaining: "Remaining",
    unlimited: "Unlimited",
    entitlement: "Entitlement",
    allowed: "Allowed",
    blocked: "Blocked",
    checking: "Checking",
    runtime: "Runtime Status",
    verification: "Verification",
    retryCount: "Retry count",
    lastUpdated: "Last updated",
    plannerTask: "Planner Task",
    jobId: "Job ID",
    retry: "Retry Execution",
    retryUnavailable: "Retry Unavailable",
    latestResult: "Latest Result",
    noResult: "No result yet.",
    verificationMessage:
      "Verification message",
    ledger: "Execution Ledger",
    history: "Execution History",
    historyDescription:
      "Manual jobs and Planner-triggered jobs share the same execution history.",
    refresh: "Refresh",
    noJobs: "No execution jobs yet.",
    status: {
      queued: "Queued",
      running: "Running",
      completed: "Completed",
      failed: "Failed",
      pending: "Pending",
      passed: "Passed",
    },
    message: {
      enterGoal:
        "Please enter an execution goal.",
      dailyLimit:
        "Daily execution limit reached for this plan.",
      capabilityUnavailable:
        "Execution capability is not available for this plan.",
      executionSuccess:
        "Execution completed successfully.",
      executionFailed:
        "Execution failed.",
      connection:
        "Unable to connect to the Execution API.",
      plannerComplete:
        "Planner queue is complete.",
      plannerSuccess:
        "Planner task executed and marked complete.",
      plannerFailed:
        "Planner task execution failed.",
      plannerConnection:
        "Unable to connect to the Planner Execution Bridge.",
      retrySuccess:
        "Execution retry completed.",
      retryFailed:
        "Retry failed.",
      retryConnection:
        "Unable to retry execution.",
      plannerLoad:
        "Unable to load Planner execution state.",
      executionLoad:
        "Unable to load execution state.",
      historyLoad:
        "Unable to load execution history.",
    },
  },

  "zh-CN": {
    eyebrow: "AIOS 执行",
    version: "C136.1",
    title: "Planner → Execution",
    description:
      "AIOS 将规划结果转化为可执行任务，验证执行结果，更新任务状态，并持续保留执行记录。",
    manualTitle: "手动执行",
    manualDescription:
      "直接运行执行任务，并遵循当前方案的能力权限与每日使用限制。",
    plan: "方案",
    goal: "执行目标",
    goalPlaceholder:
      "描述你希望 AIOS 执行什么。",
    input: "执行输入",
    inputPlaceholder:
      "提供 AIOS 执行所需要的上下文或具体指令。",
    execute: "执行",
    executing: "执行中...",
    plannerTitle: "Planner 执行",
    plannerDescription:
      "继续当前 Planner 队列，执行下一项可执行任务。",
    outcome: "成果",
    progress: "进度",
    queue: "队列",
    nextTask: "下一项任务",
    noNextTask: "当前没有可以执行的任务。",
    executeNext: "执行下一项 Planner 任务",
    runningPlanner: "正在执行 Planner 任务...",
    unavailable: "Planner 执行不可用",
    queueComplete: "Planner 队列已完成",
    usage: "每日使用量",
    remaining: "剩余",
    unlimited: "无限制",
    entitlement: "能力权限",
    allowed: "可用",
    blocked: "不可用",
    checking: "检查中",
    runtime: "运行状态",
    verification: "验证状态",
    retryCount: "重试次数",
    lastUpdated: "最后更新",
    plannerTask: "Planner 任务",
    jobId: "任务 ID",
    retry: "重新执行",
    retryUnavailable: "暂不可重试",
    latestResult: "最新结果",
    noResult: "暂无结果。",
    verificationMessage: "验证信息",
    ledger: "执行记录",
    history: "执行历史",
    historyDescription:
      "手动执行与 Planner 触发的执行任务都会保存在同一执行历史中。",
    refresh: "刷新",
    noJobs: "暂时没有执行任务。",
    status: {
      queued: "排队中",
      running: "执行中",
      completed: "已完成",
      failed: "失败",
      pending: "待验证",
      passed: "已通过",
    },
    message: {
      enterGoal:
        "请输入执行目标。",
      dailyLimit:
        "当前方案已达到每日执行上限。",
      capabilityUnavailable:
        "当前方案暂不具备执行能力。",
      executionSuccess:
        "执行已成功完成。",
      executionFailed:
        "执行失败。",
      connection:
        "无法连接 Execution API。",
      plannerComplete:
        "Planner 队列已完成。",
      plannerSuccess:
        "Planner 任务已执行并标记为完成。",
      plannerFailed:
        "Planner 任务执行失败。",
      plannerConnection:
        "无法连接 Planner Execution Bridge。",
      retrySuccess:
        "执行重试已完成。",
      retryFailed:
        "重试失败。",
      retryConnection:
        "无法重新执行任务。",
      plannerLoad:
        "无法加载 Planner 执行状态。",
      executionLoad:
        "无法加载执行状态。",
      historyLoad:
        "无法加载执行历史。",
    },
  },

  ja: {
    eyebrow: "AIOS 実行",
    version: "C136.1",
    title: "Planner → Execution",
    description:
      "AIOS は計画を実行可能なタスクに変換し、結果を検証し、タスク状態を更新しながら実行履歴を保持します。",
    manualTitle: "手動実行",
    manualDescription:
      "現在のプランの権限と日次利用上限に従って実行タスクを直接実行します。",
    plan: "プラン",
    goal: "実行目標",
    goalPlaceholder:
      "AIOS に何を実行してほしいか入力してください。",
    input: "実行入力",
    inputPlaceholder:
      "AIOS が実行するために必要な情報や指示を入力してください。",
    execute: "実行",
    executing: "実行中...",
    plannerTitle: "Planner 実行",
    plannerDescription:
      "現在の Planner キューから次に実行可能なタスクを実行します。",
    outcome: "成果",
    progress: "進捗",
    queue: "キュー",
    nextTask: "次のタスク",
    noNextTask: "実行できるタスクはありません。",
    executeNext: "次の Planner タスクを実行",
    runningPlanner: "Planner タスクを実行中...",
    unavailable: "Planner 実行は利用できません",
    queueComplete: "Planner キューは完了しています",
    usage: "日次利用量",
    remaining: "残り",
    unlimited: "無制限",
    entitlement: "利用権限",
    allowed: "利用可能",
    blocked: "利用不可",
    checking: "確認中",
    runtime: "実行状態",
    verification: "検証状態",
    retryCount: "再試行回数",
    lastUpdated: "最終更新",
    plannerTask: "Planner タスク",
    jobId: "ジョブ ID",
    retry: "再実行",
    retryUnavailable: "再実行できません",
    latestResult: "最新結果",
    noResult: "まだ結果はありません。",
    verificationMessage:
      "検証メッセージ",
    ledger: "実行記録",
    history: "実行履歴",
    historyDescription:
      "手動実行と Planner から起動されたタスクは同じ実行履歴に保存されます。",
    refresh: "更新",
    noJobs: "実行タスクはまだありません。",
    status: {
      queued: "待機中",
      running: "実行中",
      completed: "完了",
      failed: "失敗",
      pending: "確認待ち",
      passed: "合格",
    },
    message: {
      enterGoal:
        "実行目標を入力してください。",
      dailyLimit:
        "このプランの日次実行上限に達しました。",
      capabilityUnavailable:
        "このプランでは実行機能を利用できません。",
      executionSuccess:
        "実行が正常に完了しました。",
      executionFailed:
        "実行に失敗しました。",
      connection:
        "Execution API に接続できません。",
      plannerComplete:
        "Planner キューは完了しています。",
      plannerSuccess:
        "Planner タスクを実行して完了として更新しました。",
      plannerFailed:
        "Planner タスクの実行に失敗しました。",
      plannerConnection:
        "Planner Execution Bridge に接続できません。",
      retrySuccess:
        "実行の再試行が完了しました。",
      retryFailed:
        "再試行に失敗しました。",
      retryConnection:
        "実行を再試行できません。",
      plannerLoad:
        "Planner の実行状態を読み込めません。",
      executionLoad:
        "実行状態を読み込めません。",
      historyLoad:
        "実行履歴を読み込めません。",
    },
  },
} as const;

function localeCopy(
  locale: string,
) {
  if (locale === "zh-CN") {
    return pageCopy["zh-CN"];
  }

  if (locale === "ja") {
    return pageCopy.ja;
  }

  return pageCopy.en;
}

function limitText(
  value:
    | number
    | null
    | undefined,
  unlimited: string,
) {
  if (value === null) {
    return unlimited;
  }

  if (value === undefined) {
    return "—";
  }

  return String(value);
}

function timeText(
  value?: number,
) {
  if (!value) {
    return "—";
  }

  return new Date(
    value,
  ).toLocaleString();
}

function plannerFromLegacy(
  data: any,
): PlannerState {
  const execution =
    data?.execution ?? {};

  const task =
    execution.nextTask ??
    null;

  return {
    found: Boolean(
      data?.success &&
        data?.outcome,
    ),
    outcome: data?.outcome
      ? {
          id:
            data.outcome.id,
          title:
            data.outcome.title,
          status:
            data.outcome.status,
          priority:
            data.outcome.priority,
        }
      : null,
    nextTask: task
      ? {
          id: task.id,
          title:
            task.title,
          description:
            task.description ??
            "",
          status:
            task.status,
        }
      : null,
    progress:
      execution.progress ??
      0,
    completedTasks:
      execution.completedTasks ??
      0,
    remainingTasks:
      execution.remainingTasks ??
      0,
    queueSize:
      execution.queueSize ??
      execution.queue?.length ??
      0,
  };
}

function statusText(
  status: string,
  copy: ReturnType<
    typeof localeCopy
  >,
) {
  switch (status) {
    case "queued":
      return copy.status.queued;
    case "running":
      return copy.status.running;
    case "completed":
      return copy.status.completed;
    case "failed":
      return copy.status.failed;
    case "pending":
      return copy.status.pending;
    case "passed":
      return copy.status.passed;
    default:
      return status;
  }
}

export default function ExecutionPage() {
  const { locale } = useLanguage();
  const copy = localeCopy(locale);

  const [
    planId,
    setPlanId,
  ] = useState<PlanId>(
    "alpha",
  );

  const [goal, setGoal] =
    useState(
      "验证 AIOS Execution Job Runtime",
    );

  const [input, setInput] =
    useState(
      "请返回一句话：AIOS Execution Job Runtime 验证成功。",
    );

  const [
    jobs,
    setJobs,
  ] = useState<ExecutionJob[]>(
    [],
  );

  const [
    selectedJobId,
    setSelectedJobId,
  ] = useState<string | null>(
    null,
  );

  const [
    usage,
    setUsage,
  ] = useState<Usage | null>(
    null,
  );

  const [
    entitlement,
    setEntitlement,
  ] =
    useState<Entitlement | null>(
      null,
    );

  const [
    planner,
    setPlanner,
  ] =
    useState<PlannerState | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    plannerLoading,
    setPlannerLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const selectedJob =
    jobs.find(
      (job) =>
        job.id ===
        selectedJobId,
    ) ?? null;

  const blocked =
    useMemo(
      () =>
        Boolean(
          entitlement &&
            !entitlement.allowed,
        ) ||
        Boolean(
          usage &&
            usage.limit !== null &&
            (usage.remaining ??
              0) <= 0,
        ),
      [
        entitlement,
        usage,
      ],
    );

  const apply =
    useCallback(
      (data: ApiResponse) => {
        if (data.entitlement) {
          setEntitlement(
            data.entitlement,
          );
        }

        if (data.usage) {
          setUsage(data.usage);
        }

        if (data.job) {
          setJobs(
            (current) =>
              current.some(
                (item) =>
                  item.id ===
                  data.job!.id,
              )
                ? current.map(
                    (item) =>
                      item.id ===
                      data.job!.id
                        ? data.job!
                        : item,
                  )
                : [
                    data.job!,
                    ...current,
                  ],
          );

          setSelectedJobId(
            data.job.id,
          );
        }
      },
      [],
    );

  const loadPlanner =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/planner/execute",
              {
                cache:
                  "no-store",
              },
            );

          const raw =
            await response.text();

          let data: any;

          try {
            data =
              JSON.parse(raw);
          } catch {
            throw new Error(
              "Planner API returned HTTP " +
                response.status +
                ".",
            );
          }

          if (
            !response.ok ||
            data.success ===
              false
          ) {
            throw new Error(
              data.error ??
                "Planner API returned HTTP " +
                response.status +
                ".",
            );
          }

          setPlanner(
            plannerFromLegacy(
              data,
            ),
          );
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : copy.message.plannerLoad,
          );
        }
      },
      [copy.message.plannerLoad],
    );

  const loadJobs =
    useCallback(
      async (
        currentPlan: PlanId =
          planId,
      ) => {
        try {
          const response =
            await fetch(
              "/api/execution/jobs?plan=" +
                currentPlan,
              {
                cache:
                  "no-store",
              },
            );

          const raw =
            await response.text();

          let data: ApiResponse;

          try {
            data =
              JSON.parse(
                raw,
              ) as ApiResponse;
          } catch {
            throw new Error(
              "Execution API returned HTTP " +
                response.status +
                ".",
            );
          }

          apply(data);

          if (
            data.success &&
            Array.isArray(data.jobs)
          ) {
            setJobs(data.jobs);

            setSelectedJobId(
              (current) =>
                current &&
                data.jobs!.some(
                  (job) =>
                    job.id ===
                    current,
                )
                  ? current
                  : data.jobs![0]
                      ?.id ??
                    null,
            );
          } else if (
            !data.success
          ) {
            setMessage(
              data.error ??
                copy.message.executionLoad,
            );
          }
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : copy.message.historyLoad,
          );
        }
      },
      [
        apply,
        copy.message.executionLoad,
        copy.message.historyLoad,
        planId,
      ],
    );

  useEffect(() => {
    void loadJobs(planId);
    void loadPlanner();
  }, [
    loadJobs,
    loadPlanner,
    planId,
  ]);

  async function executeManual() {
    if (!goal.trim()) {
      setMessage(
        copy.message.enterGoal,
      );
      return;
    }

    if (blocked) {
      setMessage(
        usage?.remaining === 0
          ? copy.message.dailyLimit
          : copy.message.capabilityUnavailable,
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/execution/jobs",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              planId,
              goal: goal.trim(),
              input:
                input.trim() ||
                goal.trim(),
              execute: true,
            }),
          },
        );

      const data =
        (await response.json()) as ApiResponse;

      apply(data);

      setMessage(
        data.success
          ? copy.message.executionSuccess
          : data.error ??
              copy.message.executionFailed,
      );

      await loadPlanner();
    } catch {
      setMessage(
        copy.message.connection,
      );
    } finally {
      setLoading(false);
    }
  }

  async function executePlannerNext() {
    if (blocked) {
      setMessage(
        usage?.remaining === 0
          ? copy.message.dailyLimit
          : copy.message.capabilityUnavailable,
      );
      return;
    }

    setPlannerLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/execution/planner-next",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              planId,
            }),
          },
        );

      const data =
        (await response.json()) as ApiResponse;

      apply(data);

      setMessage(
        data.success
          ? data.code ===
            "PLAN_COMPLETE"
            ? copy.message.plannerComplete
            : copy.message.plannerSuccess
          : data.error ??
              copy.message.plannerFailed,
      );

      await loadJobs(planId);
      await loadPlanner();
    } catch {
      setMessage(
        copy.message.plannerConnection,
      );
    } finally {
      setPlannerLoading(false);
    }
  }

  async function retryJob() {
    if (
      !selectedJob ||
      selectedJob.status !==
        "failed"
    ) {
      return;
    }

    if (blocked) {
      setMessage(
        usage?.remaining === 0
          ? copy.message.dailyLimit
          : copy.message.capabilityUnavailable,
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/execution/jobs",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: selectedJob.id,
              action: "retry",
              planId,
            }),
          },
        );

      const data =
        (await response.json()) as ApiResponse;

      apply(data);

      setMessage(
        data.success
          ? copy.message.retrySuccess
          : data.error ??
              copy.message.retryFailed,
      );

      await loadPlanner();
    } catch {
      setMessage(
        copy.message.retryConnection,
      );
    } finally {
      setLoading(false);
    }
  }

  const card: CSSProperties = {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 20,
    boxSizing: "border-box",
  };

  const darkCard: CSSProperties = {
    ...card,
    background: "#0f172a",
    color: "#ffffff",
    borderColor: "#0f172a",
  };

  const label: CSSProperties = {
    fontSize: 10,
    fontWeight: 850,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#6366f1",
  };

  const button: CSSProperties = {
    border: 0,
    borderRadius: 11,
    padding: "12px 14px",
    fontWeight: 800,
    cursor: "pointer",
    width: "100%",
    minHeight: 44,
  };

  const statusColor =
    selectedJob?.status ===
    "completed"
      ? "#15803d"
      : selectedJob?.status ===
          "failed"
        ? "#b91c1c"
        : "#475569";

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding:
            "22px 12px 42px",
          boxSizing:
            "border-box",
          color: "#111827",
        }}
      >
        <header
          style={{
            marginBottom: 20,
          }}
        >
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
            <span
              style={{
                color: "#94a3b8",
              }}
            >
              {copy.version}
            </span>
          </div>

          <h1
            style={{
              margin:
                "7px 0 0",
              fontSize:
                "clamp(28px, 6vw, 38px)",
              lineHeight: 1.1,
              letterSpacing:
                "-0.03em",
            }}
          >
            {copy.title}
          </h1>

          <p
            style={{
              maxWidth: 760,
              margin:
                "9px 0 0",
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {copy.description}
          </p>
        </header>

        {message && (
          <div
            style={{
              marginBottom: 14,
              padding:
                "11px 13px",
              borderRadius: 12,
              background:
                "#eef2ff",
              color: "#3730a3",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: 14,
            alignItems:
              "start",
          }}
        >
          <div style={card}>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 12,
                flexWrap:
                  "wrap",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 850,
                    color: "#334155",
                  }}
                >
                  {copy.manualTitle}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "#64748b",
                    lineHeight: 1.45,
                  }}
                >
                  {copy.manualDescription}
                </div>
              </div>

              <select
                value={planId}
                onChange={(event) => {
                  setPlanId(
                    event.target
                      .value as PlanId,
                  );
                  setUsage(null);
                  setEntitlement(
                    null,
                  );
                  setMessage("");
                }}
                disabled={
                  loading ||
                  plannerLoading
                }
                style={{
                  width: "100%",
                  maxWidth: 180,
                  minHeight: 38,
                  padding: "0 10px",
                  border:
                    "1px solid #dbe1ea",
                  borderRadius: 9,
                  background:
                    "#ffffff",
                  fontWeight: 800,
                }}
              >
                {plans.map(
                  ([id, name]) => (
                    <option
                      key={id}
                      value={id}
                    >
                      {name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <label
              style={{
                display: "block",
                marginBottom: 7,
                fontSize: 12,
                fontWeight: 800,
                color: "#334155",
              }}
            >
              {copy.goal}
            </label>

            <textarea
              value={goal}
              onChange={(event) =>
                setGoal(
                  event.target.value,
                )
              }
              placeholder={
                copy.goalPlaceholder
              }
              rows={3}
              disabled={
                loading ||
                plannerLoading
              }
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                resize: "vertical",
                padding: 12,
                border:
                  "1px solid #dbe1ea",
                borderRadius: 11,
                fontSize: 13,
                lineHeight: 1.5,
                outline: "none",
              }}
            />

            <label
              style={{
                display: "block",
                margin:
                  "14px 0 7px",
                fontSize: 12,
                fontWeight: 800,
                color: "#334155",
              }}
            >
              {copy.input}
            </label>

            <textarea
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value,
                )
              }
              placeholder={
                copy.inputPlaceholder
              }
              rows={4}
              disabled={
                loading ||
                plannerLoading
              }
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                resize: "vertical",
                padding: 12,
                border:
                  "1px solid #dbe1ea",
                borderRadius: 11,
                fontSize: 13,
                lineHeight: 1.5,
                outline: "none",
              }}
            />

            <button
              type="button"
              onClick={() =>
                void executeManual()
              }
              disabled={
                loading ||
                plannerLoading ||
                blocked
              }
              style={{
                ...button,
                marginTop: 14,
                background:
                  loading ||
                  plannerLoading ||
                  blocked
                    ? "#cbd5e1"
                    : "#4f46e5",
                color: "#ffffff",
                cursor:
                  loading ||
                  plannerLoading ||
                  blocked
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? copy.executing
                : blocked
                  ? copy.unavailable
                  : copy.execute}
            </button>
          </div>

          <div style={darkCard}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              {copy.plannerTitle}
            </div>

            <div
              style={{
                marginTop: 5,
                color: "#94a3b8",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {copy.plannerDescription}
            </div>

            <div
              style={{
                display: "grid",
                gap: 9,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background:
                    "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 11,
                  }}
                >
                  {copy.outcome}
                </div>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop: 5,
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {planner?.outcome
                    ?.title ??
                    "—"}
                </strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 9,
                }}
              >
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background:
                      "rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 11,
                    }}
                  >
                    {copy.progress}
                  </div>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop: 5,
                      fontSize: 22,
                    }}
                  >
                    {planner?.progress ??
                      0}
                    %
                  </strong>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background:
                      "rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 11,
                    }}
                  >
                    {copy.queue}
                  </div>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop: 5,
                      fontSize: 22,
                    }}
                  >
                    {planner?.queueSize ??
                      0}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background:
                    "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 11,
                  }}
                >
                  {copy.nextTask}
                </div>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop: 5,
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {planner?.nextTask
                    ?.title ??
                    copy.noNextTask}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void executePlannerNext()
              }
              disabled={
                plannerLoading ||
                loading ||
                blocked ||
                !planner?.nextTask
              }
              style={{
                ...button,
                marginTop: 15,
                background:
                  plannerLoading ||
                  loading ||
                  blocked ||
                  !planner?.nextTask
                    ? "#334155"
                    : "#4f46e5",
                color: "#ffffff",
                cursor:
                  plannerLoading ||
                  loading ||
                  blocked ||
                  !planner?.nextTask
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {plannerLoading
                ? copy.runningPlanner
                : blocked
                  ? copy.unavailable
                  : planner?.nextTask
                    ? copy.executeNext
                    : copy.queueComplete}
            </button>
          </div>

          <div style={card}>
            <div style={label}>
              {copy.usage}
            </div>

            <div
              style={{
                display: "flex",
                alignItems:
                  "baseline",
                gap: 6,
                marginTop: 9,
              }}
            >
              <strong
                style={{
                  fontSize: 28,
                  color: "#0f172a",
                }}
              >
                {usage?.used ?? 0}
              </strong>

              <span
                style={{
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                /
                {" "}
                {limitText(
                  usage?.limit ??
                    null,
                  copy.unlimited,
                )}
              </span>
            </div>

            <div
              style={{
                marginTop: 7,
                color: "#64748b",
                fontSize: 12,
              }}
            >
              {copy.remaining}:{" "}
              <strong
                style={{
                  color: "#0f172a",
                }}
              >
                {usage?.remaining ===
                null
                  ? copy.unlimited
                  : usage?.remaining ??
                    "—"}
              </strong>
            </div>

            <div
              style={{
                marginTop: 7,
                color: "#64748b",
                fontSize: 12,
              }}
            >
              {copy.entitlement}:{" "}
              <strong
                style={{
                  color:
                    entitlement?.allowed
                      ? "#15803d"
                      : "#475569",
                }}
              >
                {entitlement
                  ? entitlement.allowed
                    ? copy.allowed
                    : copy.blocked
                  : copy.checking}
              </strong>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 14,
            marginTop: 14,
            alignItems:
              "start",
          }}
        >
          <div style={darkCard}>
            <div
              style={{
                ...label,
                color: "#a5b4fc",
              }}
            >
              {copy.runtime}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 26,
                fontWeight: 850,
              }}
            >
              {selectedJob
                ? statusText(
                    selectedJob.status,
                    copy,
                  )
                : "—"}
            </div>

            <div
              style={{
                display: "grid",
                gap: 8,
                marginTop: 13,
                color: "#cbd5e1",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <div>
                {copy.verification}:{" "}
                <strong
                  style={{
                    color: "#ffffff",
                  }}
                >
                  {selectedJob
                    ? statusText(
                        selectedJob
                          .verification
                          .status,
                        copy,
                      )
                    : copy.status.pending}
                </strong>
              </div>

              <div>
                {copy.retryCount}:{" "}
                <strong
                  style={{
                    color: "#ffffff",
                  }}
                >
                  {selectedJob
                    ?.retryCount ?? 0}
                </strong>
              </div>

              <div>
                {copy.lastUpdated}:{" "}
                <strong
                  style={{
                    color: "#ffffff",
                  }}
                >
                  {timeText(
                    selectedJob
                      ?.updatedAt,
                  )}
                </strong>
              </div>

              {selectedJob?.taskId && (
                <div
                  style={{
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {copy.plannerTask}:{" "}
                  <strong
                    style={{
                      color: "#ffffff",
                    }}
                  >
                    {selectedJob.taskId}
                  </strong>
                </div>
              )}

              <div
                style={{
                  overflowWrap:
                    "anywhere",
                }}
              >
                {copy.jobId}:{" "}
                {selectedJob?.id ??
                  "—"}
              </div>
            </div>

            {selectedJob?.status ===
              "failed" && (
              <button
                type="button"
                onClick={() =>
                  void retryJob()
                }
                disabled={
                  loading ||
                  blocked
                }
                style={{
                  ...button,
                  marginTop: 16,
                  background:
                    "transparent",
                  color: "#ffffff",
                  border:
                    "1px solid #475569",
                  cursor:
                    loading ||
                    blocked
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {blocked
                  ? copy.retryUnavailable
                  : copy.retry}
              </button>
            )}
          </div>

          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 10,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  color: "#0f172a",
                }}
              >
                {copy.latestResult}
              </h2>

              <span
                style={{
                  color: statusColor,
                  fontSize: 10,
                  fontWeight: 850,
                  textTransform:
                    "uppercase",
                }}
              >
                {selectedJob
                  ? statusText(
                      selectedJob
                        .verification
                        .status,
                      copy,
                    )
                  : copy.status.pending}
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                minHeight: 84,
                padding: 14,
                borderRadius: 12,
                background:
                  "#f8fafc",
                color: "#334155",
                whiteSpace:
                  "pre-wrap",
                overflowWrap:
                  "anywhere",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              {selectedJob
                ?.result ??
                selectedJob
                  ?.error ??
                copy.noResult}
            </div>

            {selectedJob
              ?.verification
              .message && (
              <div
                style={{
                  marginTop: 10,
                  color: "#64748b",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {copy.verificationMessage}:{" "}
                {
                  selectedJob
                    .verification
                    .message
                }
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            ...card,
            marginTop: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "flex-end",
              justifyContent:
                "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 13,
            }}
          >
            <div>
              <div style={label}>
                {copy.ledger}
              </div>

              <h2
                style={{
                  margin:
                    "5px 0 0",
                  fontSize: 19,
                  color: "#0f172a",
                }}
              >
                {copy.history}
              </h2>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color: "#64748b",
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                {copy.historyDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadJobs(
                  planId,
                );
                void loadPlanner();
              }}
              disabled={
                loading ||
                plannerLoading
              }
              style={{
                minHeight: 36,
                padding:
                  "0 11px",
                border:
                  "1px solid #dbe1ea",
                borderRadius: 9,
                background:
                  "#ffffff",
                color: "#475569",
                fontSize: 12,
                fontWeight: 750,
                cursor:
                  loading ||
                  plannerLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {copy.refresh}
            </button>
          </div>

          {jobs.length === 0 ? (
            <div
              style={{
                padding:
                  "30px 18px",
                border:
                  "1px dashed #cbd5e1",
                borderRadius: 13,
                background:
                  "#f8fafc",
                color: "#64748b",
                textAlign:
                  "center",
                fontSize: 13,
              }}
            >
              {copy.noJobs}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {jobs.map((job) => {
                const selected =
                  selectedJobId ===
                  job.id;

                const jobStatusColor =
                  job.status ===
                  "completed"
                    ? "#15803d"
                    : job.status ===
                        "failed"
                      ? "#b91c1c"
                      : "#475569";

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() =>
                      setSelectedJobId(
                        job.id,
                      )
                    }
                    style={{
                      width: "100%",
                      minWidth: 0,
                      padding:
                        "12px 13px",
                      border:
                        selected
                          ? "1px solid #c7d2fe"
                          : "1px solid #e5e7eb",
                      borderRadius: 11,
                      background:
                        selected
                          ? "#eef2ff"
                          : "#ffffff",
                      textAlign:
                        "left",
                      cursor:
                        "pointer",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "flex-start",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <strong
                        style={{
                          minWidth: 0,
                          color:
                            "#0f172a",
                          fontSize: 13,
                          lineHeight:
                            1.45,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {job.goal}
                      </strong>

                      <span
                        style={{
                          flexShrink: 0,
                          color:
                            jobStatusColor,
                          fontSize: 10,
                          fontWeight: 850,
                        }}
                      >
                        {statusText(
                          job.status,
                          copy,
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color:
                          "#64748b",
                        fontSize: 10,
                        lineHeight:
                          1.5,
                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {job.taskId
                        ? copy.plannerTask +
                          " " +
                          job.taskId +
                          " · "
                        : ""}
                      {copy.retryCount}{" "}
                      {job.retryCount}
                      {" · "}
                      {copy.verification}{" "}
                      {statusText(
                        job
                          .verification
                          .status,
                        copy,
                      )}
                      {" · "}
                      {copy.lastUpdated}{" "}
                      {timeText(
                        job.updatedAt,
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </WorkspaceShell>
  );
}
