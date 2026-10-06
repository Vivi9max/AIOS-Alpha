"use client";

import AIOSCNChatPanel from "@/components/chat/AIOSCNChatPanel";
import WorkspaceShell from "@/components/layout/WorkspaceShell";
import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

type Locale =
  | "en"
  | "zh-CN"
  | "ja";

const copy = {
  en: {
    eyebrow: "AIOS CN",
    title:
      "Start with the outcome. Move the work forward.",
    description:
      "Bring a goal, question, or task. AIOS helps turn it into clear, evidence-aware work.",
    runtime: "Runtime",
    runtimeValue: "DeepSeek",
    input: "Input",
    inputValue: "Text · Image · File · Voice",
    privacy: "Workspace",
    privacyValue: "Isolated session",
    capabilities: "Core capabilities",
    capabilityChat: "AI conversation",
    capabilityChatDescription:
      "Bring a goal, question, or task directly to AIOS.",
    capabilityInput: "Input understanding",
    capabilityInputDescription:
      "Camera, photos, files, video, and voice input.",
    capabilityEvidence:
      "Evidence-aware responses",
    capabilityEvidenceDescription:
      "Responses keep evidence and execution boundaries explicit.",
    note:
      "AIOS CN currently focuses on reliable understanding and execution boundaries. Unavailable capabilities are not presented as completed.",
  },
  "zh-CN": {
    eyebrow: "AIOS CN",
    title:
      "从目标出发，把工作推进到结果。",
    description:
      "告诉 AIOS 你要达成的目标，从问题、输入到证据，让工作一步步走向结果。",
    runtime: "Runtime",
    runtimeValue: "DeepSeek",
    input: "输入",
    inputValue:
      "文本 · 图片 · 文件 · 语音",
    privacy: "工作空间",
    privacyValue: "独立会话",
    capabilities: "核心能力",
    capabilityChat: "AI 对话",
    capabilityChatDescription:
      "直接告诉 AIOS 目标、问题或任务。",
    capabilityInput: "输入理解",
    capabilityInputDescription:
      "支持相机、相册、文件、视频与语音输入。",
    capabilityEvidence:
      "基于证据的回答",
    capabilityEvidenceDescription:
      "明确区分证据、可确认内容与执行边界。",
    note:
      "AIOS CN 当前优先保证可靠理解与明确的执行边界。尚未具备的能力不会被展示为已经完成。",
  },
  ja: {
    eyebrow: "AIOS CN",
    title:
      "目標から始めて、成果につなげる。",
    description:
      "目標や課題を入力すれば、AIOS が問い、入力、エビデンスを整理し、成果につながる作業へ導きます。",
    runtime: "Runtime",
    runtimeValue: "DeepSeek",
    input: "入力",
    inputValue:
      "テキスト · 画像 · ファイル · 音声",
    privacy: "ワークスペース",
    privacyValue: "分離セッション",
    capabilities: "主要機能",
    capabilityChat: "AI 会話",
    capabilityChatDescription:
      "目標、質問、タスクをそのまま AIOS に入力できます。",
    capabilityInput: "入力理解",
    capabilityInputDescription:
      "カメラ、写真、ファイル、動画、音声に対応します。",
    capabilityEvidence:
      "エビデンスを考慮した回答",
    capabilityEvidenceDescription:
      "エビデンスと実行範囲を明確に分けて回答します。",
    note:
      "AIOS CN は現在、信頼できる理解と明確な実行境界を優先しています。未対応の機能を完了済みとして表示することはありません。",
  },
} as const;

function StatusCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="aios-cn-status-card">
      <span className="aios-cn-status-label">
        {label}
      </span>

      <strong className="aios-cn-status-value">
        {value}
      </strong>
    </div>
  );
}

function Capability({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="aios-cn-capability">
      <span
        className="aios-cn-capability-icon"
        aria-hidden="true"
      >
        {icon}
      </span>

      <div>
        <strong>{title}</strong>

        <span>{description}</span>
      </div>
    </div>
  );
}

export default function CNPage() {
  const {
    locale,
  } = useLanguage();

  const ui =
    copy[
      locale as Locale
    ] ?? copy.en;

  return (
    <WorkspaceShell>
      <main className="aios-cn-page">
        <div className="aios-cn-page-inner">
          <section className="aios-cn-hero">
            <div className="aios-cn-hero-copy">
              <span className="aios-cn-eyebrow">
                <span
                  className="aios-cn-eyebrow-dot"
                  aria-hidden="true"
                />

                {ui.eyebrow}
              </span>

              <h2>{ui.title}</h2>

              <p>{ui.description}</p>
            </div>

            <div className="aios-cn-status-grid">
              <StatusCard
                label={ui.runtime}
                value={ui.runtimeValue}
              />

              <StatusCard
                label={ui.input}
                value={ui.inputValue}
              />

              <StatusCard
                label={ui.privacy}
                value={ui.privacyValue}
              />
            </div>
          </section>

          <section className="aios-cn-capability-section">
            <div className="aios-cn-section-heading">
              <span>
                {ui.capabilities}
              </span>
            </div>

            <div className="aios-cn-capability-grid">
              <Capability
                icon="◉"
                title={ui.capabilityChat}
                description={
                  ui.capabilityChatDescription
                }
              />

              <Capability
                icon="◇"
                title={ui.capabilityInput}
                description={
                  ui.capabilityInputDescription
                }
              />

              <Capability
                icon="✓"
                title={
                  ui.capabilityEvidence
                }
                description={
                  ui.capabilityEvidenceDescription
                }
              />
            </div>
          </section>

          <section className="aios-cn-chat-section">
            <AIOSCNChatPanel />
          </section>

          <div className="aios-cn-note">
            <span
              className="aios-cn-note-mark"
              aria-hidden="true"
            >
              i
            </span>

            <span>{ui.note}</span>
          </div>
        </div>

        <style jsx global>{`
          .aios-cn-page {
            width: 100%;
            min-height: calc(100vh - 72px);
            box-sizing: border-box;
            padding: 24px 24px 42px;
            background:
              radial-gradient(
                circle at 80% 0%,
                rgba(148, 163, 184, 0.14),
                transparent 34%
              ),
              linear-gradient(
                180deg,
                #f8fafc 0%,
                #f1f5f9 54%,
                #eef2f7 100%
              );
          }

          .aios-cn-page-inner {
            width: 100%;
            max-width: 1180px;
            margin: 0 auto;
          }

          .aios-cn-hero {
            display: grid;
            grid-template-columns:
              minmax(0, 1.5fr)
              minmax(300px, 0.9fr);
            gap: 18px;
            align-items: stretch;
            margin-bottom: 14px;
          }

          .aios-cn-hero-copy {
            min-width: 0;
            padding: 30px 30px 28px;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            background:
              linear-gradient(
                145deg,
                #ffffff 0%,
                #f8fafc 100%
              );
            box-shadow:
              0 18px 50px
                rgba(15, 23, 42, 0.07);
          }

          .aios-cn-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: 0.11em;
            text-transform: uppercase;
            color: #64748b;
          }

          .aios-cn-eyebrow-dot {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: #16a34a;
            box-shadow:
              0 0 0 4px
                rgba(22, 163, 74, 0.1);
          }

          .aios-cn-hero-copy h2 {
            margin: 17px 0 9px;
            font-size: clamp(26px, 4vw, 42px);
            line-height: 1.08;
            letter-spacing: -0.045em;
            color: #0f172a;
          }

          .aios-cn-hero-copy p {
            max-width: 700px;
            margin: 0;
            font-size: 14px;
            line-height: 1.7;
            color: #64748b;
          }

          .aios-cn-status-grid {
            display: grid;
            grid-template-columns:
              repeat(1, minmax(0, 1fr));
            gap: 10px;
          }

          .aios-cn-status-card {
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 82px;
            padding: 15px 17px;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            background:
              rgba(255, 255, 255, 0.88);
            box-shadow:
              0 10px 30px
                rgba(15, 23, 42, 0.045);
          }

          .aios-cn-status-label {
            margin-bottom: 6px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #94a3b8;
          }

          .aios-cn-status-value {
            font-size: 13px;
            line-height: 1.45;
            color: #1e293b;
          }

          .aios-cn-capability-section {
            margin-bottom: 14px;
            padding: 17px;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            background:
              rgba(255, 255, 255, 0.72);
          }

          .aios-cn-section-heading {
            margin: 0 0 11px 2px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #64748b;
          }

          .aios-cn-capability-grid {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 9px;
          }

          .aios-cn-capability {
            display: flex;
            gap: 11px;
            min-width: 0;
            padding: 13px;
            border: 1px solid #e8edf3;
            border-radius: 15px;
            background: #ffffff;
          }

          .aios-cn-capability-icon {
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            width: 30px;
            height: 30px;
            border-radius: 9px;
            background: #f1f5f9;
            color: #475569;
            font-size: 13px;
            font-weight: 800;
          }

          .aios-cn-capability > div {
            min-width: 0;
          }

          .aios-cn-capability strong {
            display: block;
            margin-bottom: 3px;
            font-size: 12px;
            line-height: 1.4;
            color: #1e293b;
          }

          .aios-cn-capability span:not(
              .aios-cn-capability-icon
            ) {
            display: block;
            font-size: 10px;
            line-height: 1.5;
            color: #94a3b8;
          }

          .aios-cn-chat-section {
            min-width: 0;
          }

          .aios-cn-chat-section
            .aios-input-dock {
            min-width: 0;
          }

          .aios-cn-chat-section
            .aios-input-actions {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100%;
          }

          .aios-cn-chat-section
            .aios-input-action {
            appearance: none !important;
            -webkit-appearance: none !important;
            box-sizing: border-box !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            min-width: 0 !important;
            min-height: 38px !important;
            height: 38px !important;
            padding: 0 11px !important;
            border: 1px solid #d8e0e8 !important;
            border-radius: 11px !important;
            background: #ffffff !important;
            color: #334155 !important;
            font-size: 12px !important;
            line-height: 1 !important;
            font-weight: 800 !important;
            box-shadow:
              0 1px 2px
                rgba(15, 23, 42, 0.03);
            cursor: pointer;
          }

          .aios-cn-chat-section
            .aios-input-action:hover:not(
              :disabled
            ) {
            border-color: #cbd5e1 !important;
            background: #f8fafc !important;
          }

          .aios-cn-chat-section
            .aios-input-action:disabled {
            opacity: 0.55 !important;
            cursor: not-allowed !important;
          }

          .aios-cn-chat-section
            .aios-input-action-icon {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 18px;
            height: 18px;
            flex: 0 0 18px;
            border-radius: 6px;
            background: #f1f5f9;
            color: #64748b;
            font-size: 9px !important;
            line-height: 1 !important;
            font-weight: 900 !important;
          }

          .aios-cn-chat-section
            .aios-input-action-label {
            display: inline-block;
            min-width: 0;
            white-space: nowrap;
          }

          .aios-cn-chat-section
            .aios-input-error {
            margin-top: 7px;
            padding: 7px 9px;
            border: 1px solid #fecaca;
            border-radius: 9px;
            background: #fef2f2;
            color: #b91c1c;
            font-size: 10px;
            line-height: 1.45;
          }

          .aios-cn-chat-section
            .aios-input-files {
            min-width: 0;
          }

          .aios-cn-chat-section
            textarea {
            min-height: 48px !important;
            max-height: 150px !important;
          }

          .aios-cn-chat-section section {
            border-radius: 24px !important;
            border-color: #dfe5ec !important;
            box-shadow:
              0 20px 60px
                rgba(15, 23, 42, 0.08) !important;
          }

          .aios-cn-chat-section
            section
            > header {
            padding: 16px 20px !important;
            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #fbfcfe 100%
              ) !important;
          }

          .aios-cn-chat-section
            section
            > header
            strong {
            letter-spacing: -0.01em;
          }

          .aios-cn-chat-section
            section
            > div:last-child {
            padding: 12px 14px 14px !important;
            background: #f8fafc !important;
            border-top-color: #e5eaf0 !important;
          }

          .aios-cn-chat-section
            section
            textarea {
            background: #ffffff !important;
            border-color: #d8e0e8 !important;
          }

          .aios-cn-chat-section
            section
            textarea:focus {
            border-color: #94a3b8 !important;
            box-shadow:
              0 0 0 3px
                rgba(100, 116, 139, 0.1) !important;
          }

          .aios-cn-chat-section
            section
            button {
            -webkit-tap-highlight-color: transparent;
          }

          .aios-cn-note {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin: 12px 4px 0;
            padding: 0 2px;
            font-size: 10px;
            line-height: 1.6;
            color: #7c8da5;
          }

          .aios-cn-note-mark {
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            width: 15px;
            height: 15px;
            margin-top: 1px;
            border: 1px solid #cbd5e1;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 800;
            color: #94a3b8;
          }

          @media (max-width: 900px) {
            .aios-cn-page {
              padding: 18px 14px 32px;
            }

            .aios-cn-hero {
              grid-template-columns:
                minmax(0, 1fr);
            }

            .aios-cn-status-grid {
              grid-template-columns:
                repeat(3, minmax(0, 1fr));
            }
          }

          @media (max-width: 700px) {
            .aios-cn-page {
              min-height: calc(100vh - 104px);
              padding: 9px 6px 24px;
            }

            .aios-cn-hero {
              gap: 8px;
              margin-bottom: 8px;
            }

            .aios-cn-hero-copy {
              padding: 22px 18px 20px;
              border-radius: 20px;
            }

            .aios-cn-hero-copy h2 {
              margin-top: 14px;
              font-size: 28px;
            }

            .aios-cn-hero-copy p {
              font-size: 13px;
            }

            .aios-cn-status-grid {
              grid-template-columns:
                repeat(3, minmax(0, 1fr));
              gap: 6px;
            }

            .aios-cn-status-card {
              min-height: 72px;
              padding: 11px 10px;
              border-radius: 14px;
            }

            .aios-cn-status-label {
              font-size: 8px;
            }

            .aios-cn-status-value {
              font-size: 10px;
            }

            .aios-cn-capability-section {
              margin-bottom: 8px;
              padding: 11px;
              border-radius: 17px;
            }

            .aios-cn-capability-grid {
              grid-template-columns:
                minmax(0, 1fr);
              gap: 6px;
            }

            .aios-cn-capability {
              padding: 10px;
              border-radius: 13px;
            }

            .aios-cn-capability strong {
              font-size: 11px;
            }

            .aios-cn-capability span:not(
                .aios-cn-capability-icon
              ) {
              font-size: 9px;
              line-height: 1.4;
            }

            .aios-cn-chat-section
              .aios-input-action {
              flex: 1 1 calc(25% - 5px);
              min-width: 0 !important;
              padding: 0 7px !important;
              font-size: 10px !important;
            }

            .aios-cn-chat-section
              .aios-input-action-icon {
              width: 16px;
              height: 16px;
              flex-basis: 16px;
              font-size: 8px !important;
            }

            .aios-cn-chat-section section {
              min-height:
                calc(100vh - 170px) !important;
              border-radius: 20px !important;
            }

            .aios-cn-chat-section
              section
              > header {
              padding: 14px 16px !important;
            }

            .aios-cn-chat-section
              section
              > div:last-child {
              padding: 10px 10px 12px !important;
            }

            .aios-cn-note {
              margin-top: 9px;
              padding: 0 4px;
            }
          }
        `}
        </style>
      </main>
    </WorkspaceShell>
  );
}
