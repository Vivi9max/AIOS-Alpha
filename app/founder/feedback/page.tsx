"use client";

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

  summary?:
    FeedbackSummary;

  items?:
    FeedbackRecord[];

  error?:
    string;

  content?:
    string;
}

const STORAGE_KEY =
  "aios-founder-access-key";

const categories: Array<{
  value:
    "all" |
    FeedbackCategory;

  label:
    string;

  icon:
    string;
}> = [
  {
    value:
      "all",

    label:
      "全部",

    icon:
      "💬",
  },

  {
    value:
      "bug",

    label:
      "Bug",

    icon:
      "🐛",
  },

  {
    value:
      "great",

    label:
      "很满意",

    icon:
      "😍",
  },

  {
    value:
      "good",

    label:
      "满意",

    icon:
      "🙂",
  },

  {
    value:
      "neutral",

    label:
      "一般",

    icon:
      "😐",
  },

  {
    value:
      "bad",

    label:
      "不满意",

    icon:
      "☹️",
  },
];

function readInitialCategory():
  "all" |
  FeedbackCategory {
  if (
    typeof window ===
    "undefined"
  ) {
    return "all";
  }

  const value =
    new URLSearchParams(
      window.location.search
    ).get(
      "category"
    );

  if (
    value ===
      "great" ||
    value ===
      "good" ||
    value ===
      "neutral" ||
    value ===
      "bad" ||
    value ===
      "bug"
  ) {
    return value;
  }

  return "all";
}

function readInitialRating():
  string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "all";
  }

  const value =
    new URLSearchParams(
      window.location.search
    ).get(
      "rating"
    );

  if (
    value === "1" ||
    value === "2" ||
    value === "3" ||
    value === "4" ||
    value === "5"
  ) {
    return value;
  }

  return "all";
}

function categoryLabel(
  category:
    FeedbackCategory
): string {
  const values = {
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

  return values[
    category
  ];
}

function categoryIcon(
  category:
    FeedbackCategory
): string {
  const values = {
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

  return values[
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

function maskUser(
  userId:
    string
): string {
  if (
    userId.length <=
    18
  ) {
    return userId;
  }

  return `${userId.slice(
    0,
    9
  )}…${userId.slice(
    -5
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
      FeedbackSummary |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    authorized,
    setAuthorized,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState("");

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
            "请先从 Founder Console 登录。"
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
            "200"
          );

          if (
            selectedCategory !==
            "all"
          ) {
            query.set(
              "category",
              selectedCategory
            );
          }

          if (
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

          setAuthorized(
            false
          );

          setError(
            requestError instanceof Error
              ? requestError.message
              : "反馈加载失败。"
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
      ) ?? "";

    const initialCategory =
      readInitialCategory();

    const initialRating =
      readInitialRating();

    setAccessKey(
      storedKey
    );

    setCategory(
      initialCategory
    );

    setRating(
      initialRating
    );

    void loadFeedback(
      storedKey,
      initialCategory,
      initialRating,
      ""
    );
  }, [
    loadFeedback,
  ]);

  const emptyText =
    useMemo(
      () =>
        category !==
          "all" ||
        rating !==
          "all" ||
        appliedSearch
          ? "当前筛选条件下没有反馈。"
          : "暂时没有用户反馈。",
      [
        appliedSearch,
        category,
        rating,
      ]
    );

  function refresh(
    nextCategory =
      category,

    nextRating =
      rating,

    nextSearch =
      appliedSearch
  ) {
    void loadFeedback(
      accessKey,
      nextCategory,
      nextRating,
      nextSearch
    );
  }

  function changeCategory(
    value:
      "all" |
      FeedbackCategory
  ) {
    setCategory(
      value
    );

    refresh(
      value,
      rating,
      appliedSearch
    );
  }

  function changeRating(
    value:
      string
  ) {
    setRating(
      value
    );

    refresh(
      category,
      value,
      appliedSearch
    );
  }

  function submitSearch() {
    const value =
      search.trim();

    setAppliedSearch(
      value
    );

    refresh(
      category,
      rating,
      value
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

    refresh(
      "all",
      "all",
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
              440,

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
                26,
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
                1.6,
            }}
          >
            {error}
          </p>

          <a
            href="/founder"
            style={{
              height:
                48,

              marginTop:
                20,

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

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
          </a>
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
          "22px 17px 60px",

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
            1100,

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
              12,
          }}
        >
          <div>
            <a
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
            </a>

            <h1
              style={{
                margin:
                  "17px 0 0",

                fontSize:
                  29,
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
              查看评分、Bug 和用户建议。
            </p>
          </div>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={() =>
              refresh()
            }
            style={{
              height:
                42,

              padding:
                "0 14px",

              border:
                "1px solid #cbd5e1",

              borderRadius:
                12,

              background:
                "#ffffff",

              color:
                "#2563eb",

              fontWeight:
                900,
            }}
          >
            {loading
              ? "加载中"
              : "刷新"}
          </button>
        </header>

        <section
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",

            gap:
              11,

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
            label="平均"
            value={
              summary
                ?.averageRating ?? 0
            }
          />
        </section>

        <section
          style={{
            marginTop:
              16,

            padding:
              15,

            border:
              "1px solid #dbe3f0",

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

              gap:
                8,

              overflowX:
                "auto",
            }}
          >
            {categories.map(
              (
                item
              ) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    changeCategory(
                      item.value
                    )
                  }
                  style={{
                    flex:
                      "0 0 auto",

                    height:
                      39,

                    padding:
                      "0 12px",

                    border:
                      category ===
                      item.value
                        ? "1px solid #0f172a"
                        : "1px solid #dbe3f0",

                    borderRadius:
                      999,

                    background:
                      category ===
                      item.value
                        ? "#0f172a"
                        : "#ffffff",

                    color:
                      category ===
                      item.value
                        ? "#ffffff"
                        : "#475569",

                    fontWeight:
                      850,
                  }}
                >
                  {item.icon}{" "}
                  {item.label}
                </button>
              )
            )}
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "minmax(0, 1fr) auto",

              gap:
                8,

              marginTop:
                13,
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
              placeholder="搜索内容、用户或页面"
              style={{
                width:
                  "100%",

                height:
                  43,

                padding:
                  "0 12px",

                boxSizing:
                  "border-box",

                border:
                  "1px solid #cbd5e1",

                borderRadius:
                  11,

                font:
                  "inherit",
              }}
            />

            <button
              type="button"
              onClick={
                submitSearch
              }
              style={{
                height:
                  43,

                padding:
                  "0 15px",

                border:
                  0,

                borderRadius:
                  11,

                background:
                  "#2563eb",

                color:
                  "#ffffff",

                fontWeight:
                  900,
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

              marginTop:
                11,
            }}
          >
            <select
              value={
                rating
              }
              onChange={(
                event
              ) =>
                changeRating(
                  event.target.value
                )
              }
              style={{
                height:
                  39,

                padding:
                  "0 11px",

                border:
                  "1px solid #cbd5e1",

                borderRadius:
                  10,

                background:
                  "#ffffff",
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
                14,

              padding:
                13,

              border:
                "1px solid #fecaca",

              borderRadius:
                13,

              background:
                "#fef2f2",

              color:
                "#b91c1c",
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
              12,

            marginTop:
              16,
          }}
        >
          {loading && (
            <EmptyCard>
              正在加载用户反馈…
            </EmptyCard>
          )}

          {!loading &&
            records.length ===
              0 && (
              <EmptyCard>
                {emptyText}
              </EmptyCard>
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
  icon:
    string;

  label:
    string;

  value:
    number |
    string;
}) {
  return (
    <article
      style={{
        padding:
          15,

        border:
          "1px solid #dbe3f0",

        borderRadius:
          17,

        background:
          "#ffffff",
      }}
    >
      <div
        style={{
          display:
            "flex",

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

        <span>
          {icon}
        </span>
      </div>

      <div
        style={{
          marginTop:
            9,

          fontSize:
            28,

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
          16,

        border:
          record.category ===
          "bug"
            ? "1px solid #fecaca"
            : "1px solid #dbe3f0",

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

          justifyContent:
            "space-between",

          gap:
            10,
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
              fontSize:
                23,
            }}
          >
            {categoryIcon(
              record.category
            )}
          </span>

          <div>
            <strong>
              {categoryLabel(
                record.category
              )}
            </strong>

            <div
              style={{
                marginTop:
                  3,

                color:
                  "#f59e0b",

                fontSize:
                  12,
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
            "14px 0 0",

          color:
            record.message
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
            13,
        }}
      >
        <Tag>
          👤{" "}
          {maskUser(
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
      </div>
    </article>
  );
}

function EmptyCard({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      style={{
        padding:
          "38px 18px",

        border:
          "1px dashed #cbd5e1",

        borderRadius:
          18,

        background:
          "#ffffff",

        color:
          "#64748b",

        textAlign:
          "center",
      }}
    >
      {children}
    </div>
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
          "5px 8px",

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
      }}
    >
      {children}
    </span>
  );
}