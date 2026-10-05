"use client";

import ChatPanel from "@/components/chat/ChatPanel";
import FeedbackButton from "@/components/alpha/FeedbackButton";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow:
      "AIOS GLOBAL",
    title:
      "What do you want to achieve?",
    description:
      "Start with a goal. Research, analyze, organize, and move the work forward in one workspace.",
    capabilities:
      "Research",
    evidence:
      "Evidence",
    tasks:
      "Tasks",
    execution:
      "Execution",
    ready:
      "Runtime ready",
  },
  "zh-CN": {
    eyebrow:
      "AIOS GLOBAL",
    title:
      "你想达成什么结果？",
    description:
      "从目标开始，在一个工作区中完成提问、研究、分析、整理与执行。",
    capabilities:
      "研究",
    evidence:
      "证据",
    tasks:
      "任务",
    execution:
      "执行",
    ready:
      "Runtime 就绪",
  },
  ja: {
    eyebrow:
      "AIOS GLOBAL",
    title:
      "どんな成果を実現したいですか？",
    description:
      "目標から始めて、一つのワークスペースで質問、リサーチ、分析、整理、実行まで進められます。",
    capabilities:
      "リサーチ",
    evidence:
      "エビデンス",
    tasks:
      "タスク",
    execution:
      "実行",
    ready:
      "Runtime 準備完了",
  },
} as const;

export default function WorkspacePage() {
  const {
    locale,
  } = useLanguage();

  const currentCopy =
    copy[locale];

  return (
    <WorkspaceShell>
      <main className="aios-global-workspace">
        <div className="aios-global-workspace-shell">
          <section className="aios-workspace-intro">
            <div>
              <span className="aios-workspace-eyebrow">
                <span />

                {
                  currentCopy.eyebrow
                }
              </span>

              <h2>
                {
                  currentCopy.title
                }
              </h2>

              <p>
                {
                  currentCopy.description
                }
              </p>
            </div>

            <div className="aios-workspace-ready">
              <span />

              {
                currentCopy.ready
              }
            </div>
          </section>

          <section className="aios-chat-surface">
            <ChatPanel />
          </section>

          <div className="aios-workspace-capabilities">
            <Capability
              value={
                currentCopy.capabilities
              }
              icon="⌁"
            />

            <Capability
              value={
                currentCopy.evidence
              }
              icon="✓"
            />

            <Capability
              value={
                currentCopy.tasks
              }
              icon="◇"
            />

            <Capability
              value={
                currentCopy.execution
              }
              icon="→"
            />
          </div>

          <div
            id="feedback"
            className="aios-workspace-feedback"
          >
            <FeedbackButton />
          </div>
        </div>

        <style jsx global>{`
          .aios-global-workspace {
            width: 100%;
            min-height:
              calc(100vh - 76px);
            box-sizing: border-box;
            background:
              radial-gradient(
                circle at 85% 0%,
                rgba(
                  99,
                  102,
                  241,
                  0.055
                ),
                transparent 26%
              ),
              #f5f7fb;
          }

          .aios-global-workspace-shell {
            width: 100%;
            max-width: 1180px;
            margin: 0 auto;
          }

          .aios-workspace-intro {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 15px;
          }

          .aios-workspace-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            color: #6366f1;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.1em;
          }

          .aios-workspace-eyebrow span {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #6366f1;
          }

          .aios-workspace-intro h2 {
            margin-top: 6px;
            color: #0f172a;
            font-size:
              clamp(
                23px,
                4vw,
                32px
              );
            line-height: 1.12;
            font-weight: 900;
            letter-spacing: -0.04em;
          }

          .aios-workspace-intro p {
            max-width: 650px;
            margin-top: 7px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.65;
          }

          .aios-workspace-ready {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            flex: 0 0 auto;
            padding:
              7px 10px;
            border:
              1px solid #bbf7d0;
            border-radius: 999px;
            background: #f0fdf4;
            color: #15803d;
            font-size: 10px;
            font-weight: 850;
          }

          .aios-workspace-ready span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #22c55e;
          }

          .aios-chat-surface {
            width: 100%;
            overflow: hidden;
            border:
              1px solid #dfe6ef;
            border-radius: 22px;
            background: #ffffff;
            box-shadow:
              0 18px 52px
              rgba(
                15,
                23,
                42,
                0.07
              );
          }

          .aios-chat-surface textarea {
            border-color:
              #dbe2ea !important;
          }

          .aios-chat-surface textarea:focus {
            border-color:
              #94a3b8 !important;
            box-shadow:
              0 0 0 3px
              rgba(
                148,
                163,
                184,
                0.12
              ) !important;
          }

          .aios-chat-surface
            section {
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .aios-chat-surface
            section
            > header
            > div:first-child
            > div:last-child {
            display: none !important;
          }

          .aios-chat-surface
            section
            > header
            > div:nth-child(2) {
            display: none !important;
          }

          .aios-workspace-capabilities {
            display: grid;
            grid-template-columns:
              repeat(
                4,
                minmax(0, 1fr)
              );
            gap: 8px;
            margin-top: 10px;
          }

          .aios-workspace-capability {
            display: flex;
            align-items: center;
            gap: 8px;
            padding:
              9px 10px;
            border:
              1px solid #e5eaf0;
            border-radius: 10px;
            background:
              rgba(
                255,
                255,
                255,
                0.78
              );
            color: #64748b;
            font-size: 10px;
            font-weight: 750;
          }

          .aios-workspace-capability
            span {
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            border-radius: 7px;
            background: #f1f5f9;
            color: #475569;
            font-size: 10px;
            font-weight: 900;
          }

          .aios-workspace-feedback {
            display: flex;
            justify-content: center;
            padding:
              12px 0 0;
            opacity: 0.62;
          }

          @media (max-width: 700px) {
            .aios-global-workspace {
              min-height:
                calc(100vh - 68px);
            }

            .aios-workspace-intro {
              align-items: flex-start;
              flex-direction: column;
              gap: 10px;
              margin-bottom: 10px;
            }

            .aios-workspace-intro h2 {
              font-size: 24px;
            }

            .aios-workspace-intro p {
              font-size: 11px;
            }

            .aios-workspace-ready {
              align-self: flex-start;
            }

            .aios-chat-surface {
              border-radius: 18px;
            }

            .aios-workspace-capabilities {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                );
            }
          }
        `}</style>
      </main>
    </WorkspaceShell>
  );
}

function Capability({
  value,
  icon,
}: {
  value: string;
  icon: string;
}) {
  return (
    <div className="aios-workspace-capability">
      <span
        aria-hidden="true"
      >
        {icon}
      </span>

      {value}
    </div>
  );
}
