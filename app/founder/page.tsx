"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

interface FounderFeedback {
  id: string;
  userId: string;

  category:
    | "great"
    | "good"
    | "neutral"
    | "bad"
    | "bug";

  rating: number;
  message: string;
  page: string;
  runtimeVersion: string;
  createdAt: number;
}

interface FounderOverview {
  success: boolean;

  founder?: boolean;
  configured?: boolean;
  version?: string;
  environment?: string;

  deployment?: {
    commit: string;
    branch: string;
    url: string;
  };

  storage?: {
    mode: string;
    workspaceId: string;
    health: unknown;
  };

  feedback?: {
    total: number;
    bugs: number;
    positive: number;
    critical: number;
    averageRating: number;
    uniqueUsers: number;
    latest: FounderFeedback[];
  };

  error?: string;
  content?: string;
  timestamp?: number;
}

const STORAGE_KEY =
  "aios-founder-access-key";

function getCategoryLabel(
  category:
    FounderFeedback["category"]
): string {
  const labels = {
    great:
      "很满意",

    good:
      "满意",

    neutral:
      "一般",

    bad:
      "不满意",

    bug:
      "Bug",
  } as const;

  return labels[
    category
  ];
}

function getCategoryEmoji(
  category:
    FounderFeedback["category"]
): string {
  const emojis = {
    great:
      "😍",

    good:
      "🙂",

    neutral:
      "😐",

    bad:
      "☹️",

    bug:
      "🐛",
  } as const;

  return emojis[
    category
  ];
}

function formatTime(
  value:
    number
): string {
  return new Intl.DateTimeFormat(
    "zh-CN",
    {
      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

function maskUserId(
  userId:
    string
): string {
  if (
    userId.length <= 18
  ) {
    return userId;
  }

  return `${userId.slice(
    0,
    10
  )}…${userId.slice(
    -6
  )}`;
}

export default function FounderPage() {
  const [
    accessKey,
    setAccessKey,
  ] =
    useState("");

  const [
    overview,
    setOverview,
  ] =
    useState<
      FounderOverview
      | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    authenticated,
    setAuthenticated,
  ] =
    useState(false);

  const loadOverview =
    useCallback(
      async (
        key:
          string
      ) => {
        const normalizedKey =
          key.trim();

        if (
          !normalizedKey
        ) {
          setError(
            "请输入创始人访问密钥。"
          );

          return;
        }

        setLoading(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await fetch(
              "/api/founder/overview",
              {
                method:
                  "GET",

                cache:
                  "no-store",

                headers: {
                  Accept:
                    "application/json",

                  Authorization:
                    `Bearer ${normalizedKey}`,
                },
              }
            );

          const data =
            (await response.json()) as
              FounderOverview;

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.content ||
                data.error ||
                "Founder Console loading failed."
            );
          }

          window.sessionStorage.setItem(
            STORAGE_KEY,
            normalizedKey
          );

          setAccessKey(
            normalizedKey
          );

          setOverview(
            data
          );

          setAuthenticated(
            true
          );
        } catch (
          requestError
        ) {
          window.sessionStorage.removeItem(
            STORAGE_KEY
          );

          setAuthenticated(
            false
          );

          setOverview(
            null
          );

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Founder Console loading failed."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY
      );

    if (
      storedKey
    ) {
      setAccessKey(
        storedKey
      );

      void loadOverview(
        storedKey
      );
    }
  }, [
    loadOverview,
  ]);

  function logout() {
    window.sessionStorage.removeItem(
      STORAGE_KEY
    );

    setAccessKey(
      ""
    );

    setOverview(
      null
    );

    setAuthenticated(
      false
    );

    setError(
      ""
    );
  }

  if (
    !authenticated
  ) {
    return (
      <FounderLogin
        accessKey={
          accessKey
        }
        loading={
          loading
        }
        error={
          error
        }
        onChange={
          setAccessKey
        }
        onSubmit={() =>
          void loadOverview(
            accessKey
          )
        }
      />
    );
  }

  const feedback =
    overview
      ?.feedback
      ?.latest ?? [];

  return (
    <main
      style={{
        minHeight:
          "100vh",

        padding:
          "24px 18px 60px",

        boxSizing:
          "border-box",

        background:
          "#f4f6fb",

        color:
          "#0f172a",
      }}
    >
      <div
        style={{
          width:
            "100%",

          maxWidth:
            1180,

          margin:
            "0 auto",
        }}
      >
        <header
          style={{
            display:
              "flex",

            alignItems:
              "flex-start",

            justifyContent:
              "space-between",

            gap:
              16,
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#2563eb",

                fontSize:
                  12,

                fontWeight:
                  950,

                letterSpacing:
                  "0.14em",
              }}
            >
              PRIVATE FOUNDER ACCESS
            </div>

            <h1
              style={{
                margin:
                  "7px 0 0",

                fontSize:
                  31,

                lineHeight:
                  1.1,
              }}
            >
              Founder Console
            </h1>

            <p
              style={{
                margin:
                  "9px 0 0",

                color:
                  "#64748b",

                lineHeight:
                  1.5,
              }}
            >
              AIOS Alpha 运行、反馈与部署中心
            </p>
          </div>

          <button
            type="button"
            onClick={
              logout
            }
            style={{
              height:
                43,

              padding:
                "0 16px",

              border:
                "1px solid #cbd5e1",

              borderRadius:
                13,

              background:
                "#ffffff",

              color:
                "#334155",

              fontWeight:
                900,

              cursor:
                "pointer",
            }}
          >
            退出
          </button>
        </header>

        <section
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(145px, 1fr))",

            gap:
              12,

            marginTop:
              24,
          }}
        >
          <MetricLink
            href="/founder/feedback"
            icon="💬"
            label="全部反馈"
            value={
              overview
                ?.feedback
                ?.total ?? 0
            }
            detail="查看全部用户反馈"
          />

          <MetricLink
            href="/founder/feedback?category=bug"
            icon="🐛"
            label="Bug"
            value={
              overview
                ?.feedback
                ?.bugs ?? 0
            }
            detail="需要优先检查"
          />

          <MetricLink
            href="/founder/feedback?rating=1"
            icon="⚠️"
            label="负面反馈"
            value={
              overview
                ?.feedback
                ?.critical ?? 0
            }
            detail="评分 1–2"
          />

          <MetricLink
            href="/founder/feedback?rating=5"
            icon="😍"
            label="正面反馈"
            value={
              overview
                ?.feedback
                ?.positive ?? 0
            }
            detail="评分 4–5"
          />

          <MetricLink
            href="/founder/feedback"
            icon="👥"
            label="反馈用户"
            value={
              overview
                ?.feedback
                ?.uniqueUsers ?? 0
            }
            detail="独立匿名用户"
          />

          <MetricLink
            href="/founder/feedback"
            icon="⭐"
            label="平均评分"
            value={
              overview
                ?.feedback
                ?.averageRating ?? 0
            }
            detail="满分 5 分"
          />
        </section>

        <section
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(245px, 1fr))",

            gap:
              14,

            marginTop:
              18,
          }}
        >
          <SystemLink
            href="/api/runtime/status"
            icon="⚡"
            title="Runtime"
            value="Online"
            detail="打开 Runtime Status"
          />

          <SystemLink
            href="/api/storage/status"
            icon="🗃️"
            title="Storage"
            value={
              overview
                ?.storage
                ?.mode ??
              "unknown"
            }
            detail={
              overview
                ?.storage
                ?.workspaceId ??
              "default"
            }
          />

          <SystemLink
            href="/dashboard"
            icon="📊"
            title="Dashboard"
            value="Operating Center"
            detail="查看 AIOS 当前运行状态"
          />

          <SystemLink
            href="/api/planner/snapshot"
            icon="🎯"
            title="Planner"
            value="Snapshot"
            detail="查看当前任务与执行队列"
          />

          <SystemCard
            icon="🚀"
            title="Deploy"
            value={
              `v${
                overview
                  ?.version ??
                "0.4"
              }`
            }
            detail={
              `${
                overview
                  ?.environment ??
                "unknown"
              } · ${
                overview
                  ?.deployment
                  ?.commit ??
                "local"
              }`
            }
          />

          <SystemCard
            icon="🌿"
            title="Branch"
            value={
              overview
                ?.deployment
                ?.branch ??
              "local"
            }
            detail={
              overview
                ?.deployment
                ?.url ??
              "localhost"
            }
          />
        </section>

        <section
          style={{
            marginTop:
              20,

            padding:
              20,

            border:
              "1px solid #dbe3f0",

            borderRadius:
              22,

            background:
              "#ffffff",
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
                14,
            }}
          >
            <div>
              <h2
                style={{
                  margin:
                    0,

                  fontSize:
                    21,
                }}
              >
                最新用户反馈
              </h2>

              <p
                style={{
                  margin:
                    "7px 0 0",

                  color:
                    "#64748b",

                  fontSize:
                    13,

                  lineHeight:
                    1.5,
                }}
              >
                所有新提交反馈会进入这里，仅 Founder API 可读取。
              </p>
            </div>

            <Link
              href="/founder/feedback"
              style={{
                minWidth:
                  88,

                height:
                  42,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                padding:
                  "0 13px",

                boxSizing:
                  "border-box",

                border:
                  "1px solid #bfdbfe",

                borderRadius:
                  13,

                background:
                  "#eff6ff",

                color:
                  "#2563eb",

                fontSize:
                  13,

                fontWeight:
                  900,

                textDecoration:
                  "none",
              }}
            >
              查看全部 →
            </Link>
          </div>

          <div
            style={{
              display:
                "grid",

              gap:
                12,

              marginTop:
                18,
            }}
          >
            {feedback.length ===
              0 && (
              <Link
                href="/founder/feedback"
                style={{
                  display:
                    "block",

                  padding:
                    "30px 18px",

                  border:
                    "1px dashed #cbd5e1",

                  borderRadius:
                    16,

                  color:
                    "#64748b",

                  textAlign:
                    "center",

                  lineHeight:
                    1.6,

                  textDecoration:
                    "none",
                }}
              >
                暂无全局反馈。部署后新提交的反馈会显示在这里。
              </Link>
            )}

            {feedback
              .slice(
                0,
                5
              )
              .map(
                (
                  item
                ) => (
                  <Link
                    key={
                      item.id
                    }
                    href="/founder/feedback"
                    style={{
                      display:
                        "block",

                      padding:
                        16,

                      border:
                        item.category ===
                        "bug"
                          ? "1px solid #fecaca"
                          : "1px solid #e2e8f0",

                      borderRadius:
                        16,

                      background:
                        "#f8fafc",

                      color:
                        "inherit",

                      textDecoration:
                        "none",
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
                          12,
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

                          fontWeight:
                            900,
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              22,
                          }}
                        >
                          {getCategoryEmoji(
                            item.category
                          )}
                        </span>

                        <span>
                          {getCategoryLabel(
                            item.category
                          )}
                        </span>

                        <span
                          style={{
                            color:
                              "#f59e0b",

                            fontSize:
                              13,

                            letterSpacing:
                              1,
                          }}
                        >
                          {"★".repeat(
                            item.rating
                          )}
                        </span>
                      </div>

                      <time
                        style={{
                          color:
                            "#64748b",

                          fontSize:
                            11,

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {formatTime(
                          item.createdAt
                        )}
                      </time>
                    </div>

                    <p
                      style={{
                        margin:
                          "13px 0 0",

                        color:
                          item.message
                            ? "#1e293b"
                            : "#94a3b8",

                        lineHeight:
                          1.65,

                        whiteSpace:
                          "pre-wrap",

                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {item.message ||
                        "用户未填写文字反馈。"}
                    </p>

                    <div
                      style={{
                        display:
                          "flex",

                        flexWrap:
                          "wrap",

                        gap:
                          7,

                        marginTop:
                          13,
                      }}
                    >
                      <Tag>
                        👤{" "}
                        {maskUserId(
                          item.userId
                        )}
                      </Tag>

                      <Tag>
                        📍{" "}
                        {item.page}
                      </Tag>

                      <Tag>
                        🚀 v
                        {item.runtimeVersion}
                      </Tag>
                    </div>
                  </Link>
                )
              )}
          </div>
        </section>

        <section
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",

            gap:
              12,

            marginTop:
              18,
          }}
        >
          <ActionLink
            href="/workspace"
            icon="💬"
            title="用户 Workspace"
            detail="进入用户端工作空间"
          />

          <ActionLink
            href="/tasks"
            icon="✅"
            title="任务中心"
            detail="查看当前任务与完成情况"
          />

          <ActionLink
            href="/memory"
            icon="🗃️"
            title="记忆中心"
            detail="查看当前用户长期记忆"
          />

          <ActionLink
            href="/founder/feedback"
            icon="📮"
            title="反馈中心"
            detail="搜索、筛选并分析用户反馈"
          />
        </section>

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "center",

            marginTop:
              22,
          }}
        >
          <button
            type="button"
            disabled={
              loading
            }
            onClick={() =>
              void loadOverview(
                accessKey
              )
            }
            style={{
              height:
                44,

              padding:
                "0 18px",

              border:
                "1px solid #cbd5e1",

              borderRadius:
                13,

              background:
                "#ffffff",

              color:
                "#2563eb",

              fontWeight:
                900,

              cursor:
                loading
                  ? "default"
                  : "pointer",
            }}
          >
            {loading
              ? "数据刷新中…"
              : "刷新 Founder 数据"}
          </button>
        </div>
      </div>
    </main>
  );
}

function FounderLogin({
  accessKey,
  loading,
  error,
  onChange,
  onSubmit,
}: {
  accessKey: string;
  loading: boolean;
  error: string;
  onChange: (
    value:
      string
  ) => void;
  onSubmit: () => void;
}) {
  return (
    <main
      style={{
        minHeight:
          "100vh",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          20,

        boxSizing:
          "border-box",

        background:
          "#f4f6fb",

        color:
          "#0f172a",
      }}
    >
      <section
        style={{
          width:
            "100%",

          maxWidth:
            440,

          padding:
            28,

          boxSizing:
            "border-box",

          border:
            "1px solid #e2e8f0",

          borderRadius:
            24,

          background:
            "#ffffff",

          boxShadow:
            "0 24px 70px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div
          style={{
            width:
              54,

            height:
              54,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            borderRadius:
              16,

            background:
              "#0f172a",

            color:
              "#ffffff",

            fontSize:
              26,
          }}
        >
          🔐
        </div>

        <h1
          style={{
            margin:
              "20px 0 0",

            fontSize:
              28,
          }}
        >
          Founder Console
        </h1>

        <p
          style={{
            margin:
              "8px 0 0",

            color:
              "#64748b",

            lineHeight:
              1.6,
          }}
        >
          仅限 AIOS Alpha 创始人访问。
        </p>

        <input
          type="password"
          value={
            accessKey
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          onKeyDown={(
            event
          ) => {
            if (
              event.key ===
              "Enter"
            ) {
              onSubmit();
            }
          }}
          placeholder="输入 Founder Access Key"
          autoComplete="current-password"
          style={{
            width:
              "100%",

            height:
              50,

            marginTop:
              24,

            padding:
              "0 16px",

            boxSizing:
              "border-box",

            border:
              "1px solid #cbd5e1",

            borderRadius:
              14,

            background:
              "#ffffff",

            color:
              "#0f172a",

            font:
              "inherit",

            outline:
              "none",
          }}
        />

        {error && (
          <div
            style={{
              marginTop:
                12,

              color:
                "#b91c1c",

              fontSize:
                13,

              lineHeight:
                1.5,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={
            loading
          }
          onClick={
            onSubmit
          }
          style={{
            width:
              "100%",

            height:
              50,

            marginTop:
              16,

            border:
              0,

            borderRadius:
              14,

            background:
              loading
                ? "#94a3b8"
                : "#0f172a",

            color:
              "#ffffff",

            fontSize:
              15,

            fontWeight:
              900,

            cursor:
              loading
                ? "default"
                : "pointer",
          }}
        >
          {loading
            ? "验证中…"
            : "进入 Founder Console"}
        </button>
      </section>
    </main>
  );
}

function MetricLink({
  href,
  icon,
  label,
  value,
  detail,
}: {
  href: string;
  icon: string;
  label: string;
  value:
    string |
    number;
  detail: string;
}) {
  return (
    <Link
      href={
        href
      }
      style={{
        display:
          "block",

        padding:
          17,

        border:
          "1px solid #dbe3f0",

        borderRadius:
          18,

        background:
          "#ffffff",

        color:
          "#0f172a",

        textDecoration:
          "none",

        boxShadow:
          "0 5px 16px rgba(15, 23, 42, 0.03)",
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
              13,

            fontWeight:
              850,
          }}
        >
          {label}
        </span>

        <span
          style={{
            fontSize:
              20,
          }}
        >
          {icon}
        </span>
      </div>

      <div
        style={{
          marginTop:
            12,

          fontSize:
            30,

          fontWeight:
            950,
        }}
      >
        {value}
      </div>

      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            8,

          marginTop:
            5,

          color:
            "#94a3b8",

          fontSize:
            12,
        }}
      >
        <span>
          {detail}
        </span>

        <span>
          →
        </span>
      </div>
    </Link>
  );
}

function SystemLink({
  href,
  icon,
  title,
  value,
  detail,
}: {
  href: string;
  icon: string;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Link
      href={
        href
      }
      style={{
        display:
          "block",

        padding:
          18,

        borderRadius:
          18,

        background:
          "#0f172a",

        color:
          "#ffffff",

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
        }}
      >
        <span
          style={{
            fontSize:
              22,
          }}
        >
          {icon}
        </span>

        <span
          style={{
            color:
              "#64748b",

            fontSize:
              18,
          }}
        >
          →
        </span>
      </div>

      <div
        style={{
          marginTop:
            13,

          color:
            "#94a3b8",

          fontSize:
            12,

          fontWeight:
            900,

          letterSpacing:
            "0.08em",

          textTransform:
            "uppercase",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop:
            6,

          fontSize:
            21,

          fontWeight:
            950,

          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop:
            6,

          color:
            "#94a3b8",

          fontSize:
            12,

          overflowWrap:
            "anywhere",
        }}
      >
        {detail}
      </div>
    </Link>
  );
}

function SystemCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: string;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article
      style={{
        padding:
          18,

        borderRadius:
          18,

        background:
          "#0f172a",

        color:
          "#ffffff",
      }}
    >
      <div
        style={{
          fontSize:
            22,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          marginTop:
            13,

          color:
            "#94a3b8",

          fontSize:
            12,

          fontWeight:
            900,

          letterSpacing:
            "0.08em",

          textTransform:
            "uppercase",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop:
            6,

          fontSize:
            21,

          fontWeight:
            950,

          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop:
            6,

          color:
            "#94a3b8",

          fontSize:
            12,

          overflowWrap:
            "anywhere",
        }}
      >
        {detail}
      </div>
    </article>
  );
}

function ActionLink({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={
        href
      }
      style={{
        display:
          "flex",

        alignItems:
          "center",

        gap:
          13,

        padding:
          16,

        border:
          "1px solid #dbe3f0",

        borderRadius:
          17,

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
          width:
            44,

          height:
            44,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          flex:
            "0 0 auto",

          borderRadius:
            13,

          background:
            "#f1f5f9",

          fontSize:
            21,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          minWidth:
            0,

          flex:
            1,
        }}
      >
        <div
          style={{
            fontWeight:
              950,
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop:
              4,

            color:
              "#64748b",

            fontSize:
              12,

            lineHeight:
              1.4,
          }}
        >
          {detail}
        </div>
      </div>

      <div
        style={{
          color:
            "#94a3b8",

          fontSize:
            20,
        }}
      >
        →
      </div>
    </Link>
  );
}

function Tag({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span
      style={{
        padding:
          "5px 9px",

        border:
          "1px solid #dbe3f0",

        borderRadius:
          999,

        background:
          "#ffffff",

        color:
          "#64748b",

        fontSize:
          11,

        fontWeight:
          750,

        overflowWrap:
          "anywhere",
      }}
    >
      {children}
    </span>
  );
}