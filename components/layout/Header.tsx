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
  status:
    RuntimeStatus;
}

const pageTitles:
  Record<string, MessageKey> = {
  "/":
    "page.workspace",
  "/workspace":
    "page.workspace",
  "/dashboard":
    "nav.dashboard",
  "/memory":
    "nav.memory",
  "/tasks":
    "nav.tasks",
  "/projects":
    "nav.projects",
  "/settings":
    "nav.settings",
  "/brain":
    "page.runtime",
  "/release":
    "page.release",
};

const initialStatus:
  RuntimeState = {
  status:
    "checking",
  };

const productCopy = {
  en: {
    global:
      "AIOS Global",
    globalDescription:
      "Global AIOS Runtime",
    cn:
      "AIOS CN",
    cnDescription:
      "China AIOS Runtime",
  },
  "zh-CN": {
    global:
      "AIOS Global",
    globalDescription:
      "全球 AIOS Runtime",
    cn:
      "AIOS CN",
    cnDescription:
      "中国 AIOS Runtime",
  },
  ja: {
    global:
      "AIOS Global",
    globalDescription:
      "グローバル AIOS Runtime",
    cn:
      "AIOS CN",
    cnDescription:
      "中国向け AIOS Runtime",
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
    runtimeStatusCopy[locale];

  const pageTitle =
    t(
      pageTitles[pathname] ??
        "page.default",
    );

  const isCN =
    pathname === "/cn" ||
    pathname.startsWith(
      "/cn/",
    );

  const product =
    productCopy[locale];

  useEffect(() => {
    let active =
      true;

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

        const normalizedStatus:
          RuntimeStatus =
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
      active =
        false;

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
      ? copy.checking
      : runtime.status ===
          "online"
        ? copy.online
        : runtime.status ===
            "degraded"
          ? copy.degraded
          : copy.offline;

  const statusIsHealthy =
    runtime.status ===
    "online";

  const statusIsChecking =
    runtime.status ===
    "checking";

  return (
    <header
      style={{
        minHeight:
          72,
        boxSizing:
          "border-box",
        background:
          "#111827",
        color:
          "#ffffff",
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap:
          16,
        padding:
          "12px 20px",
        borderBottom:
          "1px solid #1f2937",
      }}
    >
      <div
        style={{
          minWidth:
            0,
          overflow:
            "hidden",
        }}
      >
        <div
          style={{
            display:
              "flex",
            flexWrap:
              "wrap",
            alignItems:
              "center",
            gap:
              9,
          }}
        >
          <h2
            style={{
              margin:
                0,
              fontSize:
                20,
              fontWeight:
                800,
              lineHeight:
                1.25,
              whiteSpace:
                "nowrap",
                overflow:
                "hidden",
              textOverflow:
                "ellipsis",
            }}
          >
            {pageTitle}
          </h2>

          <span
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              padding:
                "4px 9px",
              borderRadius:
                999,
              background:
                isCN
                  ? "rgba(239, 68, 68, 0.16)"
                  : "rgba(59, 130, 246, 0.16)",
              border:
                isCN
                  ? "1px solid rgba(252, 165, 165, 0.35)"
                  : "1px solid rgba(147, 197, 253, 0.35)",
              color:
                isCN
                  ? "#fecaca"
                  : "#bfdbfe",
              fontSize:
                11,
              fontWeight:
                800,
            }}
          >
            {isCN
              ? product.cn
              : product.global}
          </span>
        </div>

        <div
          style={{
            display:
              "flex",
            flexWrap:
              "wrap",
            alignItems:
              "center",
            gap:
              8,
            marginTop:
              6,
            color:
              "#cbd5e1",
            fontSize:
              11,
          }}
        >
          <span
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap:
                5,
            }}
          >
            <span
              style={{
                width:
                  7,
                height:
                  7,
                borderRadius:
                  "50%",
                background:
                  statusIsChecking
                    ? "#f59e0b"
                    : statusIsHealthy
                      ? "#22c55e"
                      : runtime.status ===
                          "degraded"
                        ? "#f59e0b"
                        : "#ef4444",
              }}
            />

            {statusLabel}
          </span>

          <span>
            ·
          </span>

          <span>
            {isCN
              ? product.cnDescription
              : product.globalDescription}
          </span>

          <span>
            ·
          </span>

          <span>
            {APP_CONFIG.codename}
          </span>

          <span>
            ·
          </span>

          <span>
            {APP_BADGE}
          </span>
        </div>
      </div>

      <div
        style={{
          flexShrink:
            0,
          display:
            "flex",
          alignItems:
            "center",
          gap:
            10,
        }}
      >
        <LanguageSwitcher />

        <div
          title={`${APP_CONFIG.stage} User`}
          style={{
            width:
              42,
            height:
              42,
            borderRadius:
              "50%",
            background:
              "#374151",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            fontWeight:
              800,
            fontSize:
              16,
            border:
              "1px solid #4b5563",
          }}
        >
          V
        </div>
      </div>
    </header>
  );
}
