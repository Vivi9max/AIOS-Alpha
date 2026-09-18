"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";

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
  release?: string;
  environment?: string;

  runtime?: {
    name?: string;
    version?: string;
    release?: string;
  };

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

const STORAGE_KEY = "aios-founder-access-key";

const FALLBACK_VERSION = "0.5.1";
const FALLBACK_RELEASE = "C145.8";

type Locale = "en" | "zh-CN" | "ja";

const copy: Record<
  Locale,
  {
    access: string;
    title: string;
    description: string;
    logout: string;
    refresh: string;
    refreshing: string;
    allFeedback: string;
    allFeedbackDetail: string;
    bugs: string;
    bugsDetail: string;
    negative: string;
    negativeDetail: string;
    positive: string;
    positiveDetail: string;
    users: string;
    usersDetail: string;
    average: string;
    averageDetail: string;
    runtime: string;
    online: string;
    runtimeDetail: string;
    storage: string;
    dashboard: string;
    dashboardValue: string;
    dashboardDetail: string;
    planner: string;
    plannerValue: string;
    plannerDetail: string;
    deploy: string;
    branch: string;
    latestFeedback: string;
    latestFeedbackDescription: string;
    viewAll: string;
    noFeedback: string;
    anonymousUser: string;
    userWorkspace: string;
    userWorkspaceDetail: string;
    taskCenter: string;
    taskCenterDetail: string;
    memoryCenter: string;
    memoryCenterDetail: string;
    feedbackCenter: string;
    feedbackCenterDetail: string;
    enterKey: string;
    loginDescription: string;
    keyPlaceholder: string;
    verifying: string;
    enterConsole: string;
    invalidKey: string;
    loadingFailed: string;
    userNoMessage: string;
    category: Record<FounderFeedback["category"], string>;
    localeDate: string;
    release: string;
    environment: string;
    commit: string;
    branchLabel: string;
    workspace: string;
  }
> = {
  en: {
    access: "PRIVATE FOUNDER ACCESS",
    title: "Founder Console",
    description: "AIOS Alpha runtime, feedback and deployment center",
    logout: "Log out",
    refresh: "Refresh Founder data",
    refreshing: "Refreshing…",
    allFeedback: "All feedback",
    allFeedbackDetail: "View all user feedback",
    bugs: "Bugs",
    bugsDetail: "Needs priority review",
    negative: "Negative feedback",
    negativeDetail: "Ratings 1–2",
    positive: "Positive feedback",
    positiveDetail: "Ratings 4–5",
    users: "Feedback users",
    usersDetail: "Unique anonymous users",
    average: "Average rating",
    averageDetail: "Out of 5",
    runtime: "Runtime",
    online: "Online",
    runtimeDetail: "Open Runtime Status",
    storage: "Storage",
    dashboard: "Dashboard",
    dashboardValue: "Operating Center",
    dashboardDetail: "View current AIOS operating state",
    planner: "Planner",
    plannerValue: "Snapshot",
    plannerDetail: "View current tasks and execution queue",
    deploy: "Deploy",
    branch: "Branch",
    latestFeedback: "Latest user feedback",
    latestFeedbackDescription:
      "New feedback appears here. Only the Founder API can read this data.",
    viewAll: "View all →",
    noFeedback:
      "No global feedback yet. New feedback will appear here after deployment.",
    anonymousUser: "Anonymous user",
    userWorkspace: "User Workspace",
    userWorkspaceDetail: "Open the user workspace",
    taskCenter: "Task Center",
    taskCenterDetail: "View current tasks and completion",
    memoryCenter: "Memory Center",
    memoryCenterDetail: "View current long-term memory",
    feedbackCenter: "Feedback Center",
    feedbackCenterDetail: "Search, filter and analyze user feedback",
    enterKey: "Founder access required",
    loginDescription:
      "This area is restricted to the AIOS Alpha founder.",
    keyPlaceholder: "Enter Founder Access Key",
    verifying: "Verifying…",
    enterConsole: "Enter Founder Console",
    invalidKey: "Please enter the Founder Access Key.",
    loadingFailed: "Founder Console loading failed.",
    userNoMessage: "No written feedback was provided.",
    category: {
      great: "Great",
      good: "Good",
      neutral: "Neutral",
      bad: "Needs improvement",
      bug: "Bug",
    },
    localeDate: "en-US",
    release: "Release",
    environment: "Environment",
    commit: "Commit",
    branchLabel: "Branch",
    workspace: "Workspace",
  },

  "zh-CN": {
    access: "PRIVATE FOUNDER ACCESS",
    title: "Founder Console",
    description: "AIOS Alpha 运行、反馈与部署中心",
    logout: "退出",
    refresh: "刷新 Founder 数据",
    refreshing: "数据刷新中…",
    allFeedback: "全部反馈",
    allFeedbackDetail: "查看全部用户反馈",
    bugs: "Bug",
    bugsDetail: "需要优先检查",
    negative: "负面反馈",
    negativeDetail: "评分 1–2",
    positive: "正面反馈",
    positiveDetail: "评分 4–5",
    users: "反馈用户",
    usersDetail: "独立匿名用户",
    average: "平均评分",
    averageDetail: "满分 5 分",
    runtime: "Runtime",
    online: "Online",
    runtimeDetail: "打开 Runtime Status",
    storage: "Storage",
    dashboard: "Dashboard",
    dashboardValue: "Operating Center",
    dashboardDetail: "查看 AIOS 当前运行状态",
    planner: "Planner",
    plannerValue: "Snapshot",
    plannerDetail: "查看当前任务与执行队列",
    deploy: "Deploy",
    branch: "Branch",
    latestFeedback: "最新用户反馈",
    latestFeedbackDescription:
      "所有新提交反馈会进入这里，仅 Founder API 可读取。",
    viewAll: "查看全部 →",
    noFeedback:
      "暂无全局反馈。部署后新提交的反馈会显示在这里。",
    anonymousUser: "匿名用户",
    userWorkspace: "用户 Workspace",
    userWorkspaceDetail: "进入用户端工作空间",
    taskCenter: "任务中心",
    taskCenterDetail: "查看当前任务与完成情况",
    memoryCenter: "记忆中心",
    memoryCenterDetail: "查看当前用户长期记忆",
    feedbackCenter: "反馈中心",
    feedbackCenterDetail: "搜索、筛选并分析用户反馈",
    enterKey: "请输入 Founder Access Key",
    loginDescription: "仅限 AIOS Alpha Founder 访问。",
    keyPlaceholder: "输入 Founder Access Key",
    verifying: "验证中…",
    enterConsole: "进入 Founder Console",
    invalidKey: "请输入 Founder Access Key。",
    loadingFailed: "Founder Console 加载失败。",
    userNoMessage: "用户未填写文字反馈。",
    category: {
      great: "很满意",
      good: "满意",
      neutral: "一般",
      bad: "不满意",
      bug: "Bug",
    },
    localeDate: "zh-CN",
    release: "Release",
    environment: "环境",
    commit: "Commit",
    branchLabel: "Branch",
    workspace: "Workspace",
  },

  ja: {
    access: "PRIVATE FOUNDER ACCESS",
    title: "Founder Console",
    description:
      "AIOS Alpha の Runtime、フィードバック、デプロイ管理センター",
    logout: "ログアウト",
    refresh: "Founder データを更新",
    refreshing: "更新中…",
    allFeedback: "すべてのフィードバック",
    allFeedbackDetail: "ユーザーフィードバックを表示",
    bugs: "Bug",
    bugsDetail: "優先確認が必要",
    negative: "低評価",
    negativeDetail: "評価 1–2",
    positive: "高評価",
    positiveDetail: "評価 4–5",
    users: "フィードバックユーザー",
    usersDetail: "匿名ユーザー数",
    average: "平均評価",
    averageDetail: "5 点満点",
    runtime: "Runtime",
    online: "Online",
    runtimeDetail: "Runtime Status を開く",
    storage: "Storage",
    dashboard: "Dashboard",
    dashboardValue: "Operating Center",
    dashboardDetail: "現在の AIOS 稼働状態を確認",
    planner: "Planner",
    plannerValue: "Snapshot",
    plannerDetail: "現在のタスクと実行キューを確認",
    deploy: "Deploy",
    branch: "Branch",
    latestFeedback: "最新のユーザーフィードバック",
    latestFeedbackDescription:
      "新しいフィードバックがここに表示されます。Founder API のみが読み取れます。",
    viewAll: "すべて表示 →",
    noFeedback:
      "グローバルフィードバックはまだありません。デプロイ後に新しいフィードバックが表示されます。",
    anonymousUser: "匿名ユーザー",
    userWorkspace: "ユーザーワークスペース",
    userWorkspaceDetail: "ユーザーワークスペースを開く",
    taskCenter: "タスクセンター",
    taskCenterDetail: "現在のタスクと完了状況を確認",
    memoryCenter: "メモリーセンター",
    memoryCenterDetail: "現在の長期メモリーを確認",
    feedbackCenter: "フィードバックセンター",
    feedbackCenterDetail:
      "ユーザーフィードバックを検索、絞り込み、分析",
    enterKey: "Founder Access Key が必要です",
    loginDescription:
      "AIOS Alpha Founder のみアクセスできます。",
    keyPlaceholder: "Founder Access Key を入力",
    verifying: "確認中…",
    enterConsole: "Founder Console に入る",
    invalidKey: "Founder Access Key を入力してください。",
    loadingFailed: "Founder Console を読み込めませんでした。",
    userNoMessage: "文字フィードバックはありません。",
    category: {
      great: "非常に満足",
      good: "満足",
      neutral: "普通",
      bad: "改善が必要",
      bug: "Bug",
    },
    localeDate: "ja-JP",
    release: "Release",
    environment: "環境",
    commit: "Commit",
    branchLabel: "Branch",
    workspace: "Workspace",
  },
};

function getCategoryEmoji(
  category: FounderFeedback["category"],
): string {
  return {
    great: "😍",
    good: "🙂",
    neutral: "😐",
    bad: "☹️",
    bug: "🐛",
  }[category];
}

function maskUserId(userId: string): string {
  if (userId.length <= 18) {
    return userId;
  }

  return `${userId.slice(0, 10)}…${userId.slice(-6)}`;
}

function formatTime(
  value: number,
  locale: Locale,
): string {
  return new Intl.DateTimeFormat(
    copy[locale].localeDate,
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function normalizeError(
  message: string,
  locale: Locale,
): string {
  const value = message.trim();

  if (!value) {
    return copy[locale].loadingFailed;
  }

  if (
    value === "Founder authorization failed." ||
    value === "Founder access is not configured."
  ) {
    return locale === "zh-CN"
      ? "Founder 访问验证失败。"
      : locale === "ja"
        ? "Founder 認証に失敗しました。"
        : "Founder authorization failed.";
  }

  return value;
}

export default function FounderPage() {
  const { locale } = useLanguage();
  const t = copy[locale];

  const [accessKey, setAccessKey] = useState("");
  const [overview, setOverview] =
    useState<FounderOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] =
    useState(false);

  const loadOverview = useCallback(
    async (key: string) => {
      const normalizedKey = key.trim();

      if (!normalizedKey) {
        setError(t.invalidKey);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/founder/overview",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
              Authorization:
                `Bearer ${normalizedKey}`,
            },
          },
        );

        const data =
          (await response.json()) as FounderOverview;

        if (!response.ok || !data.success) {
          throw new Error(
            data.content ||
              data.error ||
              t.loadingFailed,
          );
        }

        window.sessionStorage.setItem(
          STORAGE_KEY,
          normalizedKey,
        );

        setAccessKey(normalizedKey);
        setOverview(data);
        setAuthenticated(true);
      } catch (requestError) {
        window.sessionStorage.removeItem(
          STORAGE_KEY,
        );

        setAuthenticated(false);
        setOverview(null);

        const message =
          requestError instanceof Error
            ? requestError.message
            : t.loadingFailed;

        setError(
          normalizeError(
            message,
            locale,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [locale, t],
  );

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (storedKey) {
      setAccessKey(storedKey);
      void loadOverview(storedKey);
    }
  }, [loadOverview]);

  function logout() {
    window.sessionStorage.removeItem(
      STORAGE_KEY,
    );

    setAccessKey("");
    setOverview(null);
    setAuthenticated(false);
    setError("");
  }

  if (!authenticated) {
    return (
      <FounderLogin
        accessKey={accessKey}
        loading={loading}
        error={error}
        copy={t}
        onChange={setAccessKey}
        onSubmit={() =>
          void loadOverview(accessKey)
        }
      />
    );
  }

  const feedback =
    overview?.feedback?.latest ?? [];

  const version =
    overview?.version ||
    overview?.runtime?.version ||
    FALLBACK_VERSION;

  const release =
    overview?.release ||
    overview?.runtime?.release ||
    FALLBACK_RELEASE;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 18px 60px",
        boxSizing: "border-box",
        background: "#f4f6fb",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                color: "#2563eb",
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: "0.14em",
              }}
            >
              {t.access}
            </div>

            <h1
              style={{
                margin: "7px 0 0",
                fontSize: 31,
                lineHeight: 1.1,
              }}
            >
              {t.title}
            </h1>

            <p
              style={{
                margin: "9px 0 0",
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              {t.description}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={buttonStyle}
          >
            {t.logout}
          </button>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(145px, 1fr))",
            gap: 12,
            marginTop: 24,
          }}
        >
          <MetricLink
            href="/founder/feedback"
            icon="💬"
            label={t.allFeedback}
            value={
              overview?.feedback?.total ?? 0
            }
            detail={t.allFeedbackDetail}
          />

          <MetricLink
            href="/founder/feedback?category=bug"
            icon="🐛"
            label={t.bugs}
            value={
              overview?.feedback?.bugs ?? 0
            }
            detail={t.bugsDetail}
          />

          <MetricLink
            href="/founder/feedback?rating=1"
            icon="⚠️"
            label={t.negative}
            value={
              overview?.feedback?.critical ?? 0
            }
            detail={t.negativeDetail}
          />

          <MetricLink
            href="/founder/feedback?rating=5"
            icon="😍"
            label={t.positive}
            value={
              overview?.feedback?.positive ?? 0
            }
            detail={t.positiveDetail}
          />

          <MetricLink
            href="/founder/feedback"
            icon="👥"
            label={t.users}
            value={
              overview?.feedback?.uniqueUsers ?? 0
            }
            detail={t.usersDetail}
          />

          <MetricLink
            href="/founder/feedback"
            icon="⭐"
            label={t.average}
            value={
              overview?.feedback?.averageRating ?? 0
            }
            detail={t.averageDetail}
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(245px, 1fr))",
            gap: 14,
            marginTop: 18,
          }}
        >
          <SystemLink
            href="/api/runtime/status"
            icon="⚡"
            title={t.runtime}
            value={t.online}
            detail={t.runtimeDetail}
          />

          <SystemLink
            href="/api/storage/status"
            icon="🗃️"
            title={t.storage}
            value={
              overview?.storage?.mode ??
              "unknown"
            }
            detail={
              overview?.storage?.workspaceId ??
              "default"
            }
          />

          <SystemLink
            href="/dashboard"
            icon="📊"
            title={t.dashboard}
            value={t.dashboardValue}
            detail={t.dashboardDetail}
          />

          <SystemLink
            href="/api/planner/snapshot"
            icon="🎯"
            title={t.planner}
            value={t.plannerValue}
            detail={t.plannerDetail}
          />

          <SystemCard
            icon="🚀"
            title={t.deploy}
            value={`v${version}`}
            detail={`${t.release}: ${release} · ${
              overview?.environment ??
              "unknown"
            } · ${overview?.deployment?.commit ?? "local"}`}
          />

          <SystemCard
            icon="🌿"
            title={t.branch}
            value={
              overview?.deployment?.branch ??
              "local"
            }
            detail={
              overview?.deployment?.url ??
              "localhost"
            }
          />
        </section>

        <section
          style={{
            marginTop: 20,
            padding: 20,
            border: "1px solid #dbe3f0",
            borderRadius: 22,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 21,
                }}
              >
                {t.latestFeedback}
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {t.latestFeedbackDescription}
              </p>
            </div>

            <Link
              href="/founder/feedback"
              style={secondaryLinkStyle}
            >
              {t.viewAll}
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 18,
            }}
          >
            {feedback.length === 0 && (
              <Link
                href="/founder/feedback"
                style={{
                  display: "block",
                  padding: "30px 18px",
                  border:
                    "1px dashed #cbd5e1",
                  borderRadius: 16,
                  color: "#64748b",
                  textAlign: "center",
                  lineHeight: 1.6,
                  textDecoration: "none",
                }}
              >
                {t.noFeedback}
              </Link>
            )}

            {feedback
              .slice(0, 5)
              .map((item) => (
                <Link
                  key={item.id}
                  href="/founder/feedback"
                  style={{
                    display: "block",
                    padding: 16,
                    border:
                      item.category === "bug"
                        ? "1px solid #fecaca"
                        : "1px solid #e2e8f0",
                    borderRadius: 16,
                    background: "#f8fafc",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "flex-start",
                      justifyContent:
                        "space-between",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        fontWeight: 900,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 22,
                        }}
                      >
                        {getCategoryEmoji(
                          item.category,
                        )}
                      </span>

                      <span>
                        {t.category[
                          item.category
                        ]}
                      </span>

                      <span
                        style={{
                          color: "#f59e0b",
                          fontSize: 13,
                          letterSpacing: 1,
                        }}
                      >
                        {"★".repeat(
                          Math.max(
                            0,
                            Math.min(
                              5,
                              item.rating,
                            ),
                          ),
                        )}
                      </span>
                    </div>

                    <time
                      style={{
                        color: "#64748b",
                        fontSize: 11,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {formatTime(
                        item.createdAt,
                        locale,
                      )}
                    </time>
                  </div>

                  <p
                    style={{
                      margin: "13px 0 0",
                      color: item.message
                        ? "#1e293b"
                        : "#94a3b8",
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {item.message ||
                      t.userNoMessage}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 7,
                      marginTop: 13,
                    }}
                  >
                    <Tag>
                      👤{" "}
                      {maskUserId(
                        item.userId,
                      )}
                    </Tag>

                    <Tag>
                      📍 {item.page}
                    </Tag>

                    <Tag>
                      🚀 v
                      {item.runtimeVersion}
                    </Tag>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          <ActionLink
            href="/workspace"
            icon="💬"
            title={t.userWorkspace}
            detail={t.userWorkspaceDetail}
          />

          <ActionLink
            href="/tasks"
            icon="✅"
            title={t.taskCenter}
            detail={t.taskCenterDetail}
          />

          <ActionLink
            href="/memory"
            icon="🗃️"
            title={t.memoryCenter}
            detail={t.memoryCenterDetail}
          />

          <ActionLink
            href="/founder/feedback"
            icon="📮"
            title={t.feedbackCenter}
            detail={t.feedbackCenterDetail}
          />
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 22,
          }}
        >
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void loadOverview(
                accessKey,
              )
            }
            style={buttonStyle}
          >
            {loading
              ? t.refreshing
              : t.refresh}
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
  copy: t,
  onChange,
  onSubmit,
}: {
  accessKey: string;
  loading: boolean;
  error: string;
  copy: (typeof copy)[Locale];
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        boxSizing: "border-box",
        background: "#f4f6fb",
        color: "#0f172a",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 28,
          boxSizing: "border-box",
          border: "1px solid #e2e8f0",
          borderRadius: 24,
          background: "#ffffff",
          boxShadow:
            "0 24px 70px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            background: "#0f172a",
            color: "#ffffff",
            fontSize: 26,
          }}
        >
          🔐
        </div>

        <h1
          style={{
            margin: "20px 0 0",
            fontSize: 28,
          }}
        >
          {t.title}
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          {t.loginDescription}
        </p>

        <input
          type="password"
          value={accessKey}
          onChange={(event) =>
            onChange(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSubmit();
            }
          }}
          placeholder={t.keyPlaceholder}
          aria-label={t.keyPlaceholder}
          autoComplete="current-password"
          style={{
            width: "100%",
            height: 50,
            marginTop: 24,
            padding: "0 16px",
            boxSizing: "border-box",
            border: "1px solid #cbd5e1",
            borderRadius: 14,
            background: "#ffffff",
            color: "#0f172a",
            font: "inherit",
            outline: "none",
          }}
        />

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              color: "#b91c1c",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={onSubmit}
          style={{
            width: "100%",
            height: 50,
            marginTop: 16,
            border: 0,
            borderRadius: 14,
            background: loading
              ? "#94a3b8"
              : "#0f172a",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 900,
            cursor: loading
              ? "default"
              : "pointer",
          }}
        >
          {loading
            ? t.verifying
            : t.enterConsole}
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
  value: string | number;
  detail: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 17,
        border: "1px solid #dbe3f0",
        borderRadius: 18,
        background: "#ffffff",
        color: "#0f172a",
        textDecoration: "none",
        boxShadow:
          "0 5px 16px rgba(15, 23, 42, 0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          style={{
            color: "#64748b",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {label}
        </span>

        <span style={{ fontSize: 20 }}>
          {icon}
        </span>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 30,
          fontWeight: 950,
        }}
      >
        {value}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 5,
          color: "#94a3b8",
          fontSize: 12,
        }}
      >
        <span>{detail}</span>
        <span>→</span>
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
      href={href}
      style={{
        display: "block",
        padding: 18,
        borderRadius: 18,
        background: "#0f172a",
        color: "#ffffff",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 22 }}>
          {icon}
        </span>

        <span
          style={{
            color: "#64748b",
            fontSize: 18,
          }}
        >
          →
        </span>
      </div>

      <div
        style={{
          marginTop: 13,
          color: "#94a3b8",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 21,
          fontWeight: 950,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#94a3b8",
          fontSize: 12,
          overflowWrap: "anywhere",
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
        padding: 18,
        borderRadius: 18,
        background: "#0f172a",
        color: "#ffffff",
      }}
    >
      <div style={{ fontSize: 22 }}>
        {icon}
      </div>

      <div
        style={{
          marginTop: 13,
          color: "#94a3b8",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 21,
          fontWeight: 950,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#94a3b8",
          fontSize: 12,
          overflowWrap: "anywhere",
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
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: 16,
        border: "1px solid #dbe3f0",
        borderRadius: 17,
        background: "#ffffff",
        color: "#0f172a",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
          borderRadius: 13,
          background: "#f1f5f9",
          fontSize: 21,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <div style={{ fontWeight: 950 }}>
          {title}
        </div>

        <div
          style={{
            marginTop: 4,
            color: "#64748b",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          {detail}
        </div>
      </div>

      <div
        style={{
          color: "#94a3b8",
          fontSize: 20,
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
  children: ReactNode;
}) {
  return (
    <span
      style={{
        padding: "5px 9px",
        border: "1px solid #dbe3f0",
        borderRadius: 999,
        background: "#ffffff",
        color: "#64748b",
        fontSize: 11,
        fontWeight: 750,
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </span>
  );
}

const buttonStyle = {
  height: 43,
  padding: "0 16px",
  border: "1px solid #cbd5e1",
  borderRadius: 13,
  background: "#ffffff",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
} as const;

const secondaryLinkStyle = {
  minWidth: 88,
  minHeight: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 13px",
  boxSizing: "border-box",
  border: "1px solid #bfdbfe",
  borderRadius: 13,
  background: "#eff6ff",
  color: "#2563eb",
  fontSize: 13,
  fontWeight: 900,
  textDecoration: "none",
} as const;
