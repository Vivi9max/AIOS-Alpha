"use client";

import Link from "next/link";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "AIOS ALPHA",
    title: "An outcome-oriented AI workspace",
    description:
      "One operating surface for thinking, research, evidence, files, tasks and execution.",
    runtime:
      "Runtime online",
    version:
      "ALPHA v0.5.1",
    products:
      "Choose your AIOS workspace",
    globalTitle:
      "AIOS Global",
    globalDescription:
      "Global AIOS workspace for research, reasoning, tasks and execution.",
    globalTag:
      "GLOBAL",
    globalAction:
      "Open Global Workspace",
    cnTitle:
      "AIOS CN",
    cnDescription:
      "China-oriented AIOS workspace with the mainland-compatible runtime path.",
    cnTag:
      "CN",
    cnAction:
      "Open AIOS CN",
    capabilityTitle:
      "One system, two operating paths",
    capabilityDescription:
      "The product surface stays consistent while runtime capabilities can be adapted to the operating environment.",
    research:
      "Research",
    evidence:
      "Evidence",
    execution:
      "Execution",
    memory:
      "Memory",
    footer:
      "AIOS · Outcome-oriented workspace",
  },
  "zh-CN": {
    eyebrow: "AIOS ALPHA",
    title: "以结果为导向的 AI 工作空间",
    description:
      "统一承载思考、研究、证据、文件、任务与执行。",
    runtime:
      "Runtime 运行正常",
    version:
      "ALPHA v0.5.1",
    products:
      "选择 AIOS 工作空间",
    globalTitle:
      "AIOS Global",
    globalDescription:
      "面向全球使用场景的 AIOS 工作空间，覆盖研究、推理、任务与执行。",
    globalTag:
      "GLOBAL",
    globalAction:
      "进入 Global 工作区",
    cnTitle:
      "AIOS CN",
    cnDescription:
      "面向中国使用场景的 AIOS 工作空间，使用中国大陆兼容的 Runtime 路径。",
    cnTag:
      "CN",
    cnAction:
      "进入 AIOS CN",
    capabilityTitle:
      "一个系统，两条运行路径",
    capabilityDescription:
      "产品界面保持统一，同时根据实际运行环境适配不同的模型与能力。",
    research:
      "研究",
    evidence:
      "证据",
    execution:
      "执行",
    memory:
      "记忆",
    footer:
      "AIOS · 以结果为导向的 AI 工作空间",
  },
  ja: {
    eyebrow: "AIOS ALPHA",
    title:
      "成果を中心に設計された AI ワークスペース",
    description:
      "思考、リサーチ、エビデンス、ファイル、タスク、実行を一つの環境に統合します。",
    runtime:
      "Runtime 稼働中",
    version:
      "ALPHA v0.5.1",
    products:
      "AIOS ワークスペースを選択",
    globalTitle:
      "AIOS Global",
    globalDescription:
      "リサーチ、推論、タスク、実行を扱うグローバル AIOS ワークスペース。",
    globalTag:
      "GLOBAL",
    globalAction:
      "Global ワークスペースへ",
    cnTitle:
      "AIOS CN",
    cnDescription:
      "中国向けの AIOS ワークスペース。中国本土に対応した Runtime パスを使用します。",
    cnTag:
      "CN",
    cnAction:
      "AIOS CN へ",
    capabilityTitle:
      "一つのシステム、二つの Runtime パス",
    capabilityDescription:
      "プロダクト体験は統一しながら、実行環境に応じてモデルと機能を適応させます。",
    research:
      "リサーチ",
    evidence:
      "エビデンス",
    execution:
      "実行",
    memory:
      "メモリー",
    footer:
      "AIOS · 成果中心の AI ワークスペース",
  },
} as const;

export default function Home() {
  const {
    locale,
  } = useLanguage();

  const currentCopy =
    copy[locale];

  return (
    <main className="aios-landing">
      <div className="aios-landing-shell">
        <header className="aios-landing-header">
          <div className="aios-landing-brand">
            <span
              className="aios-landing-brand-mark"
              aria-hidden="true"
            >
              A
            </span>

            <div>
              <strong>
                AIOS Alpha
              </strong>

              <span>
                Outcome OS
              </span>
            </div>
          </div>

          <div className="aios-landing-status">
            <span className="aios-landing-status-dot" />

            <span>
              {currentCopy.runtime}
            </span>

            <span className="aios-landing-status-divider">
              ·
            </span>

            <span>
              {currentCopy.version}
            </span>
          </div>
        </header>

        <section className="aios-landing-hero">
          <div className="aios-landing-eyebrow">
            <span className="aios-landing-eyebrow-dot" />

            {currentCopy.eyebrow}
          </div>

          <h1>
            {currentCopy.title}
          </h1>

          <p>
            {currentCopy.description}
          </p>

          <div className="aios-landing-capabilities">
            <span>
              {currentCopy.research}
            </span>

            <span>
              {currentCopy.evidence}
            </span>

            <span>
              {currentCopy.execution}
            </span>

            <span>
              {currentCopy.memory}
            </span>
          </div>
        </section>

        <section className="aios-product-selection">
          <div className="aios-section-heading">
            <div>
              <span>
                AIOS
              </span>

              <h2>
                {currentCopy.products}
              </h2>
            </div>
          </div>

          <div className="aios-product-grid">
            <ProductCard
              href="/workspace"
              tag={
                currentCopy.globalTag
              }
              title={
                currentCopy.globalTitle
              }
              description={
                currentCopy.globalDescription
              }
              action={
                currentCopy.globalAction
              }
              variant="global"
            />

            <ProductCard
              href="/cn"
              tag={
                currentCopy.cnTag
              }
              title={
                currentCopy.cnTitle
              }
              description={
                currentCopy.cnDescription
              }
              action={
                currentCopy.cnAction
              }
              variant="cn"
            />
          </div>
        </section>

        <section className="aios-landing-principle">
          <div className="aios-principle-mark">
            →
          </div>

          <div>
            <h2>
              {
                currentCopy.capabilityTitle
              }
            </h2>

            <p>
              {
                currentCopy.capabilityDescription
              }
            </p>
          </div>
        </section>

        <footer className="aios-landing-footer">
          {currentCopy.footer}
        </footer>
      </div>

      <style jsx global>{`
        .aios-landing {
          min-height: 100vh;
          padding:
            0 18px
            env(safe-area-inset-bottom);
          background:
            radial-gradient(
              circle at 8% 0%,
              rgba(99, 102, 241, 0.1),
              transparent 32%
            ),
            radial-gradient(
              circle at 92% 16%,
              rgba(148, 163, 184, 0.11),
              transparent 28%
            ),
            #f8fafc;
          color: #0f172a;
        }

        .aios-landing-shell {
          width: 100%;
          max-width: 1120px;
          min-height: 100vh;
          margin: 0 auto;
          padding:
            22px 0 34px;
        }

        .aios-landing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding:
            4px 2px 0;
        }

        .aios-landing-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .aios-landing-brand-mark {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background:
            linear-gradient(
              135deg,
              #111827,
              #4338ca
            );
          color: #ffffff;
          font-size: 16px;
          font-weight: 900;
          box-shadow:
            0 10px 24px
            rgba(67, 56, 202, 0.2);
        }

        .aios-landing-brand div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .aios-landing-brand strong {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }

        .aios-landing-brand span {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .aios-landing-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding:
            7px 10px;
          border:
            1px solid #e2e8f0;
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.8);
          color: #64748b;
          font-size: 10px;
          font-weight: 750;
        }

        .aios-landing-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 0 4px
            rgba(34, 197, 94, 0.1);
        }

        .aios-landing-status-divider {
          color: #cbd5e1;
        }

        .aios-landing-hero {
          max-width: 820px;
          margin:
            92px auto 64px;
          text-align: center;
        }

        .aios-landing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding:
            6px 10px;
          border-radius: 999px;
          background: #111827;
          color: #ffffff;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .aios-landing-eyebrow-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #a5b4fc;
        }

        .aios-landing-hero h1 {
          margin:
            18px 0 16px;
          font-size:
            clamp(
              38px,
              7vw,
              66px
            );
          line-height: 1.02;
          font-weight: 920;
          letter-spacing: -0.055em;
        }

        .aios-landing-hero p {
          max-width: 680px;
          margin: 0 auto;
          color: #64748b;
          font-size: 15px;
          line-height: 1.75;
        }

        .aios-landing-capabilities {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 24px;
        }

        .aios-landing-capabilities span {
          padding:
            6px 9px;
          border:
            1px solid #e2e8f0;
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.75);
          color: #475569;
          font-size: 10px;
          font-weight: 800;
        }

        .aios-product-selection {
          width: 100%;
        }

        .aios-section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .aios-section-heading span {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .aios-section-heading h2 {
          margin-top: 3px;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.025em;
        }

        .aios-product-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 16px;
        }

        .aios-product-card {
          position: relative;
          display: flex;
          min-height: 250px;
          flex-direction: column;
          justify-content: space-between;
          padding: 25px;
          overflow: hidden;
          border-radius: 22px;
          border:
            1px solid #dbe3ef;
          background: #ffffff;
          color: #0f172a;
          text-decoration: none;
          box-shadow:
            0 16px 42px
            rgba(15, 23, 42, 0.055);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .aios-product-card::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          right: -75px;
          top: -75px;
          border-radius: 50%;
          background:
            rgba(99, 102, 241, 0.07);
          pointer-events: none;
        }

        .aios-product-card.cn::after {
          background:
            rgba(185, 28, 28, 0.07);
        }

        .aios-product-card:hover {
          transform:
            translateY(-3px);
          border-color: #cbd5e1;
          box-shadow:
            0 22px 52px
            rgba(15, 23, 42, 0.09);
        }

        .aios-product-card-top {
          position: relative;
          z-index: 1;
        }

        .aios-product-card-tag {
          display: inline-flex;
          padding:
            5px 8px;
          border-radius: 999px;
          background: #eef2ff;
          color: #3730a3;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .aios-product-card.cn
          .aios-product-card-tag {
          background: #fef2f2;
          color: #b91c1c;
        }

        .aios-product-card h3 {
          margin:
            17px 0 8px;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: -0.035em;
        }

        .aios-product-card p {
          max-width: 500px;
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }

        .aios-product-card-action {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          width: fit-content;
          margin-top: 25px;
          padding:
            10px 13px;
          border-radius: 10px;
          background: #111827;
          color: #ffffff;
          font-size: 11px;
          font-weight: 850;
        }

        .aios-product-card.cn
          .aios-product-card-action {
          background: #991b1b;
        }

        .aios-landing-principle {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-top: 22px;
          padding:
            20px 22px;
          border:
            1px solid #e2e8f0;
          border-radius: 18px;
          background:
            rgba(255, 255, 255, 0.7);
        }

        .aios-principle-mark {
          width: 30px;
          height: 30px;
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f1f5f9;
          color: #475569;
          font-weight: 900;
        }

        .aios-landing-principle h2 {
          font-size: 13px;
          font-weight: 850;
        }

        .aios-landing-principle p {
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.65;
        }

        .aios-landing-footer {
          margin-top: 28px;
          text-align: center;
          color: #94a3b8;
          font-size: 10px;
        }

        @media (max-width: 700px) {
          .aios-landing {
            padding:
              0 12px
              env(safe-area-inset-bottom);
          }

          .aios-landing-shell {
            padding:
              14px 0 26px;
          }

          .aios-landing-status {
            display: none;
          }

          .aios-landing-hero {
            margin:
              70px auto 48px;
          }

          .aios-landing-hero h1 {
            font-size:
              clamp(
                36px,
                12vw,
                52px
              );
          }

          .aios-landing-hero p {
            font-size: 14px;
          }

          .aios-product-grid {
            grid-template-columns: 1fr;
          }

          .aios-product-card {
            min-height: 220px;
            padding: 21px;
            border-radius: 19px;
          }

          .aios-product-card h3 {
            font-size: 24px;
          }

          .aios-landing-principle {
            padding: 17px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .aios-product-card {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}

function ProductCard({
  href,
  tag,
  title,
  description,
  action,
  variant,
}: {
  href: string;
  tag: string;
  title: string;
  description: string;
  action: string;
  variant: "global" | "cn";
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`aios-product-card ${variant}`}
    >
      <div className="aios-product-card-top">
        <span className="aios-product-card-tag">
          {tag}
        </span>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>
      </div>

      <span className="aios-product-card-action">
        <span>
          {action}
        </span>

        <span aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}
