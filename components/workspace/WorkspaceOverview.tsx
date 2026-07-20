"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MODULE_ICONS,
} from "@/lib/ui/module-icons";

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

const quickActions:
  QuickAction[] = [
    {
      href:
        "/tasks",

      icon:
        "＋",

      title:
        "新建任务",

      description:
        "把目标变成下一步行动",
    },

    {
      href:
        "/memory",

        icon:
          MODULE_ICONS.memory,

      title:
        "记录信息",

      description:
        "保存长期资料和偏好",
    },

    {
      href:
        "/projects",

      icon:
        "📁",

      title:
        "查看项目",

      description:
        "管理正在推进的工作",
    },

    {
      href:
        "#aios-chat",

      icon:
        "✨",

      title:
        "询问 AIOS",

      description:
        "规划、分析或执行操作",
    },
  ];

const emptyStatus:
  DashboardStatus = {
    runtime: {
      status:
        "offline",

      version:
        "0.4",
    },

    provider: {
      active:
        "unknown",

      latencyMs:
        null,
    },

    storage: {
      healthy:
        false,

      persistent:
        false,
    },

    memory: {
      count:
        0,
    },

    profile: {
      completedFields:
        0,

      totalFields:
        5,
    },

    tasks: {
      count:
        0,

      active:
        0,

      completed:
        0,
    },

    feedback: {
      count:
        0,
    },
  };

function safeNumber(
  value: unknown
): number {
  return typeof value ===
    "number"
    ? value
    : 0;
}

export default function WorkspaceOverview() {
  const [
    status,
    setStatus,
  ] =
    useState<DashboardStatus>(
      emptyStatus
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    let active =
      true;

    async function loadStatus() {
      try {
        const response =
          await fetch(
            "/api/dashboard/status",
            {
              cache:
                "no-store",

              credentials:
                "same-origin",
            }
          );

        const data =
          (await response.json()) as DashboardStatus;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            "Workspace status unavailable."
          );
        }

        if (active) {
          setStatus(
            data
          );

          setError(
            ""
          );
        }
      } catch {
        if (active) {
          setStatus(
            emptyStatus
          );

          setError(
            "部分状态暂时无法读取。"
          );
        }
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    }

    loadStatus();

    const interval =
      window.setInterval(
        loadStatus,
        30000
      );

    return () => {
      active =
        false;

      window.clearInterval(
        interval
      );
    };
  }, []);

  const activeTasks =
    safeNumber(
      status.tasks?.active
    );

  const completedTasks =
    safeNumber(
      status.tasks?.completed
    );

  const memoryCount =
    safeNumber(
      status.memory?.count
    );

  const feedbackCount =
    safeNumber(
      status.feedback?.count
    );

  const profileCompleted =
    safeNumber(
      status.profile
        ?.completedFields
    );

  const suggestions =
    useMemo(
      () => {
        const items:
          string[] = [];

        if (
          activeTasks > 0
        ) {
          items.push(
            `你有 ${activeTasks} 个待完成任务，建议先选择其中最重要的一项。`
          );
        } else {
          items.push(
            "当前没有待办任务，可以创建一个今天最重要的行动。"
          );
        }

        if (
          memoryCount <
          3
        ) {
          items.push(
            "长期记忆内容较少，建议告诉 AIOS 你的目标、项目或工作偏好。"
          );
        }

        if (
          profileCompleted <
          3
        ) {
          items.push(
            "个人资料尚未完善，补充资料可以让 AIOS 给出更准确的建议。"
          );
        }

        if (
          feedbackCount >
          0
        ) {
          items.push(
            `你已经提交 ${feedbackCount} 条反馈，感谢帮助改进 AIOS Alpha。`
          );
        }

        return items.slice(
          0,
          3
        );
      },
      [
        activeTasks,
        memoryCount,
        profileCompleted,
        feedbackCount,
      ]
    );

  const stats = [
    {
      label:
        "待办任务",

      value:
        activeTasks,

      detail:
        `已完成 ${completedTasks}`,

      href:
        "/tasks",

      icon:
        "✓",
    },

    {
      label:
        "长期记忆",

      value:
        memoryCount,

      detail:
        `资料 ${profileCompleted}/5`,

      href:
        "/memory",

      icon:
        MODULE_ICONS.memory,
    },

    {
      label:
        "用户反馈",

      value:
        feedbackCount,

      detail:
        "独立存储",

      href:
        "#feedback",

      icon:
        "💬",
    },

    {
      label:
        "Runtime",

      value:
        status.runtime
          ?.status ===
        "online"
          ? "在线"
          : "离线",

      detail:
        status.provider
          ?.active ??
        "unknown",

      href:
        "/dashboard",

      icon:
        "⚡",
    },
  ];

  return (
    <section
      style={{
        display:
          "grid",

        gap:
          18,
      }}
    >
      <div
        style={{
          padding:
            "22px 20px",

          borderRadius:
            20,

          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",

          color:
            "#ffffff",

          boxShadow:
            "0 18px 44px rgba(15, 23, 42, 0.18)",
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

            gap:
              18,
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#93c5fd",

                fontSize:
                  12,

                fontWeight:
                  800,

                letterSpacing:
                  "0.08em",
              }}
            >
              AIOS WORKSPACE
            </div>

            <h1
              style={{
                margin:
                  "9px 0 0",

                fontSize:
                  27,

                lineHeight:
                  1.2,
              }}
            >
              今天准备完成什么？
            </h1>

            <p
              style={{
                margin:
                  "10px 0 0",

                color:
                  "#cbd5e1",

                fontSize:
                  14,

                lineHeight:
                  1.65,
              }}
            >
              AIOS 可以帮助你规划项目、管理任务、保存记忆并持续推进工作。
            </p>
          </div>

          <div
            style={{
              flexShrink:
                0,

              width:
                50,

              height:
                50,

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              borderRadius:
                16,

              background:
                "rgba(255,255,255,0.1)",

              fontSize:
                26,
            }}
          >
            ✨
          </div>
        </div>
      </div>

      <section>
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            marginBottom:
              10,
          }}
        >
          <h2
            style={{
              margin:
                0,

              color:
                "#0f172a",

              fontSize:
                17,
            }}
          >
            快捷操作
          </h2>

          <span
            style={{
              color:
                "#64748b",

              fontSize:
                12,
            }}
          >
            一键开始
          </span>
        </div>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",

            gap:
              10,
          }}
        >
          {quickActions.map(
            (
              action
            ) => (
              <Link
                key={
                  action.title
                }
                href={
                  action.href
                }
                style={{
                  minWidth:
                    0,

                  padding:
                    14,

                  border:
                    "1px solid #e2e8f0",

                  borderRadius:
                    16,

                  background:
                    "#ffffff",

                  color:
                    "#0f172a",

                  textDecoration:
                    "none",

                  boxShadow:
                    "0 8px 22px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div
                  style={{
                    width:
                      36,

                    height:
                      36,

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    borderRadius:
                      11,

                    background:
                      "#eff6ff",

                    color:
                      "#1d4ed8",

                    fontSize:
                      18,

                    fontWeight:
                      800,
                  }}
                >
                  {action.icon}
                </div>

                <div
                  style={{
                    marginTop:
                      10,

                    fontSize:
                      14,

                    fontWeight:
                      800,
                  }}
                >
                  {action.title}
                </div>

                <div
                  style={{
                    marginTop:
                      4,

                    color:
                      "#64748b",

                    fontSize:
                      11,

                    lineHeight:
                      1.45,
                  }}
                >
                  {action.description}
                </div>
              </Link>
            )
          )}
        </div>
      </section>

      <section>
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            marginBottom:
              10,
          }}
        >
          <h2
            style={{
              margin:
                0,

              color:
                "#0f172a",

              fontSize:
                17,
            }}
          >
            今日状态
          </h2>

          <span
            style={{
              color:
                error
                  ? "#b45309"
                  : "#16a34a",

              fontSize:
                12,

              fontWeight:
                700,
            }}
          >
            {loading
              ? "正在同步…"
              : error ||
                "数据已同步"}
          </span>
        </div>

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",

            gap:
              10,
          }}
        >
          {stats.map(
            (
              item
            ) => (
              <Link
                key={
                  item.label
                }
                href={
                  item.href
                }
                style={{
                  padding:
                    14,

                  border:
                    "1px solid #e2e8f0",

                  borderRadius:
                    16,

                  background:
                    "#ffffff",

                  color:
                    "#0f172a",

                  textDecoration:
                    "none",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap:
                      10,
                  }}
                >
                  <span
                    style={{
                      color:
                        "#64748b",

                      fontSize:
                        12,

                      fontWeight:
                        700,
                    }}
                  >
                    {item.label}
                  </span>

                  <span>
                    {item.icon}
                  </span>
                </div>

                <div
                  style={{
                    marginTop:
                      8,

                    fontSize:
                      24,

                    fontWeight:
                      900,
                  }}
                >
                  {item.value}
                </div>

                <div
                  style={{
                    marginTop:
                      3,

                    color:
                      "#94a3b8",

                    fontSize:
                      11,
                  }}
                >
                  {item.detail}
                </div>
              </Link>
            )
          )}
        </div>
      </section>

      <section
        style={{
          padding:
            18,

          border:
            "1px solid #bfdbfe",

          borderRadius:
            18,

          background:
            "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
        }}
      >
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              9,
          }}
        >
          <span
            style={{
              width:
                34,

              height:
                34,

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              borderRadius:
                11,

              background:
                "#dbeafe",
            }}
          >
            ✨
          </span>

          <h2
            style={{
              margin:
                0,

              color:
                "#0f172a",

              fontSize:
                17,
            }}
          >
            AIOS 建议
          </h2>
        </div>

        <div
          style={{
            display:
              "grid",

            gap:
              9,

            marginTop:
              14,
          }}
        >
          {suggestions.map(
            (
              suggestion,
              index
            ) => (
              <div
                key={
                  suggestion
                }
                style={{
                  display:
                    "flex",

                  alignItems:
                    "flex-start",

                  gap:
                    10,

                  padding:
                    "11px 12px",

                  borderRadius:
                    13,

                  background:
                    "rgba(255,255,255,0.78)",

                  color:
                    "#334155",

                  fontSize:
                    13,

                  lineHeight:
                    1.55,
                }}
              >
                <span
                  style={{
                    flexShrink:
                      0,

                    width:
                      22,

                    height:
                      22,

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

                    fontSize:
                      11,

                    fontWeight:
                      800,
                  }}
                >
                  {index +
                    1}
                </span>

                <span>
                  {suggestion}
                </span>
              </div>
            )
          )}
        </div>
      </section>
    </section>
  );
}