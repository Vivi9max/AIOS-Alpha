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
  const { locale } = useLanguage();
  const labels = copy[locale];

  return (
    <nav className="aios-product-workflow" aria-label={labels.workflow}>
      <div className="aios-product-workflow-inner">
        <div className="aios-product-workflow-label">
          <span className="aios-product-workflow-dot" aria-hidden="true" />
          <span>{labels.workflow}</span>
        </div>

        <div className="aios-product-workflow-scroll">
          {steps.map((step, index) => {
            const active =
              pathname === step.href ||
              (step.href === "/planner" &&
                pathname.startsWith("/planner/"));

            const label = labels[step.key];

            return (
              <div
                key={`${step.number}-${step.key}`}
                className="aios-product-workflow-step"
              >
                {index > 0 ? (
                  <span
                    className="aios-product-workflow-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                ) : null}

                <Link
                  href={step.href}
                  aria-current={active ? "page" : undefined}
                  title={active ? labels.current : label}
                  className={
                    active
                      ? "aios-product-workflow-link is-active"
                      : "aios-product-workflow-link"
                  }
                >
                  <span
                    className="aios-product-workflow-number"
                    aria-hidden="true"
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
    </nav>
  );
}
