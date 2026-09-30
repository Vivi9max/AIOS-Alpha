"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy = {
  en: {
    workflow: "PRODUCT WORKFLOW",
    planner: "Planner",
    dashboard: "Dashboard",
    tasks: "Tasks",
    execution: "Execution",
    current: "Current",
  },
  "zh-CN": {
    workflow: "产品工作流",
    planner: "Planner",
    dashboard: "仪表盘",
    tasks: "任务",
    execution: "Execution",
    current: "当前",
  },
  ja: {
    workflow: "プロダクトワークフロー",
    planner: "Planner",
    dashboard: "ダッシュボード",
    tasks: "タスク",
    execution: "Execution",
    current: "現在",
  },
} as const;

const steps = [
  { key: "planner", href: "/planner", number: "01" },
  { key: "dashboard", href: "/dashboard", number: "02" },
  { key: "tasks", href: "/tasks", number: "03" },
  { key: "planner", href: "/planner", number: "04" },
  { key: "execution", href: "/execution", number: "05" },
] as const;

export default function ProductWorkflowNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const labels =
    copy[language as keyof typeof copy] ?? copy.en;

  return (
    <nav
      aria-label={labels.workflow}
      style={{
        borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(248, 250, 252, 0.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "8px 20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              flex: "0 0 auto",
              fontSize: "10px",
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#64748b",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
            }}
          >
            {labels.workflow}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minWidth: 0,
              overflowX: "auto",
              scrollbarWidth: "none",
              paddingBottom: "1px",
            }}
          >
            {steps.map((step, index) => {
              const active =
                pathname === step.href ||
                (step.href === "/planner" &&
                  pathname.startsWith("/planner/"));

              const label =
                labels[
                  step.key as keyof typeof labels
                ];

              return (
                <div
                  key={`${step.number}-${step.key}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flex: "0 0 auto",
                  }}
                >
                  {index > 0 ? (
                    <span
                      aria-hidden="true"
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        lineHeight: 1,
                      }}
                    >
                      →
                    </span>
                  ) : null}

                  <Link
                    href={step.href}
                    aria-current={
                      active ? "page" : undefined
                    }
                    title={
                      active
                        ? labels.current
                        : label
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      minHeight: "30px",
                      padding: "0 10px",
                      borderRadius: "999px",
                      border: active
                        ? "1px solid rgba(37, 99, 235, 0.28)"
                        : "1px solid rgba(148, 163, 184, 0.2)",
                      background: active
                        ? "rgba(37, 99, 235, 0.08)"
                        : "rgba(255, 255, 255, 0.58)",
                      color: active
                        ? "#1d4ed8"
                        : "#475569",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      fontSize: "12px",
                      lineHeight: 1,
                      fontWeight: active ? 700 : 600,
                      transition:
                        "background 160ms ease, border-color 160ms ease, color 160ms ease",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        opacity: active ? 0.9 : 0.6,
                      }}
                    >
                      {step.number}
                    </span>
                    <span>{label}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
