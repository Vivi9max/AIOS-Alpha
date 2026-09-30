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
    icon: "◉",
    label:
      "nav.chat" as MessageKey,
    href: "/workspace",
  },
  {
    icon: "⌁",
    label: "Market Research",
    href: "/market-intelligence",
  },
  {
    icon: "✓",
    label:
      "nav.tasks" as MessageKey,
    href: "/tasks",
  },
  {
    icon: "◇",
    label:
      "planner.title" as MessageKey,
    href: "/planner",
  },
  {
    icon: "→",
    label:
      "execution.openOutcomes" as MessageKey,
    href: "/execution",
  },
  {
    icon: "⚙",
    label:
      "nav.settings" as MessageKey,
    href: "/settings",
  },
];

const cnMenus = [
  {
    icon: "◉",
    label: "AIOS CN",
    href: "/cn",
  },
];

const marketResearchLabels = {
  en: "Market Research",
  "zh-CN": "市场研究",
  ja: "市場リサーチ",
} as const;

const productCopy = {
  en: {
    products: "Products",
    global: "AIOS Global",
    globalDescription:
      "Global AIOS workspace",
    cn: "AIOS CN",
    cnDescription:
      "China AIOS workspace",
    workspace: "Workspace",
    projects: "Projects",
    online: "Runtime online",
  },
  "zh-CN": {
    products: "产品",
    global: "AIOS Global",
    globalDescription:
      "全球 AIOS 工作空间",
    cn: "AIOS CN",
    cnDescription:
      "中国 AIOS 工作空间",
    workspace: "工作区",
    projects: "项目",
    online: "Runtime 运行正常",
  },
  ja: {
    products: "製品",
    global: "AIOS Global",
    globalDescription:
      "グローバル AIOS ワークスペース",
    cn: "AIOS CN",
    cnDescription:
      "中国向け AIOS ワークスペース",
    workspace: "ワークスペース",
    projects: "プロジェクト",
    online: "Runtime 稼働中",
  },
} as const;

function isProjectActive(
  pathname: string,
  projectId: string,
): boolean {
  return (
    pathname ===
      "/projects/" +
        projectId ||
    pathname.startsWith(
      "/projects/" +
        projectId +
        "/",
    )
  );
}

export default function Sidebar() {
  const {
    t,
    locale,
  } = useLanguage();

  const pathname = usePathname();

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
      className={
        isCN
          ? "aios-sidebar is-cn"
          : "aios-sidebar is-global"
      }
    >
      <div className="aios-sidebar-brand">
        <Link
          href="/"
          prefetch={false}
          className="aios-brand-link"
        >
          <span className="aios-brand-symbol">
            A
          </span>

          <span className="aios-brand-copy">
            <strong>
              {APP_NAME}
            </strong>

            <span>
              {APP_VERSION_LABEL}
            </span>
          </span>
        </Link>
      </div>

      <div className="aios-sidebar-products">
        <div className="aios-sidebar-section-label">
          {copy.products}
        </div>

        <ProductLink
          href="/workspace"
          active={!isCN}
          title={copy.global}
          description={
            copy.globalDescription
          }
        />

        <ProductLink
          href="/cn"
          active={isCN}
          title={copy.cn}
          description={
            copy.cnDescription
          }
          cn
        />
      </div>

      {!isCN &&
        projects.length > 0 && (
          <div className="aios-sidebar-projects">
            <div className="aios-sidebar-section-heading">
              <span>
                {copy.projects}
              </span>

              <Link
                href="/projects"
                prefetch={false}
              >
                {t(
                  "nav.allProjects",
                )}
              </Link>
            </div>

            <div className="aios-sidebar-project-list">
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
                        href={
                          "/projects/" +
                          project.id
                        }
                        prefetch={
                          false
                        }
                        className={
                          active
                            ? "aios-project-link active"
                            : "aios-project-link"
                        }
                      >
                        <span>
                          {
                            project.icon
                          }
                        </span>

                        <span>
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

      <div className="aios-sidebar-navigation">
        <div className="aios-sidebar-section-label">
          {copy.workspace}
        </div>

        <nav
          className="aios-sidebar-nav"
          aria-label={
            isCN
              ? "AIOS CN navigation"
              : "AIOS Global navigation"
          }
        >
          {menus.map(
            (item) => {
              const active =
                pathname ===
                  item.href ||
                pathname.startsWith(
                  item.href +
                    "/",
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
                  : item.label.includes(
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
                  className={[
                    "aios-nav-link",
                    active
                      ? "active"
                      : "",
                    isCN
                      ? "cn"
                      : "global",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(" ")}
                >
                  <span
                    className="aios-nav-icon"
                    aria-hidden="true"
                  >
                    {
                      item.icon
                    }
                  </span>

                  <span className="aios-nav-label">
                    {label}
                  </span>

                  {active && (
                    <span
                      className="aios-nav-active-dot"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            },
          )}
        </nav>
      </div>

      <div className="aios-sidebar-footer">
        <div className="aios-sidebar-footer-status">
          <span
            className="aios-sidebar-status-dot"
            aria-hidden="true"
          />

          <span>
            {copy.online}
          </span>
        </div>

        <span>
          {isCN
            ? "AIOS CN"
            : "AIOS Global"}
        </span>
      </div>
    </aside>
  );
}

function ProductLink({
  href,
  active,
  title,
  description,
  cn = false,
}: {
  href: string;
  active: boolean;
  title: string;
  description: string;
  cn?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={[
        "aios-product-link",
        active
          ? "active"
          : "",
        cn
          ? "cn"
          : "global",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="aios-product-link-mark"
        aria-hidden="true"
      >
        {cn
          ? "CN"
          : "G"}
      </span>

      <span className="aios-product-link-copy">
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </span>

      {active && (
        <span
          className="aios-product-link-check"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </Link>
  );
}
