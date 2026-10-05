"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  APP_BADGE,
  APP_CONFIG,
} from "@/lib/config/app";

import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import type {
  MessageKey,
} from "@/lib/i18n";

import {
  runtimeStatusCopy,
} from "@/lib/i18n/runtime-status";

type RuntimeStatus =
  | "checking"
  | "online"
  | "degraded"
  | "offline";

interface RuntimeState {
  status: RuntimeStatus;
}

const pageTitles: Record<
  string,
  MessageKey
> = {
  "/dashboard": "nav.dashboard",
  "/memory": "nav.memory",
  "/tasks": "nav.tasks",
  "/projects": "nav.projects",
  "/settings": "nav.settings",
  "/brain": "page.runtime",
  "/runtime": "page.runtime",
  "/planner": "planner.title",
  "/execution": "page.runtime",
  "/release": "page.release",
};

const localPageTitles = {
  en: {
    global: "AIOS Global",
    cn: "AIOS CN",
    workspace: "Workspace",
    market: "Market Research",
  },
  "zh-CN": {
    global: "AIOS Global",
    cn: "AIOS CN",
    workspace: "工作区",
    market: "市场研究",
  },
  ja: {
    global: "AIOS Global",
    cn: "AIOS CN",
    workspace: "ワークスペース",
    market: "市場リサーチ",
  },
} as const;

const initialStatus: RuntimeState = {
  status: "checking",
};

const productCopy = {
  en: {
    global: "AIOS Global",
    globalDescription: "Global AIOS",
    cn: "AIOS CN",
    cnDescription: "China AIOS",
    online: "Online",
    degraded: "Degraded",
    offline: "Offline",
    checking: "Checking",
  },
  "zh-CN": {
    global: "AIOS Global",
    globalDescription: "全球 AIOS",
    cn: "AIOS CN",
    cnDescription: "中国 AIOS",
    online: "运行正常",
    degraded: "服务降级",
    offline: "离线",
    checking: "检查中",
  },
  ja: {
    global: "AIOS Global",
    globalDescription: "グローバル AIOS",
    cn: "AIOS CN",
    cnDescription: "中国向け AIOS",
    online: "稼働中",
    degraded: "一部制限",
    offline: "オフライン",
    checking: "確認中",
  },
} as const;

export default function Header() {
  const {
    locale,
    t,
  } = useLanguage();

  const pathname =
    usePathname();

  const [
    runtime,
    setRuntime,
  ] = useState<RuntimeState>(
    initialStatus,
  );

  const copy =
    runtimeStatusCopy[
      locale
    ];

  const product =
    productCopy[
      locale
    ];

  const localTitles =
    localPageTitles[
      locale
    ];

  const isCN =
    pathname === "/cn" ||
    pathname.startsWith(
      "/cn/",
    );

  const isWorkspace =
    pathname === "/" ||
    pathname === "/workspace";

  const pageTitle =
    isWorkspace
      ? localTitles.workspace
      : isCN
        ? localTitles.cn
        : pathname ===
              "/market-intelligence"
          ? localTitles.market
          : t(
              pageTitles[
                pathname
              ] ??
                "page.default",
            );

  useEffect(() => {
    let active = true;

    async function loadRuntimeStatus() {
      try {
        const response =
          await fetch(
            "/api/runtime/status",
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            },
          );

        if (
          !response.ok
        ) {
          throw new Error(
            copy.unavailable,
          );
        }

        const data =
          await response.json();

        if (!active) {
          return;
        }

        const status =
          data.status;

        const normalizedStatus: RuntimeStatus =
          status ===
          "online"
            ? "online"
            : status ===
                "degraded"
              ? "degraded"
              : "offline";

        setRuntime({
          status:
            normalizedStatus,
        });
      } catch {
        if (active) {
          setRuntime({
            status:
              "offline",
          });
        }
      }
    }

    void loadRuntimeStatus();

    const interval =
      window.setInterval(
        loadRuntimeStatus,
        30000,
      );

    return () => {
      active = false;
      window.clearInterval(
        interval,
      );
    };
  }, [
    copy.unavailable,
  ]);

  const statusLabel =
    runtime.status ===
    "checking"
      ? product.checking
      : runtime.status ===
          "online"
        ? product.online
        : runtime.status ===
            "degraded"
          ? product.degraded
          : product.offline;

  const statusTone =
    runtime.status ===
    "online"
      ? "online"
      : runtime.status ===
          "degraded"
        ? "degraded"
        : runtime.status ===
            "checking"
          ? "checking"
          : "offline";

  return (
    <header
      className={
        isCN
          ? "aios-product-header is-cn"
          : "aios-product-header is-global"
      }
    >
      <div className="aios-header-main">
        <div className="aios-header-title-row">
          <div className="aios-header-product-mark">
            <span
              className="aios-header-product-dot"
              aria-hidden="true"
            />

            <span>
              {isCN
                ? product.cn
                : product.global}
            </span>
          </div>

          <span
            className="aios-header-divider"
            aria-hidden="true"
          >
            /
          </span>

          <h1 className="aios-header-page-title">
            {pageTitle}
          </h1>
        </div>

        <div className="aios-header-meta">
          <span
            className={
              "aios-runtime-pill " +
              statusTone
            }
          >
            <span
              className="aios-runtime-dot"
              aria-hidden="true"
            />

            {statusLabel}
          </span>

          <span className="aios-header-meta-text">
            {isCN
              ? product.cnDescription
              : product.globalDescription}
          </span>

          <span
            className="aios-header-meta-separator"
            aria-hidden="true"
          >
            ·
          </span>

          <span className="aios-header-meta-text">
            {
              APP_CONFIG.codename
            }
          </span>

          <span
            className="aios-header-meta-separator"
            aria-hidden="true"
          >
            ·
          </span>

          <span className="aios-header-meta-text">
            {APP_BADGE}
          </span>
        </div>
      </div>

      <div className="aios-header-actions">
        <LanguageSwitcher />

        <div
          className="aios-user-avatar"
          title={
            APP_CONFIG.stage +
            " User"
          }
          aria-label={
            APP_CONFIG.stage +
            " User"
          }
        >
          V
        </div>
      </div>
    </header>
  );
}
