"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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

  const feedback =
    useMemo(
      () =>
        overview
          ?.feedback
          ?.latest ?? [],
      [
        overview,
      ]
    );

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
              setAccessKey(
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
                void loadOverview(
                  accessKey
                );
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
            onClick={() =>
              void loadOverview(
                accessKey
              )
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
                800,

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
                  900,

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
                  30,
              }}
            >
              Founder Console
            </h1>

            <p
              style={{
                margin:
                  "7px 0 0",

                color:
                  "#64748b",
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
                42,

              padding:
                "0 15px",

              border:
                "1px solid #cbd5e1",

              borderRadius:
                12,

              background:
                "#ffffff",

              color:
                "#334155",

              fontWeight:
                800,

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
              "repeat(auto-fit, minmax(155px, 1fr))",

            gap:
              12,

            marginTop:
              24,
          }}
        >
          <MetricCard
            icon="💬"
            label="全部反馈"
            value={
              overview
                ?.feedback
                ?.total ?? 0
            }
            detail="已进入创始人反馈池"
          />

          <MetricCard
            icon="🐛"
            label="Bug"
            value={
              overview
                ?.feedback
                ?.bugs ?? 0
            }
            detail="需要优先检查"
          />

          <MetricCard
            icon="⚠️"
            label="负面反馈"
            value={
              overview
                ?.feedback
                ?.critical ?? 0
            }
            detail="评分 1–2"
          />

          <MetricCard
            icon="😍"
            label="正面反馈"
            value={
              overview
                ?.feedback
                ?.positive ?? 0
            }
            detail="评分 4–5"
          />

          <MetricCard
            icon="👥"
            label="反馈用户"
            value={
              overview
                ?.feedback
                ?.uniqueUsers ?? 0
            }
            detail="独立匿名用户"
          />

          <MetricCard
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
              "repeat(auto-fit, minmax(250px, 1fr))",

            gap:
              14,

            marginTop:
              18,
          }}
        >
          <SystemCard
            icon="⚡"
            title="Runtime"
            value="Online"
            detail="Founder API 正常响应"
          />

          <SystemCard
            icon="🗃️"
            title="Storage"
            value={
              overview
                ?.storage
                ?.mode ?? "unknown"
            }
            detail={
              overview
                ?.storage
                ?.workspaceId ??
              "default"
            }
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
                "center",

              justifyContent:
                "space-between",

              gap:
                12,
            }}
          >
            <div>
              <h2
                style={{
                  margin:
                    0,

                  fontSize:
                    20,
                }}
              >
                最新用户反馈
              </h2>

              <p
                style={{
                  margin:
                    "6px 0 0",

                  color:
                    "#64748b",

                  fontSize:
                    13,
                }}
              >
                所有新提交反馈会进入这里，仅 Founder API 可读取。
              </p>
            </div>

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
                  40,

                padding:
                  "0 14px",

                border:
                  "1px solid #cbd5e1",

                borderRadius:
                  12,

                background:
                  "#ffffff",

                fontWeight:
                  800,

                cursor:
                  "pointer",
              }}
            >
              {loading
                ? "刷新中"
                : "刷新"}
            </button>
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
              <div
                style={{
                  padding:
                    "28px 18px",

                  border:
                    "1px dashed #cbd5e1",

                  borderRadius:
                    16,

                  color:
                    "#64748b",

                  textAlign:
                    "center",
                }}
              >
                暂无全局反馈。部署后新提交的反馈会显示在这里。
              </div>
            )}

            {feedback.map(
              (item) => (
                <article
                  key={
                    item.id
                  }
                  style={{
                    padding:
                      16,

                    border:
                      "1px solid #e2e8f0",

                    borderRadius:
                      16,

                    background:
                      "#f8fafc",
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
                          12,

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
                        8,

                      marginTop:
                        13,
                    }}
                  >
                    <Tag>
                      用户：
                      {item.userId.slice(
                        0,
                        16
                      )}
                    </Tag>

                    <Tag>
                      页面：
                      {item.page}
                    </Tag>

                    <Tag>
                      版本：
                      {item.runtimeVersion}
                    </Tag>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value:
    string | number;
  detail: string;
}) {
  return (
    <article
      style={{
        padding:
          17,

        border:
          "1px solid #dbe3f0",

        borderRadius:
          18,

        background:
          "#ffffff",
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
              800,
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
          marginTop:
            5,

          color:
            "#94a3b8",

          fontSize:
            12,
        }}
      >
        {detail}
      </div>
    </article>
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
            900,

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
          700,
      }}
    >
      {children}
    </span>
  );
}