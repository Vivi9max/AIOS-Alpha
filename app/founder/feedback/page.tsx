"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type FeedbackCategory =
  | "great"
  | "good"
  | "neutral"
  | "bad"
  | "bug";

interface FeedbackRecord {
  id: string;
  userId: string;
  category:
    FeedbackCategory;
  rating: number;
  message: string;
  page: string;
  runtimeVersion: string;
  createdAt: number;
}

interface FeedbackSummary {
  total: number;
  bugs: number;
  positive: number;
  negative: number;
  neutral: number;
  averageRating: number;
  uniqueUsers: number;
}

interface FeedbackResponse {
  success: boolean;

  summary?: FeedbackSummary;

  items?: FeedbackRecord[];

  error?: string;

  content?: string;

  timestamp?: number;
}

const FOUNDER_KEY_STORAGE =
  "aios-founder-access-key";

const categoryOptions: Array<{
  value:
    "all" |
    FeedbackCategory;

  label: string;

  emoji: string;
}> = [
  {
    value:
      "all",
    label:
      "全部",
    emoji:
      "💬",
  },
  {
    value:
      "bug",
    label:
      "Bug",
    emoji:
      "🐛",
  },
  {
    value:
      "great",
    label:
      "很满意",
    emoji:
      "😍",
  },
  {
    value:
      "good",
    label:
      "满意",
    emoji:
      "🙂",
  },
  {
    value:
      "neutral",
    label:
      "一般",
    emoji:
      "😐",
  },
  {
    value:
      "bad",
    label:
      "不满意",
    emoji:
      "☹️",
  },
];

function getCategoryLabel(
  category:
    FeedbackCategory
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
    FeedbackCategory
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
  timestamp:
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
      timestamp
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

export default function FounderFeedbackPage() {
  const [
    accessKey,
    setAccessKey,
  ] =
    useState("");

  const [
    category,
    setCategory,
  ] =
    useState<
      "all" |
      FeedbackCategory
    >(
      "all"
    );

  const [
    rating,
    setRating,
  ] =
    useState(
      "all"
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] =
    useState("");

  const [
    records,
    setRecords,
  ] =
    useState<
      FeedbackRecord[]
    >([]);

  const [
    summary,
    setSummary,
  ] =
    useState<
      FeedbackSummary
      | null
    >(null);

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
    useState("");

  const [
    authorized,
    setAuthorized,
  ] =
    useState(
      false
    );

  const loadFeedback =
    useCallback(
      async (
        key:
          string,

        selectedCategory:
          string,

        selectedRating:
          string,

        searchValue:
          string
      ) => {
        const normalizedKey =
          key.trim();

        if (
          !normalizedKey
        ) {
          setAuthorized(
            false
          );

          setLoading(
            false
          );

          setError(
            "Founder Access Key 不存在，请先从 Founder Console 登录。"
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
          const query =
            new URLSearchParams();

          query.set(
            "limit",
            "300"
          );

          if (
            selectedCategory &&
            selectedCategory !==
              "all"
          ) {
            query.set(
              "category",
              selectedCategory
            );
          }

          if (
            selectedRating &&
            selectedRating !==
              "all"
          ) {
            query.set(
              "rating",
              selectedRating
            );
          }

          if (
            searchValue.trim()
          ) {
            query.set(
              "search",
              searchValue.trim()
            );
          }

          const response =
            await fetch(
              `/api/founder/feedback?${query.toString()}`,
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
              FeedbackResponse;

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.content ||
                data.error ||
                "反馈加载失败。"
            );
          }

          setRecords(
            data.items ??
            []
          );

          setSummary(
            data.summary ??
            null
          );

          setAuthorized(
            true
          );
        } catch (
          requestError
        ) {
          setRecords(
            []
          );

          setSummary(
            null
          );

          setError(
            requestError instanceof Error
              ? requestError.message
              : "反馈加载失败。"
          );

          if (
            requestError instanceof Error &&
            requestError.message.includes(
              "密钥"
            )
          ) {
            setAuthorized(
              false
            );
          }
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
        FOUNDER_KEY_STORAGE
      ) ?? "";

    setAccessKey(
      storedKey
    );

    void loadFeedback(
      storedKey,
      category,
      rating,
      appliedSearch
    );
  }, [
    appliedSearch,
    category,
    loadFeedback,
    rating,
  ]);

  const emptyText =
    useMemo(
      () => {
        if (
          category !==
          "all" ||
          rating !==
          "all" ||
          appliedSearch
        ) {
          return "当前筛选条件下没有反馈。";
        }

        return "暂时没有用户反馈。新反馈提交后会显示在这里。";
      },
      [
        appliedSearch,
        category,
        rating,
      ]
    );

  function submitSearch() {
    setAppliedSearch(
      search.trim()
    );
  }

  function clearFilters() {
    setCategory(
      "all"
    );

    setRating(
      "all"
    );

    setSearch(
      ""
    );

    setAppliedSearch(
      ""
    );
  }

  if (
    !loading &&
    !authorized
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
              460,

            padding:
              28,

            boxSizing:
              "border-box",

            border:
              "1px solid #dbe3f0",

            borderRadius:
              24,

            background:
              "#ffffff",

            textAlign:
              "center",
          }}
        >
          <div
            style={{
              fontSize:
                44,
            }}
          >
            🔐
          </div>

          <h1
            style={{
              margin:
                "16px 0 0",

              fontSize:
                25,
            }}
          >
            Founder Access Required
          </h1>

          <p
            style={{
              margin:
                "10px 0 0",

              color:
                "#64748b",

              lineHeight:
                1.65,
            }}
          >
            {error}
          </p>

          <Link
            href="/founder"
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              height:
                48,

              marginTop:
                20,

              borderRadius:
                14,

              background:
                "#0f172a",

              color:
                "#ffffff",

              fontWeight:
                900,

              textDecoration:
                "none",
            }}
          >
            返回 Founder Console
          </Link>
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
          "22px 18px 60px",

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
              14,
          }}
        >
          <div>
            <Link
              href="/founder"
              style={{
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
              ← Founder Console
            </Link>

            <div
              style={{
                marginTop:
                  16,

                color:
                  "#2563eb",

                fontSize:
                  12,

                fontWeight:
                  950,

                letterSpacing:
                  "0.13em",
              }}
            >
              PRIVATE FEEDBACK CENTER
            </div>

            <h1
              style={{
                margin:
                  "6px 0 0",

                fontSize:
                  30,
              }}
            >
              用户反馈中心
            </h1>

            <p
              style={{
                margin:
                  "7px 0 0",

                color:
                  "#64748b",

                lineHeight:
                  1.5,
              }}
            >
              查看所有用户提交的评分、Bug 和产品建议。
            </p>
          </div>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={() =>
              void loadFeedback(
                accessKey,
                category,
                rating,
                appliedSearch
              )
            }
            style={{
              minWidth:
                76,

              height:
                43,

              padding:
                "0 14px",

              border:
                "1px solid #cbd5e1",

              borderRadius:
                13,

              background:
                "#ffffff",

              color:
                "#2563eb",

              fontSize:
                14,

              fontWeight:
                900,

              cursor:
                "pointer",
            }}
          >
            {loading
              ? "刷新中"
              : "刷新"}
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
              22,
          }}
        >
          <SummaryCard
            icon="💬"
            label="全部"
            value={
              summary
                ?.total ?? 0
            }
          />

          <SummaryCard
            icon="🐛"
            label="Bug"
            value={
              summary
                ?.bugs ?? 0
            }
          />

          <SummaryCard
            icon="⚠️"
            label="负面"
            value={
              summary
                ?.negative ?? 0
            }
          />

          <SummaryCard
            icon="😍"
            label="正面"
            value={
              summary
                ?.positive ?? 0
            }
          />

          <SummaryCard
            icon="👥"
            label="用户"
            value={
              summary
                ?.uniqueUsers ?? 0
            }
          />

          <SummaryCard
            icon="⭐"
            label="平均评分"
            value={
              summary
                ?.averageRating ?? 0
            }
          />
        </section>

        <section
          style={{
            marginTop:
              18,

            padding:
              16,

            border:
              "1px solid #dbe3f0",

            borderRadius:
              20,

            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              display:
                "flex",

              gap:
                9,

              overflowX:
                "auto",

              paddingBottom:
                3,
            }}
          >
            {categoryOptions.map(
              (
                option
              ) => {
                const active =
                  category ===
                  option.value;

                return (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    onClick={() =>
                      setCategory(
                        option.value
                      )
                    }
                    style={{
                      flex:
                        "0 0 auto",

                      height:
                        40,

                      padding:
                        "0 13px",

                      border:
                        active
                          ? "1px solid #0f172a"
                          : "1px solid #dbe3f0",

                      borderRadius:
                        999,

                      background:
                        active
                          ? "#0f172a"
                          : "#ffffff",

                      color:
                        active
                          ? "#ffffff"
                          : "#475569",

                      fontWeight:
                        850,

                      cursor:
                        "pointer",
                    }}
                  >
                    {option.emoji}{" "}
                    {option.label}
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "minmax(0, 1fr) auto",

              gap:
                9,

              marginTop:
                14,
            }}
          >
            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
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
                  submitSearch();
                }
              }}
              placeholder="搜索反馈内容、用户、页面或版本"
              style={{
                width:
                  "100%",

                height:
                  44,

                padding:
                  "0 13px",

                boxSizing:
                  "border-box",

                border:
                  "1px solid #cbd5e1",

                borderRadius:
                  12,

                font:
                  "inherit",

                outline:
                  "none",
              }}
            />

            <button
              type="button"
              onClick={
                submitSearch
              }
              style={{
                height:
                  44,

                padding:
                  "0 16px",

                border:
                  0,

                borderRadius:
                  12,

                background:
                  "#2563eb",

                color:
                  "#ffffff",

                fontWeight:
                  900,

                cursor:
                  "pointer",
              }}
            >
              搜索
            </button>
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
                12,

              marginTop:
                12,
            }}
          >
            <select
              value={
                rating
              }
              onChange={(
                event
              ) =>
                setRating(
                  event.target.value
                )
              }
              style={{
                height:
                  40,

                padding:
                  "0 12px",

                border:
                  "1px solid #cbd5e1",

                borderRadius:
                  11,

                background:
                  "#ffffff",

                color:
                  "#334155",

                font:
                  "inherit",
              }}
            >
              <option value="all">
                全部评分
              </option>

              <option value="5">
                5 星
              </option>

              <option value="4">
                4 星
              </option>

              <option value="3">
                3 星
              </option>

              <option value="2">
                2 星
              </option>

              <option value="1">
                1 星
              </option>
            </select>

            <button
              type="button"
              onClick={
                clearFilters
              }
              style={{
                border:
                  0,

                background:
                  "transparent",

                color:
                  "#64748b",

                fontWeight:
                  850,

                cursor:
                  "pointer",
              }}
            >
              清除筛选
            </button>
          </div>
        </section>

        {error && (
          <div
            style={{
              marginTop:
                16,

              padding:
                14,

              border:
                "1px solid #fecaca",

              borderRadius:
                14,

              background:
                "#fef2f2",

              color:
                "#b91c1c",

              lineHeight:
                1.5,
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            display:
              "grid",

            gap:
              13,

            marginTop:
              18,
          }}
        >
          {loading && (
            <div
              style={{
                padding:
                  34,

                border:
                  "1px solid #dbe3f0",

                borderRadius:
                  20,

                background:
                  "#ffffff",

                color:
                  "#64748b",

                textAlign:
                  "center",
              }}
            >
              正在加载用户反馈…
            </div>
          )}

          {!loading &&
            records.length ===
              0 && (
              <div
                style={{
                  padding:
                    "42px 20px",

                  border:
                    "1px dashed #cbd5e1",

                  borderRadius:
                    20,

                  background:
                    "#ffffff",

                  color:
                    "#64748b",

                  textAlign:
                    "center",

                  lineHeight:
                    1.6,
                }}
              >
                {emptyText}
              </div>
            )}

          {!loading &&
            records.map(
              (
                record
              ) => (
                <FeedbackCard
                  key={
                    record.id
                  }
                  record={
                    record
                  }
                />
              )
            )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value:
    string |
    number;
}) {
  return (
    <article
      style={{
        padding:
          16,

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

          color:
            "#64748b",

          fontSize:
            13,

          fontWeight:
            850,
        }}
      >
        <span>
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
            10,

          fontSize:
            29,

          fontWeight:
            950,
        }}
      >
        {value}
      </div>
    </article>
  );
}

function FeedbackCard({
  record,
}: {
  record:
    FeedbackRecord;
}) {
  return (
    <article
      style={{
        padding:
          17,

        border:
          record.category ===
          "bug"
            ? "1px solid #fecaca"
            : "1px solid #dbe3f0",

        borderRadius:
          19,

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

            minWidth:
              0,
          }}
        >
          <span
            style={{
              fontSize:
                24,
            }}
          >
            {getCategoryEmoji(
              record.category
            )}
          </span>

          <div>
            <div
              style={{
                fontWeight:
                  950,
              }}
            >
              {getCategoryLabel(
                record.category
              )}
            </div>

            <div
              style={{
                marginTop:
                  3,

                color:
                  "#f59e0b",

                fontSize:
                  13,

                letterSpacing:
                  1,
              }}
            >
              {"★".repeat(
                record.rating
              )}
              <span
                style={{
                  color:
                    "#cbd5e1",
                }}
              >
                {"★".repeat(
                  5 -
                  record.rating
                )}
              </span>
            </div>
          </div>
        </div>

        <time
          style={{
            color:
              "#94a3b8",

            fontSize:
              11,

            whiteSpace:
              "nowrap",
          }}
        >
          {formatTime(
            record.createdAt
          )}
        </time>
      </div>

      <p
        style={{
          margin:
            "15px 0 0",

          color:
            record.message
              ? "#1e293b"
              : "#94a3b8",

          fontSize:
            15,

          lineHeight:
            1.7,

          whiteSpace:
            "pre-wrap",

          overflowWrap:
            "anywhere",
        }}
      >
        {record.message ||
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
            14,
        }}
      >
        <Tag>
          👤{" "}
          {maskUserId(
            record.userId
          )}
        </Tag>

        <Tag>
          📍{" "}
          {record.page}
        </Tag>

        <Tag>
          🚀 v
          {record.runtimeVersion}
        </Tag>

        <Tag>
          ID{" "}
          {record.id.slice(
            -8
          )}
        </Tag>
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
          "1px solid #e2e8f0",

        borderRadius:
          999,

        background:
          "#f8fafc",

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