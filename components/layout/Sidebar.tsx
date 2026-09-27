"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  APP_NAME,
  APP_VERSION_LABEL,
} from "@/lib/config/app";

import {
  projects,
} from "@/lib/project/store";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import type {
  MessageKey,
} from "@/lib/i18n";

const globalMenus = [
  {
    icon: "💬",
    label:
      "nav.chat" as MessageKey,
    href: "/workspace",
  },
  {
    icon: "🧭",
    label:
      "Market Research",
    href:
      "/market-intelligence",
  },
  {
    icon: "✅",
    label:
      "nav.tasks" as MessageKey,
    href: "/tasks",
  },
  {
    icon: "💳",
    label:
      "Plans",
    href: "/billing",
  },
  {
    icon: "⚙️",
    label:
      "nav.settings" as MessageKey,
    href: "/settings",
  },
];

const cnMenus = [
  {
    icon: "🇨🇳",
    label:
      "AIOS CN",
    href: "/cn",
  },
  {
    icon: "⚙️",
    label:
      "nav.settings" as MessageKey,
    href: "/settings",
  },
];

const marketResearchLabels = {
  en:
    "Market Research",
  "zh-CN":
    "市场研究",
  ja:
    "市場リサーチ",
} as const;

const productCopy = {
  en: {
    products:
      "Products",
    global:
      "AIOS Global",
    globalDescription:
      "Global AIOS workspace",
    cn:
      "AIOS CN",
    cnDescription:
      "China-oriented AIOS workspace",
    current:
      "Current Product",
  },
  "zh-CN": {
    products:
      "产品",
    global:
      "AIOS Global",
    globalDescription:
      "全球 AIOS 工作空间",
    cn:
      "AIOS CN",
    cnDescription:
      "中国 AIOS 工作空间",
    current:
      "当前产品",
  },
  ja: {
    products:
      "製品",
    global:
      "AIOS Global",
    globalDescription:
      "グローバル AIOS ワークスペース",
    cn:
      "AIOS CN",
    cnDescription:
      "中国向け AIOS ワークスペース",
    current:
      "現在の製品",
  },
} as const;

function isProjectActive(
  pathname: string,
  projectId: string,
): boolean {
  return (
    pathname ===
      `/projects/${projectId}` ||
    pathname.startsWith(
      `/projects/${projectId}/`,
    )
  );
}

export default function Sidebar() {
  const {
    t,
    locale,
  } = useLanguage();

  const pathname =
    usePathname();

  const isCN =
    pathname === "/cn" ||
    pathname.startsWith("/cn/");

  const menus =
    isCN
      ? cnMenus
      : globalMenus;

  const copy =
    productCopy[locale];

  return (
    <aside
      style={{
        width:
          250,
        minHeight:
          "100%",
        boxSizing:
          "border-box",
        display:
          "flex",
        flexDirection:
          "column",
        background:
          "#ffffff",
        borderRight:
          "1px solid #e5e7eb",
        color:
          "#111827",
      }}
    >
      <div
        style={{
          padding:
            "22px 18px",
          borderBottom:
            "1px solid #e5e7eb",
        }}
      >
        <Link
          href="/"
          prefetch={false}
          style={{
            display:
              "inline-block",
            color:
              "#111827",
            textDecoration:
              "none",
            fontSize:
              25,
            fontWeight:
              800,
          }}
        >
          {APP_NAME}
        </Link>

        <p
          style={{
            margin:
              "5px 0 0",
            color:
              "#9ca3af",
            fontSize:
              12,
          }}
        >
          {APP_VERSION_LABEL}
        </p>
      </div>

      <div
        style={{
          padding:
            "14px 14px 8px",
        }}
      >
        <p
          style={{
            margin:
              "0 4px 9px",
            color:
              "#9ca3af",
            fontSize:
              11,
            fontWeight:
              800,
            letterSpacing:
              "0.08em",
            textTransform:
              "uppercase",
          }}
        >
          {copy.products}
        </p>

        <div
          style={{
            display:
              "grid",
            gap:
              7,
          }}
        >
          <Link
            href="/workspace"
            prefetch={false}
            style={{
              display:
                "block",
              padding:
                "10px 11px",
              borderRadius:
                10,
              background:
                !isCN
                  ? "#eef2ff"
                  : "#f8fafc",
              color:
                !isCN
                  ? "#3730a3"
                  : "#374151",
              textDecoration:
                "none",
              border:
                !isCN
                  ? "1px solid #c7d2fe"
                  : "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize:
                  13,
                fontWeight:
                  800,
              }}
            >
              {copy.global}
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
              {copy.globalDescription}
            </div>
          </Link>

          <Link
            href="/cn"
            prefetch={false}
            style={{
              display:
                "block",
              padding:
                "10px 11px",
              borderRadius:
                10,
              background:
                isCN
                  ? "#fef2f2"
                  : "#f8fafc",
              color:
                isCN
                  ? "#b91c1c"
                  : "#374151",
              textDecoration:
                "none",
              border:
                isCN
                  ? "1px solid #fecaca"
                  : "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize:
                  13,
                fontWeight:
                  800,
              }}
            >
              {copy.cn}
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
              {copy.cnDescription}
            </div>
          </Link>
        </div>
      </div>

      {!isCN &&
        projects.length > 0 && (
          <div
            style={{
              padding:
                "10px 14px 8px",
            }}
          >
            <p
              style={{
                margin:
                  "0 4px 10px",
                color:
                  "#9ca3af",
                fontSize:
                  11,
                fontWeight:
                  800,
                letterSpacing:
                  "0.08em",
                textTransform:
                  "uppercase",
              }}
            >
              {t(
                "nav.projects",
              )}
            </p>

            <div
              style={{
                display:
                  "grid",
                gap:
                  7,
              }}
            >
              {projects
                .slice(0, 3)
                .map(
                  (
                    project,
                  ) => {
                    const active =
                      isProjectActive(
                        pathname,
                        project.id,
                      );

                    return (
                      <Link
                        key={
                          project.id
                        }
                        href={`/projects/${project.id}`}
                        prefetch={
                          false
                        }
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            8,
                          padding:
                            "10px 12px",
                          borderRadius:
                            10,
                          background:
                            active
                              ? "#eef2ff"
                              : "#f8fafc",
                          color:
                            active
                              ? "#3730a3"
                              : "#374151",
                          textDecoration:
                            "none",
                          fontSize:
                            13,
                          fontWeight:
                            700,
                        }}
                      >
                        <span
                          aria-hidden="true"
                        >
                          {
                            project.icon
                          }
                        </span>

                        <span
                          style={{
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            project.name
                          }
                        </span>
                      </Link>
                    );
                  },
                )}
            </div>
          </div>
        )}

      <div
        style={{
          padding:
            "10px 14px 12px",
        }}
      >
        <p
          style={{
            margin:
              "0 4px 9px",
            color:
              "#9ca3af",
            fontSize:
              11,
            fontWeight:
              800,
            letterSpacing:
              "0.08em",
            textTransform:
              "uppercase",
          }}
        >
          {copy.current}
        </p>

        <nav
          style={{
            display:
              "grid",
            gap:
              5,
          }}
        >
          {menus.map(
            (
              item,
            ) => {
              const active =
                pathname ===
                  item.href ||
                pathname.startsWith(
                  `${item.href}/`,
                ) ||
                (
                  item.href ===
                    "/workspace" &&
                  pathname === "/"
                );

              const label =
                item.href ===
                "/market-intelligence"
                  ? marketResearchLabels[
                      locale
                    ]
                  : typeof item.label ===
                        "string" &&
                    item.label.includes(
                      ".",
                    )
                    ? t(
                        item.label as MessageKey,
                      )
                    : item.label;

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  prefetch={
                    false
                  }
                  style={{
                    display:
                      "block",
                    padding:
                      "11px 12px",
                    borderRadius:
                      10,
                    background:
                      active
                        ? isCN
                          ? "#fef2f2"
                          : "#eef2ff"
                        : "transparent",
                    color:
                      active
                        ? isCN
                          ? "#b91c1c"
                          : "#3730a3"
                        : "#374151",
                    textDecoration:
                      "none",
                    fontSize:
                      14,
                    fontWeight:
                      active
                        ? 800
                        : 600,
                  }}
                >
                  {item.icon}{" "}
                  {label}
                </Link>
              );
            },
          )}
        </nav>
      </div>

      <div
        style={{
          marginTop:
            "auto",
          padding:
            16,
          borderTop:
            "1px solid #e5e7eb",
          color:
            "#9ca3af",
          fontSize:
            12,
        }}
      >
        {isCN
          ? "AIOS CN"
          : "AIOS Global"}{" "}
        ·{" "}
        {t(
          "runtime.online",
        )}
      </div>
    </aside>
  );
}
