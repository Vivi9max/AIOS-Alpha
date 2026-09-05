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

type RuntimeStatus =
  | "checking"
  | "online"
  | "degraded"
  | "offline";

interface RuntimeState {
  status:
    RuntimeStatus;

  provider:
    string;
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

  provider:
    "unknown",
};

export default function Header() {
  const {
    t,
  } = useLanguage();

  const pathname =
    usePathname();

  const [
    runtime,
    setRuntime,
  ] =
    useState<RuntimeState>(
      initialStatus
    );

  const pageTitle =
    t(
      pageTitles[pathname] ??
        "page.default"
    );

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
            }
          );

        if (
          !response.ok
        ) {
          throw new Error(
            "Runtime unavailable."
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

          provider:
            typeof data.provider ===
              "string"
              ? data.provider
              : "unknown",
        });
      } catch {
        if (active) {
          setRuntime({
            status:
              "offline",

            provider:
              "unknown",
          });
        }
      }
    }

    void loadRuntimeStatus();

    const interval =
      window.setInterval(
        loadRuntimeStatus,
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

  const statusLabel =
    runtime.status ===
    "checking"
      ? t("runtime.checking")
      : runtime.status ===
          "online"
        ? t("runtime.online")
        : runtime.status ===
            "degraded"
          ? "Degraded"
          : t("runtime.offline");

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
          78,

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
          "14px 20px",

        borderBottom:
          "1px solid #1f2937",
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
            display:
              "flex",

            flexWrap:
              "wrap",

            alignItems:
              "center",

            gap:
              10,
          }}
        >
          <h2
            style={{
              margin:
                0,

              fontSize:
                21,

              fontWeight:
                800,

              lineHeight:
                1.25,
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
                "rgba(59, 130, 246, 0.16)",

              border:
                "1px solid rgba(147, 197, 253, 0.35)",

              color:
                "#bfdbfe",

              fontSize:
                11,

              fontWeight:
                800,

              letterSpacing:
                "0.04em",
            }}
          >
            {APP_BADGE}
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
              7,

            color:
              "#cbd5e1",

            fontSize:
              12,
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

          <span
            style={{
              textTransform:
                "capitalize",
            }}
          >
            {t("runtime.provider")}:
            {" "}
            {runtime.provider}
          </span>

          <span>
            ·
          </span>

          <span>
            {APP_CONFIG.codename}
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
              44,

            height:
              44,

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
              17,

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
