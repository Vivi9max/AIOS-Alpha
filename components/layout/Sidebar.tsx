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

const menus = [
  {
    icon: "💬",
    label: "nav.chat" as MessageKey,
    href: "/workspace",
  },

  {
    icon: "✅",
    label: "nav.tasks" as MessageKey,
    href: "/tasks",
  },

  {
    icon: "💳",
    label: "Plans",
    href: "/billing",
  },

  {
    icon: "⚙️",
    label: "nav.settings" as MessageKey,
    href: "/settings",
  },
];

function isProjectActive(
  pathname: string,
  projectId: string,
): boolean {
  return (
    pathname === `/projects/${projectId}` ||
    pathname.startsWith(
      `/projects/${projectId}/`,
    )
  );
}

export default function Sidebar() {
  const { t } = useLanguage();

  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 250,
        minHeight: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        color: "#111827",
      }}
    >
      <div
        style={{
          padding: "22px 18px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Link
          href="/workspace"
          prefetch={false}
          style={{
            display: "inline-block",
            color: "#111827",
            textDecoration: "none",
            fontSize: 25,
            fontWeight: 800,
          }}
        >
          {APP_NAME}
        </Link>

        <p
          style={{
            margin: "5px 0 0",
            color: "#9ca3af",
            fontSize: 12,
          }}
        >
          {APP_VERSION_LABEL}
        </p>
      </div>

      {projects.length > 0 && (
        <div
          style={{
            padding: "16px 14px 8px",
          }}
        >
          <p
            style={{
              margin: "0 4px 10px",
              color: "#9ca3af",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {t("nav.projects")}
          </p>

          <div
            style={{
              display: "grid",
              gap: 7,
            }}
          >
            {projects.slice(0, 3).map(
              (project) => {
                const active =
                  isProjectActive(
                    pathname,
                    project.id,
                  );

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    prefetch={false}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: active
                        ? "#eef2ff"
                        : "#f8fafc",
                      color: active
                        ? "#3730a3"
                        : "#374151",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <span aria-hidden="true">
                      {project.icon}
                    </span>

                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {project.name}
                    </span>
                  </Link>
                );
              },
            )}
          </div>
        </div>
      )}

      <nav
        style={{
          display: "grid",
          gap: 5,
          padding: "12px 14px",
        }}
      >
        {menus.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(
              `${item.href}/`,
            ) ||
            (
              item.href === "/workspace" &&
              pathname === "/"
            );

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              style={{
                display: "block",
                padding: "11px 12px",
                borderRadius: 10,
                background: active
                  ? "#eef2ff"
                  : "transparent",
                color: active
                  ? "#3730a3"
                  : "#374151",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active
                  ? 800
                  : 600,
              }}
            >
              {item.icon}{" "}
              {typeof item.label === "string" &&
              item.label.includes(".")
                ? t(
                    item.label as MessageKey,
                  )
                : item.label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: 16,
          borderTop: "1px solid #e5e7eb",
          color: "#9ca3af",
          fontSize: 12,
        }}
      >
        {APP_NAME} · {t("runtime.online")}
      </div>
    </aside>
  );
}
