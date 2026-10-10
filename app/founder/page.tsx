"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { APP_CONFIG } from "@/lib/config/app";

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

const STORAGE_KEY =
  "aios-founder-access-key";

type Locale =
  | "en"
  | "zh-CN"
  | "ja";

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

    githubIntegration: string;
    githubIntegrationDetail: string;
    githubVerify: string;
    githubVerifyDetail: string;

    mediaExecution: string;
    mediaExecutionDetail: string;
    mediaExecutionDescription: string;

    publicMarketIntelligence: string;
    publicMarketIntelligenceDetail: string;

    autonomousDevelopment: string;
    autonomousDevelopmentDetail: string;
    autonomousDevelopmentDescription: string;

    inboundGrowth: string;
    inboundGrowthDetail: string;

    revenueLedger: string;
    revenueLedgerDetail: string;

    enterKey: string;
    loginDescription: string;
    keyPlaceholder: string;
    verifying: string;
    enterConsole: string;
    invalidKey: string;
    loadingFailed: string;
    userNoMessage: string;

    category: Record<
      FounderFeedback["category"],
      string
    >;

    localeDate: string;
    release: string;
    environment: string;
    commit: string;
    branchLabel: string;
    workspace: string;
  }
> = {
  en: {
    access:
      "PRIVATE FOUNDER ACCESS",
    title:
      "Founder Console",
    description:
      "AIOS Alpha runtime, feedback and deployment center",
    logout:
      "Log out",
    refresh:
      "Refresh Founder data",
    refreshing:
      "Refreshing...",

    allFeedback:
      "All feedback",
    allFeedbackDetail:
      "View all user feedback",

    bugs:
      "Bugs",
    bugsDetail:
      "Needs priority review",

    negative:
      "Negative feedback",
    negativeDetail:
      "Ratings 1-2",

    positive:
      "Positive feedback",
    positiveDetail:
      "Ratings 4-5",

    users:
      "Feedback users",
    usersDetail:
      "Unique anonymous users",

    average:
      "Average rating",
    averageDetail:
      "Out of 5",

    runtime:
      "Runtime",
    online:
      "Online",
    runtimeDetail:
      "Open Runtime Status",

    storage:
      "Storage",

    dashboard:
      "Dashboard",
    dashboardValue:
      "Operating Center",
    dashboardDetail:
      "View current AIOS operating state",

    planner:
      "Planner",
    plannerValue:
      "Snapshot",
    plannerDetail:
      "View current tasks and execution queue",

    deploy:
      "Deploy",
    branch:
      "Branch",

    latestFeedback:
      "Latest user feedback",
    latestFeedbackDescription:
      "New feedback appears here. Only the Founder API can read this data.",
    viewAll:
      "View all ->",
    noFeedback:
      "No global feedback yet. New feedback will appear here after deployment.",
    anonymousUser:
      "Anonymous user",

    userWorkspace:
      "User Workspace",
    userWorkspaceDetail:
      "Open the user workspace",

    taskCenter:
      "Task Center",
    taskCenterDetail:
      "View current tasks and completion",

    memoryCenter:
      "Memory Center",
    memoryCenterDetail:
      "View current long-term memory",

    feedbackCenter:
      "Feedback Center",
    feedbackCenterDetail:
      "Search, filter and analyze user feedback",

    githubIntegration:
      "GitHub Integration",
    githubIntegrationDetail:
      "Founder-only repository integration and engineering access",

    githubVerify:
      "GitHub Bridge Verification",
    githubVerifyDetail:
      "Run the real Founder GitHub read, write, commit and readback test",

    mediaExecution:
      "Real Media Execution",
    mediaExecutionDetail:
      "Run the Founder-only live Veo verification",
    mediaExecutionDescription:
      "Runtime -> Google Veo -> real media operation",

    publicMarketIntelligence:
      "C147.21.1 Public Market Intelligence",
    publicMarketIntelligenceDetail:
      "Open the public Market Intelligence boundary and regression verification",

    autonomousDevelopment:
      "AIOS Autonomous Development",
    autonomousDevelopmentDetail:
      "Founder-only AIOS engineering execution entry",
    autonomousDevelopmentDescription:
      "Planner -> Development Intent -> GitHub -> Commit -> Readback",


    inboundGrowth:
      "AIOS Inbound Growth",
    inboundGrowthDetail:
      "Turn qualified opportunities into outreach, orders and revenue",

    revenueLedger:
      "Founder Revenue Ledger",
    revenueLedgerDetail:
      "Track offers, orders, delivery and evidence-backed payment records",

    enterKey:
      "Founder access required",
    loginDescription:
      "This area is restricted to the AIOS Alpha founder.",
    keyPlaceholder:
      "Enter Founder Access Key",
    verifying:
      "Verifying...",
    enterConsole:
      "Enter Founder Console",
    invalidKey:
      "Please enter the Founder Access Key.",
    loadingFailed:
      "Founder Console loading failed.",
    userNoMessage:
      "No written feedback was provided.",

    category: {
      great:
        "Great",
      good:
        "Good",
      neutral:
        "Neutral",
      bad:
        "Needs improvement",
      bug:
        "Bug",
    },

    localeDate:
      "en-US",
    release:
      "Release",
    environment:
      "Environment",
    commit:
      "Commit",
    branchLabel:
      "Branch",
    workspace:
      "Workspace",
  },

  "zh-CN": {
    access:
      "PRIVATE FOUNDER ACCESS",
    title:
      "Founder Console",
    description:
      "AIOS Alpha 运行、反馈与部署中心",
    logout:
      "退出",
    refresh:
      "刷新 Founder 数据",
    refreshing:
      "数据刷新中...",

    allFeedback:
      "全部反馈",
    allFeedbackDetail:
      "查看全部用户反馈",

    bugs:
      "Bug",
    bugsDetail:
      "需要优先检查",

    negative:
      "负面反馈",
    negativeDetail:
      "评分 1-2",

    positive:
      "正面反馈",
    positiveDetail:
      "评分 4-5",

    users:
      "反馈用户",
    usersDetail:
      "独立匿名用户",

    average:
      "平均评分",
    averageDetail:
      "满分 5 分",

    runtime:
      "Runtime",
    online:
      "Online",
    runtimeDetail:
      "打开 Runtime Status",

    storage:
      "Storage",

    dashboard:
      "Dashboard",
    dashboardValue:
      "Operating Center",
    dashboardDetail:
      "查看 AIOS 当前运行状态",

    planner:
      "Planner",
    plannerValue:
      "Snapshot",
    plannerDetail:
      "查看当前任务与执行队列",

    deploy:
      "Deploy",
    branch:
      "Branch",

    latestFeedback:
      "最新用户反馈",
    latestFeedbackDescription:
      "所有新提交反馈会进入这里，仅 Founder API 可读取。",
    viewAll:
      "查看全部 ->",
    noFeedback:
      "暂无全局反馈。部署后新提交的反馈会显示在这里。",
    anonymousUser:
      "匿名用户",

    userWorkspace:
      "用户 Workspace",
    userWorkspaceDetail:
      "进入用户端工作空间",

    taskCenter:
      "任务中心",
    taskCenterDetail:
      "查看当前任务与完成情况",

    memoryCenter:
      "记忆中心",
    memoryCenterDetail:
      "查看当前用户长期记忆",

    feedbackCenter:
      "反馈中心",
    feedbackCenterDetail:
      "搜索、筛选并分析用户反馈",

    githubIntegration:
      "GitHub 工程集成",
    githubIntegrationDetail:
      "Founder 专用仓库连接与工程访问",

    githubVerify:
      "GitHub Bridge 验证",
    githubVerifyDetail:
      "执行真实 Founder GitHub 读取、写入、提交与回读验证",

    mediaExecution:
      "真实媒体执行",
    mediaExecutionDetail:
      "运行 Founder 专用 Veo 实时验证",
    mediaExecutionDescription:
      "Runtime -> Google Veo -> 真实媒体 Operation",

    publicMarketIntelligence:
      "C147.21.1 Public Market Intelligence",
    publicMarketIntelligenceDetail:
      "打开 Public Market Intelligence 公共边界并执行 Regression 验证",

    autonomousDevelopment:
      "AIOS Autonomous Development",
    autonomousDevelopmentDetail:
      "Founder 专用 AIOS 自主工程执行入口",
    autonomousDevelopmentDescription:
      "Planner -> Development Intent -> GitHub -> Commit -> Readback",

    inboundGrowth:
      "AIOS Inbound Growth",
    inboundGrowthDetail:
      "将有效商机转化为客户触达、订单与收入",

    revenueLedger:
      "收入与订单账本",
    revenueLedgerDetail:
      "管理报价、订单、交付与有证据的收款记录",

    enterKey:
      "请输入 Founder Access Key",
    loginDescription:
      "仅限 AIOS Alpha Founder 访问。",
    keyPlaceholder:
      "输入 Founder Access Key",
    verifying:
      "验证中...",
    enterConsole:
      "进入 Founder Console",
    invalidKey:
      "请输入 Founder Access Key。",
    loadingFailed:
      "Founder Console 加载失败。",
    userNoMessage:
      "用户未填写文字反馈。",

    category: {
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
    },

    localeDate:
      "zh-CN",
    release:
      "Release",
    environment:
      "环境",
    commit:
      "Commit",
    branchLabel:
      "Branch",
    workspace:
      "Workspace",
  },

  ja: {
    access:
      "PRIVATE FOUNDER ACCESS",
    title:
      "Founder Console",
    description:
      "AIOS Alpha の Runtime、フィードバック、デプロイ管理センター",
    logout:
      "ログアウト",
    refresh:
      "Founder データを更新",
    refreshing:
      "更新中...",

    allFeedback:
      "すべてのフィードバック",
    allFeedbackDetail:
      "ユーザーフィードバックを表示",

    bugs:
      "Bug",
    bugsDetail:
      "優先確認が必要",

    negative:
      "低評価",
    negativeDetail:
      "評価 1-2",

    positive:
      "高評価",
    positiveDetail:
      "評価 4-5",

    users:
      "フィードバックユーザー",
    usersDetail:
      "匿名ユーザー数",

    average:
      "平均評価",
    averageDetail:
      "5 点満点",

    runtime:
      "Runtime",
    online:
      "Online",
    runtimeDetail:
      "Runtime Status を開く",

    storage:
      "Storage",

    dashboard:
      "Dashboard",
    dashboardValue:
      "Operating Center",
    dashboardDetail:
      "現在の AIOS 稼働状態を確認",

    planner:
      "Planner",
    plannerValue:
      "Snapshot",
    plannerDetail:
      "現在のタスクと実行キューを確認",

    deploy:
      "Deploy",
    branch:
      "Branch",

    latestFeedback:
      "最新のユーザーフィードバック",
    latestFeedbackDescription:
      "新しいフィードバックがここに表示されます。Founder API のみが読み取れます。",
    viewAll:
      "すべて表示 ->",
    noFeedback:
      "グローバルフィードバックはまだありません。",
    anonymousUser:
      "匿名ユーザー",

    userWorkspace:
      "ユーザーワークスペース",
    userWorkspaceDetail:
      "ユーザーワークスペースを開く",

    taskCenter:
      "タスクセンター",
    taskCenterDetail:
      "現在のタスクと完了状況を確認",

    memoryCenter:
      "メモリーセンター",
    memoryCenterDetail:
      "現在の長期メモリーを確認",

    feedbackCenter:
      "フィードバックセンター",
    feedbackCenterDetail:
      "ユーザーフィードバックを検索、絞り込み、分析",

    githubIntegration:
      "GitHub エンジニアリング連携",
    githubIntegrationDetail:
      "Founder 専用リポジトリ接続とエンジニアリングアクセス",

    githubVerify:
      "GitHub Bridge 検証",
    githubVerifyDetail:
      "Founder GitHub の read、write、commit、readback を実行",

    mediaExecution:
      "リアルメディア実行",
    mediaExecutionDetail:
      "Founder 専用の Veo ライブ検証を実行",
    mediaExecutionDescription:
      "Runtime -> Google Veo -> 実際の Media Operation",

    publicMarketIntelligence:
      "C147.21.1 Public Market Intelligence",
    publicMarketIntelligenceDetail:
      "Public Market Intelligence の公開境界と Regression を確認",

    autonomousDevelopment:
      "AIOS Autonomous Development",
    autonomousDevelopmentDetail:
      "Founder 専用 AIOS 自律開発実行エントリー",
    autonomousDevelopmentDescription:
      "Planner -> Development Intent -> GitHub -> Commit -> Readback",

    inboundGrowth:
      "AIOS Inbound Growth",
    inboundGrowthDetail:
      "有望顧客をアプローチ、受注、収益につなげる",

    revenueLedger:
      "Founder 収益台帳",
    revenueLedgerDetail:
      "見積、受注、納品、証拠付き入金記録を管理",

    enterKey:
      "Founder Access Key が必要です",
    loginDescription:
      "AIOS Alpha Founder のみアクセスできます。",
    keyPlaceholder:
      "Founder Access Key を入力",
    verifying:
      "確認中...",
    enterConsole:
      "Founder Console に入る",
    invalidKey:
      "Founder Access Key を入力してください。",
    loadingFailed:
      "Founder Console を読み込めませんでした。",
    userNoMessage:
      "文字フィードバックはありません。",

    category: {
      great:
        "非常に満足",
      good:
        "満足",
      neutral:
        "普通",
      bad:
        "改善が必要",
      bug:
        "Bug",
    },

    localeDate:
      "ja-JP",
    release:
      "Release",
    environment:
      "環境",
    commit:
      "Commit",
    branchLabel:
      "Branch",
    workspace:
      "Workspace",
  },
};

function normalizeError(
  message: string,
  locale: Locale,
): string {
  const value =
    message.trim();

  if (!value) {
    return copy[
      locale
    ].loadingFailed;
  }

  if (
    value ===
      "Founder authorization failed." ||
    value ===
      "Founder access is not configured."
  ) {
    if (
      locale ===
      "zh-CN"
    ) {
      return "Founder 访问验证失败。";
    }

    if (
      locale ===
      "ja"
    ) {
      return "Founder 認証に失敗しました。";
    }

    return "Founder authorization failed.";
  }

  return value;
}

export default function FounderPage() {
  const {
    locale,
  } = useLanguage();

  const t =
    copy[locale];

  const [
    accessKey,
    setAccessKey,
  ] = useState("");

  const [
    overview,
    setOverview,
  ] =
    useState<FounderOverview | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const loadOverview =
    useCallback(
      async (
        key: string,
      ) => {
        const normalizedKey =
          key.trim();

        if (!normalizedKey) {
          setError(
            t.invalidKey,
          );
          return;
        }

        setLoading(true);
        setError("");

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
                    "Bearer " +
                    normalizedKey,
                },
              },
            );

          const data =
            (await response.json()) as FounderOverview;

          if (
            !response.ok ||
            !data.success
          ) {
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

          setAccessKey(
            normalizedKey,
          );

          setOverview(
            data,
          );

          setAuthenticated(
            true,
          );
        } catch (
          requestError
        ) {
          window.sessionStorage.removeItem(
            STORAGE_KEY,
          );

          setAuthenticated(
            false,
          );

          setOverview(
            null,
          );

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
          setLoading(
            false,
          );
        }
      },
      [
        locale,
        t,
      ],
    );

  useEffect(
    () => {
      const storedKey =
        window.sessionStorage.getItem(
          STORAGE_KEY,
        );

      if (storedKey) {
        setAccessKey(
          storedKey,
        );

        void loadOverview(
          storedKey,
        );
      }
    },
    [loadOverview],
  );

  function logout() {
    window.sessionStorage.removeItem(
      STORAGE_KEY,
    );

    setAccessKey(
      "",
    );

    setOverview(
      null,
    );

    setAuthenticated(
      false,
    );

    setError(
      "",
    );
  }

  if (!authenticated) {
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
        copy={t}
        onChange={
          setAccessKey
        }
        onSubmit={() =>
          void loadOverview(
            accessKey,
          )
        }
      />
    );
  }

  const version =
    overview?.version ||
    overview?.runtime?.version ||
    APP_CONFIG.version;

  const release =
    overview?.release ||
    overview?.runtime?.release ||
    APP_CONFIG.release;

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
              {t.access}
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
              {t.title}
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
              {t.description}
            </p>
          </div>

          <button
            type="button"
            onClick={
              logout
            }
            style={
              buttonStyle
            }
          >
            {t.logout}
          </button>
        </header>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap:
              12,
            marginTop:
              18,
          }}
        >
          <SystemCard
            icon="⚡"
            title={
              t.runtime
            }
            value={
              t.online
            }
            detail={
              t.runtimeDetail
            }
          />

          <SystemCard
            icon="🧠"
            title={
              t.dashboard
            }
            value={
              t.dashboardValue
            }
            detail={
              t.dashboardDetail
            }
          />

          <SystemCard
            icon="📋"
            title={
              t.planner
            }
            value={
              t.plannerValue
            }
            detail={
              t.plannerDetail
            }
          />

          <SystemCard
            icon="💾"
            title={
              t.storage
            }
            value={
              overview?.storage
                ?.mode ??
              "Runtime"
            }
            detail={
              overview?.storage
                ?.workspaceId ??
              "AIOS"
            }
          />
        </section>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap:
              12,
            marginTop:
              18,
          }}
        >
          <SystemCard
            icon="🚀"
            title={
              t.deploy
            }
            value={
              release
            }
            detail={
              overview?.deployment
                ?.url ??
              APP_CONFIG.release
            }
          />

          <SystemCard
            icon="🌿"
            title={
              t.branch
            }
            value={
              overview?.deployment
                ?.branch ??
              "main"
            }
            detail={
              overview?.deployment
                ?.commit ??
              "unknown"
            }
          />

          <SystemCard
            icon="📦"
            title={
              t.environment
            }
            value={
              overview?.environment ??
              "production"
            }
            detail={
              t.release +
              " " +
              release
            }
          />

          <SystemCard
            icon="🧩"
            title={
              t.workspace
            }
            value={
              overview?.storage
                ?.workspaceId ??
              "AIOS"
            }
            detail={
              "Runtime " +
              version
            }
          />
        </section>

        <section
          style={{
            marginTop:
              18,
            padding:
              20,
            borderRadius:
              22,
            background:
              "#0f172a",
            color:
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
              <div
                style={{
                  color:
                    "#93c5fd",
                  fontSize:
                    12,
                  fontWeight:
                    950,
                  letterSpacing:
                    "0.12em",
                  textTransform:
                    "uppercase",
                }}
              >
                Founder Runtime
              </div>

              <h2
                style={{
                  margin:
                    "8px 0 0",
                  fontSize:
                    21,
                }}
              >
                {
                  t.mediaExecution
                }
              </h2>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "#cbd5e1",
                  fontSize:
                    13,
                  lineHeight:
                    1.6,
                }}
              >
                {
                  t.mediaExecutionDescription
                }
              </p>
            </div>

            <div
              style={{
                flex:
                  "0 0 auto",
                width:
                  48,
                height:
                  48,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                borderRadius:
                  15,
                background:
                  "#1e293b",
                fontSize:
                  24,
              }}
            >
              🎬
            </div>
          </div>

          <p
            style={{
              margin:
                "16px 0 0",
              color:
                "#94a3b8",
              fontSize:
                13,
              lineHeight:
                1.6,
            }}
          >
            {
              t.mediaExecutionDetail
            }
          </p>

          <Link
            href="/founder/media-chat-regression"
            style={
              darkActionStyle
            }
          >
            <span>
              {">"} Open Real Media Execution
            </span>

            <span>
              {"->"}
            </span>
          </Link>
        </section>

        <section
          style={{
            marginTop:
              18,
            padding:
              20,
            borderRadius:
              22,
            background:
              "#111827",
            color:
              "#ffffff",
            border:
              "1px solid #334155",
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
            <div
              style={{
                minWidth:
                  0,
              }}
            >
              <div
                style={{
                  color:
                    "#a7f3d0",
                  fontSize:
                    12,
                  fontWeight:
                    950,
                  letterSpacing:
                    "0.12em",
                }}
              >
                C167.12
              </div>

              <h2
                style={{
                  margin:
                    "8px 0 0",
                  fontSize:
                    21,
                }}
              >
                {
                  t.autonomousDevelopment
                }
              </h2>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "#cbd5e1",
                  fontSize:
                    13,
                  lineHeight:
                    1.6,
                }}
              >
                {
                  t.autonomousDevelopmentDescription
                }
              </p>
            </div>

            <div
              style={{
                flex:
                  "0 0 auto",
                width:
                  48,
                height:
                  48,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                borderRadius:
                  15,
                background:
                  "#1f2937",
                fontSize:
                  24,
              }}
            >
              🤖
            </div>
          </div>

          <p
            style={{
              margin:
                "16px 0 0",
              color:
                "#94a3b8",
              fontSize:
                13,
              lineHeight:
                1.6,
            }}
          >
            {
              t.autonomousDevelopmentDetail
            }
          </p>

          <Link
            href="/founder/autonomous-development"
            style={
              darkActionStyle
            }
          >
            <span>
              {">"} Open AIOS Autonomous Development
            </span>

            <span>
              {"->"}
            </span>
          </Link>
        </section>

        <section
          style={{
            marginTop:
              18,
            padding:
              20,
            borderRadius:
              22,
            background:
              "#0b1220",
            color:
              "#ffffff",
            border:
              "1px solid #1e3a5f",
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
            <div
              style={{
                minWidth:
                  0,
              }}
            >
              <div
                style={{
                  color:
                    "#60a5fa",
                  fontSize:
                    12,
                  fontWeight:
                    950,
                  letterSpacing:
                    "0.12em",
                }}
              >
                C147.21.1
              </div>

              <h2
                style={{
                  margin:
                    "8px 0 0",
                  fontSize:
                    21,
                }}
              >
                {
                  t.publicMarketIntelligence
                }
              </h2>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "#cbd5e1",
                  fontSize:
                    13,
                  lineHeight:
                    1.6,
                }}
              >
                {
                  t.publicMarketIntelligenceDetail
                }
              </p>
            </div>

            <div
              style={{
                flex:
                  "0 0 auto",
                width:
                  48,
                height:
                  48,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                borderRadius:
                  15,
                background:
                  "#172554",
                fontSize:
                  24,
              }}
            >
              📈
            </div>
          </div>

          <Link
            href="/founder/market/public-intelligence-regression"
            style={
              darkActionStyle
            }
          >
            <span>
              {">"} Open Public Market Intelligence
            </span>

            <span>
              {"->"}
            </span>
          </Link>
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
            title={
              t.userWorkspace
            }
            detail={
              t.userWorkspaceDetail
            }
          />

          <ActionLink
            href="/tasks"
            icon="✅"
            title={
              t.taskCenter
            }
            detail={
              t.taskCenterDetail
            }
          />

          <ActionLink
            href="/memory"
            icon="🗃️"
            title={
              t.memoryCenter
            }
            detail={
              t.memoryCenterDetail
            }
          />

          <ActionLink
            href="/founder/integrations/github"
            icon="🔗"
            title={
              t.githubIntegration
            }
            detail={
              t.githubIntegrationDetail
            }
          />

          <ActionLink
            href="/founder/github-verify"
            icon="🧪"
            title={
              t.githubVerify
            }
            detail={
              t.githubVerifyDetail
            }
          />

          <ActionLink
            href="/founder/market/public-intelligence-regression"
            icon="📈"
            title={
              t.publicMarketIntelligence
            }
            detail={
              t.publicMarketIntelligenceDetail
            }
          />

          <ActionLink
            href="/founder/autonomous-development"
            icon="🤖"
            title={
              t.autonomousDevelopment
            }
            detail={
              t.autonomousDevelopmentDetail
            }
          />

          <ActionLink
            href="/founder/inbound-growth"
            icon="🎯"
            title={
              t.inboundGrowth
            }
            detail={
              t.inboundGrowthDetail
            }
          />

          <ActionLink
            href="/founder/revenue"
            icon="💰"
            title={
              t.revenueLedger
            }
            detail={
              t.revenueLedgerDetail
            }
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
                accessKey,
              )
            }
            style={
              buttonStyle
            }
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
  onChange: (
    value: string,
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
          {t.title}
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
          {
            t.loginDescription
          }
        </p>

        <input
          type="password"
          value={
            accessKey
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          onKeyDown={(
            event,
          ) => {
            if (
              event.key ===
              "Enter"
            ) {
              onSubmit();
            }
          }}
          placeholder={
            t.keyPlaceholder
          }
          aria-label={
            t.keyPlaceholder
          }
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
            role="alert"
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
            ? t.verifying
            : t.enterConsole}
        </button>
      </section>
    </main>
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
      href={href}
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
        {"->"}
      </div>
    </Link>
  );
}

const buttonStyle = {
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
} as const;

const darkActionStyle = {
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "space-between",
  gap:
    12,
  minHeight:
    52,
  marginTop:
    18,
  padding:
    "0 17px",
  boxSizing:
    "border-box",
  borderRadius:
    15,
  background:
    "#ffffff",
  color:
    "#0f172a",
  textDecoration:
    "none",
  fontWeight:
    950,
} as const;
