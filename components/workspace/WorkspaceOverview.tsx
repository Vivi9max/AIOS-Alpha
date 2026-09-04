"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";

import {
  MODULE_ICONS,
} from "@/lib/ui/module-icons";

import {
  openFeedbackPanel,
} from "@/lib/ui/feedback-events";

interface DashboardStatus {
  success?: boolean;

  runtime?: {
    status?: string;
    version?: string;
  };

  provider?: {
    active?: string;
    latencyMs?: number | null;
  };

  storage?: {
    healthy?: boolean;
    persistent?: boolean;
  };

  memory?: {
    count?: number;
  };

  profile?: {
    completedFields?: number;
    totalFields?: number;
  };

  tasks?: {
    count?: number;
    active?: number;
    completed?: number;
  };

  feedback?: {
    count?: number;
  };
}

interface QuickAction {
  href: string;
  icon: string;
  title: string;
  description: string;
}

type WorkspaceLocale = "en" | "zh-CN" | "ja";

interface WorkspaceCopy {
  todayStatus: string;
  syncing: string;
  synced: string;
  partialStatusError: string;

  todoTasks: string;
  longTermMemory: string;
  userFeedback: string;
  feedbackAction: string;

  completed: (count: number) => string;
  profile: (completed: number) => string;

  runtimeOnline: string;
  runtimeOffline: string;

  suggestionActiveTasks: (count: number) => string;
  suggestionNoTasks: string;
  suggestionMemory: string;
  suggestionProfile: string;
  suggestionFeedback: (count: number) => string;

  workspaceLabel: string;
}

const WORKSPACE_COPY: Record<
  WorkspaceLocale,
  WorkspaceCopy
> = {
  en: {
    todayStatus: "Today's status",
    syncing: "Syncing…",
    synced: "Data synchronized",
    partialStatusError:
      "Some status information is temporarily unavailable.",

    todoTasks: "Pending tasks",
    longTermMemory: "Long-term memory",
    userFeedback: "User feedback",
    feedbackAction: "Submit or view feedback",

    completed: (count) =>
      `${count} completed`,

    profile: (completed) =>
      `Profile ${completed}/5`,

    runtimeOnline: "Online",
    runtimeOffline: "Offline",

    suggestionActiveTasks: (count) =>
      `You have ${count} pending tasks. Consider starting with the most important one.`,

    suggestionNoTasks:
      "There are no pending tasks. Consider creating the most important action for today.",

    suggestionMemory:
      "Your long-term memory is still limited. Tell AIOS about your goals, projects or work preferences.",

    suggestionProfile:
      "Your profile is not fully configured. Adding more information helps AIOS provide more accurate recommendations.",

    suggestionFeedback: (count) =>
      `You have submitted ${count} feedback item${count === 1 ? "" : "s"}. Thank you for helping improve AIOS Alpha.`,

    workspaceLabel: "AIOS WORKSPACE",
  },

  "zh-CN": {
    todayStatus: "今日状态",
    syncing: "正在同步…",
    synced: "数据已同步",
    partialStatusError:
      "部分状态暂时无法读取。",

    todoTasks: "待办任务",
    longTermMemory: "长期记忆",
    userFeedback: "用户反馈",
    feedbackAction: "提交或查看反馈",

    completed: (count) =>
      `已完成 ${count}`,

    profile: (completed) =>
      `资料 ${completed}/5`,

    runtimeOnline: "在线",
    runtimeOffline: "离线",

    suggestionActiveTasks: (count) =>
      `你有 ${count} 个待完成任务，建议先选择其中最重要的一项。`,

    suggestionNoTasks:
      "当前没有待办任务，可以创建一个今天最重要的行动。",

    suggestionMemory:
      "长期记忆内容较少，建议告诉 AIOS 你的目标、项目或工作偏好。",

    suggestionProfile:
      "个人资料尚未完善，补充资料可以让 AIOS 给出更准确的建议。",

    suggestionFeedback: (count) =>
      `你已经提交 ${count} 条反馈，感谢帮助改进 AIOS Alpha。`,

    workspaceLabel: "AIOS 工作区",
  },

  ja: {
    todayStatus: "今日の状態",
    syncing: "同期中…",
    synced: "データを同期しました",
    partialStatusError:
      "一部のステータス情報を一時的に取得できません。",

    todoTasks: "保留中のタスク",
    longTermMemory: "長期メモリ",
    userFeedback: "ユーザーフィードバック",
    feedbackAction: "フィードバックを送信または確認",

    completed: (count) =>
      `${count} 件完了`,

    profile: (completed) =>
      `プロフィール ${completed}/5`,

    runtimeOnline: "オンライン",
    runtimeOffline: "オフライン",

    suggestionActiveTasks: (count) =>
      `${count} 件の未完了タスクがあります。まず最も重要なタスクから始めることをおすすめします。`,

    suggestionNoTasks:
      "保留中のタスクはありません。今日最も重要なアクションを作成することをおすすめします。",

    suggestionMemory:
      "長期メモリの情報がまだ少ない状態です。目標、プロジェクト、仕事の好みなどを AIOS に伝えてください。",

    suggestionProfile:
      "プロフィールがまだ十分に設定されていません。情報を追加すると、AIOS がより正確な提案を行えます。",

    suggestionFeedback: (count) =>
      `${count} 件のフィードバックを送信しました。AIOS Alpha の改善にご協力いただきありがとうございます。`,

    workspaceLabel: "AIOS ワークスペース",
  },
};

const emptyStatus: DashboardStatus = {
  runtime: {
    status: "offline",
    version: "0.4",
  },

  provider: {
    active: "unknown",
    latencyMs: null,
  },

  storage: {
    healthy: false,
    persistent: false,
  },

  memory: {
    count: 0,
  },

  profile: {
    completedFields: 0,
    totalFields: 5,
  },

  tasks: {
    count: 0,
    active: 0,
    completed: 0,
  },

  feedback: {
    count: 0,
  },
};

function safeNumber(
  value: unknown,
): number {
  return typeof value === "number"
    ? value
    : 0;
}

export default function WorkspaceOverview() {
  const { locale, t } = useLanguage();

  const currentLocale: WorkspaceLocale =
    locale === "zh-CN" || locale === "ja"
      ? locale
      : "en";

  const copy =
    WORKSPACE_COPY[currentLocale];

  const quickActions: QuickAction[] = [
    {
      href: "/tasks",
      icon: "＋",
      title: t(
        "workspace.action.newTask",
      ),
      description: t(
        "workspace.action.newTaskDescription",
      ),
    },

    {
      href: "/memory",
      icon: MODULE_ICONS.memory,
      title: t(
        "workspace.action.memory",
      ),
      description: t(
        "workspace.action.memoryDescription",
      ),
    },

    {
      href: "/projects",
      icon: "📁",
      title: t(
        "workspace.action.projects",
      ),
      description: t(
        "workspace.action.projectsDescription",
      ),
    },

    {
      href: "#aios-chat",
      icon: "✨",
      title: t(
        "workspace.action.ask",
      ),
      description: t(
        "workspace.action.askDescription",
      ),
    },
  ];

  const [
    status,
    setStatus,
  ] =
    useState<DashboardStatus>(
      emptyStatus,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const response =
          await fetch(
            "/api/dashboard/status",
            {
              cache: "no-store",
              credentials: "same-origin",
            },
          );

        const data =
          (await response.json()) as DashboardStatus;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            "Workspace status unavailable.",
          );
        }

        if (active) {
          setStatus(data);
          setError("");
        }
      } catch {
        if (active) {
          setStatus(emptyStatus);

          setError(
            copy.partialStatusError,
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStatus();

    const interval =
      window.setInterval(
        loadStatus,
        30000,
      );

    return () => {
      active = false;

      window.clearInterval(
        interval,
      );
    };
  }, [copy.partialStatusError]);

  const activeTasks =
    safeNumber(
      status.tasks?.active,
    );

  const completedTasks =
    safeNumber(
      status.tasks?.completed,
    );

  const memoryCount =
    safeNumber(
      status.memory?.count,
    );

  const feedbackCount =
    safeNumber(
      status.feedback?.count,
    );

  const profileCompleted =
    safeNumber(
      status.profile
        ?.completedFields,
    );

  const suggestions =
    useMemo(
      () => {
        const items: string[] = [];

        if (activeTasks > 0) {
          items.push(
            copy.suggestionActiveTasks(
              activeTasks,
            ),
          );
        } else {
          items.push(
            copy.suggestionNoTasks,
          );
        }

        if (memoryCount < 3) {
          items.push(
            copy.suggestionMemory,
          );
        }

        if (profileCompleted < 3) {
          items.push(
            copy.suggestionProfile,
          );
        }

        if (feedbackCount > 0) {
          items.push(
            copy.suggestionFeedback(
              feedbackCount,
            ),
          );
        }

        return items.slice(0, 3);
      },
      [
        activeTasks,
        memoryCount,
        profileCompleted,
        feedbackCount,
        copy,
      ],
    );

  const stats = [
    {
      label: copy.todoTasks,

      value: activeTasks,

      detail:
        copy.completed(
          completedTasks,
        ),

      href: "/tasks",

      action:
        "link" as const,

      icon: "✓",
    },

    {
      label:
        copy.longTermMemory,

      value: memoryCount,

      detail:
        copy.profile(
          profileCompleted,
        ),

      href: "/memory",

      action:
        "link" as const,

      icon:
        MODULE_ICONS.memory,
    },

    {
      label:
        copy.userFeedback,

      value:
        feedbackCount,

      detail:
        copy.feedbackAction,

      href: "",

      action:
        "feedback" as const,

      icon: "💬",
    },

    {
      label: "Runtime",

      value:
        status.runtime
          ?.status === "online"
          ? copy.runtimeOnline
          : copy.runtimeOffline,

      detail:
        status.provider
          ?.active ?? "unknown",

      href: "/dashboard",

      action:
        "link" as const,

      icon: "⚡",
    },
  ];

  return (
    <section
      style={{
        display: "grid",
        gap: 18,
      }}
    >
      <div
        style={{
          padding: "22px 20px",
          borderRadius: 20,
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          boxShadow:
            "0 18px 44px rgba(15, 23, 42, 0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems:
              "flex-start",
            justifyContent:
              "space-between",
            gap: 18,
          }}
        >
          <div>
            <div
              style={{
                color: "#93c5fd",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing:
                  "0.08em",
              }}
            >
              {copy.workspaceLabel}
            </div>

            <h1
              style={{
                margin:
                  "9px 0 0",
                fontSize: 27,
                lineHeight: 1.2,
              }}
            >
              {t(
                "workspace.heroTitle",
              )}
            </h1>

            <p
              style={{
                margin:
                  "10px 0 0",
                color: "#cbd5e1",
                fontSize: 14,
                lineHeight: 1.65,
              }}
            >
              {t(
                "workspace.heroDescription",
              )}
            </p>
          </div>

          <div
            style={{
              flexShrink: 0,
              width: 50,
              height: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background:
                "rgba(255,255,255,0.1)",
              fontSize: 26,
            }}
          >
            ✨
          </div>
        </div>
      </div>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginBottom: 10,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 17,
            }}
          >
            {t(
              "workspace.quickActions",
            )}
          </h2>

          <span
            style={{
              color: "#64748b",
              fontSize: 12,
            }}
          >
            {t(
              "workspace.oneTap",
            )}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {quickActions.map(
            (action) => (
              <Link
                key={action.href}
                href={action.href}
                style={{
                  minWidth: 0,
                  padding: 14,
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 16,
                  background: "#ffffff",
                  color: "#0f172a",
                  textDecoration:
                    "none",
                  boxShadow:
                    "0 8px 22px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius: 11,
                    background:
                      "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  {action.icon}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {action.title}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color: "#64748b",
                    fontSize: 11,
                    lineHeight: 1.45,
                  }}
                >
                  {action.description}
                </div>
              </Link>
            ),
          )}
        </div>
      </section>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginBottom: 10,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 17,
            }}
          >
            {copy.todayStatus}
          </h2>

          <span
            style={{
              color: error
                ? "#b45309"
                : "#16a34a",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {loading
              ? copy.syncing
              : error || copy.synced}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {stats.map(
            (item) => {
              const content = (
                <>
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
                    <span
                      style={{
                        color:
                          "#64748b",
                        fontSize: 12,
                        fontWeight:
                          700,
                      }}
                    >
                      {item.label}
                    </span>

                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: 18,
                      }}
                    >
                      {item.icon}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {item.value}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color:
                        "#94a3b8",
                      fontSize: 11,
                    }}
                  >
                    {item.detail}
                  </div>
                </>
              );

              const cardStyle = {
                minWidth: 0,

                padding: 14,

                boxSizing:
                  "border-box" as const,

                border:
                  "1px solid #e2e8f0",

                borderRadius: 16,

                background:
                  "#ffffff",

                color:
                  "#0f172a",

                textAlign:
                  "left" as const,

                textDecoration:
                  "none",

                font: "inherit",

                cursor:
                  "pointer",
              };

              if (
                item.action ===
                "feedback"
              ) {
                return (
                  <button
                    key={
                      item.label
                    }
                    type="button"
                    onClick={
                      openFeedbackPanel
                    }
                    aria-label={
                      currentLocale ===
                      "ja"
                        ? "ユーザーフィードバックパネルを開く"
                        : currentLocale ===
                          "zh-CN"
                        ? "打开用户反馈面板"
                        : "Open user feedback panel"
                    }
                    style={
                      cardStyle
                    }
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  prefetch={false}
                  style={
                    cardStyle
                  }
                >
                  {content}
                </Link>
              );
            },
          )}
        </div>
      </section>

      <section
        style={{
          padding: 18,
          border:
            "1px solid #bfdbfe",
          borderRadius: 18,
          background:
            "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: 9,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              borderRadius: 11,
              background:
                "#dbeafe",
            }}
          >
            ✨
          </span>

          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 17,
            }}
          >
            {currentLocale === "ja"
              ? "AIOS の提案"
              : currentLocale ===
                "zh-CN"
              ? "AIOS 建议"
              : "AIOS Suggestions"}
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gap: 9,
            marginTop: 14,
          }}
        >
          {suggestions.map(
            (
              suggestion,
              index,
            ) => (
              <div
                key={
                  `${index}-${suggestion}`
                }
                style={{
                  display: "flex",
                  alignItems:
                    "flex-start",
                  gap: 10,
                  padding:
                    "11px 12px",
                  borderRadius: 13,
                  background:
                    "rgba(255,255,255,0.78)",
                  color:
                    "#334155",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius:
                      "50%",
                    background:
                      "#2563eb",
                    color:
                      "#ffffff",
                    fontSize: 11,
                    fontWeight:
                      800,
                  }}
                >
                  {index + 1}
                </span>

                <span>
                  {suggestion}
                </span>
              </div>
            ),
          )}
        </div>
      </section>
    </section>
  );
}
