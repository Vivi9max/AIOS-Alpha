"use client";

import AIOSCNChatPanel from "@/components/chat/AIOSCNChatPanel";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export default function CNPage() {
  return (
    <WorkspaceShell>
      <main className="aios-cn-page">
        <div className="aios-cn-page-inner">
          <section className="aios-cn-chat-section">
            <AIOSCNChatPanel />
          </section>
        </div>

        <style jsx global>{`
          .aios-cn-page {
            width: 100%;
            min-height: calc(100vh - 72px);
            box-sizing: border-box;
            padding: 18px 24px 32px;
            background:
              radial-gradient(
                circle at 80% 0%,
                rgba(148, 163, 184, 0.1),
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

          .aios-cn-chat-section {
            min-width: 0;
            width: 100%;
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
                rgba(15, 23, 42, 0.03) !important;
            cursor: pointer !important;
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
            width: 18px !important;
            height: 18px !important;
            flex: 0 0 18px !important;
            border-radius: 6px !important;
            background: #f1f5f9 !important;
            color: #64748b !important;
            font-size: 9px !important;
            line-height: 1 !important;
            font-weight: 900 !important;
          }

          .aios-cn-chat-section
            .aios-input-action-label {
            display: inline-block !important;
            min-width: 0 !important;
            white-space: nowrap !important;
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

          .aios-cn-chat-section
            section {
            min-height: calc(100vh - 120px);
            border-radius: 24px !important;
            border-color: #dfe5ec !important;
            box-shadow:
              0 20px 60px
                rgba(15, 23, 42, 0.08) !important;
          }

          /*
           * Product identity is already handled by
           * WorkspaceShell and the global workspace navigation.
           * The CN chat should remain focused on the actual work.
           */
          .aios-cn-chat-section
            .aios-cn-chat-header {
            display: none !important;
          }

          /*
           * Video and audio are secondary capabilities.
           * Keep them available without occupying the primary
           * CN workspace by default.
           */
          .aios-cn-chat-section
            .aios-cn-more-tools {
            grid-column: 1 / -1;
            min-width: 0;
            margin-top: 5px;
            border-top:
              1px solid #e5eaf0;
            padding-top: 8px;
          }

          .aios-cn-chat-section
            .aios-cn-more-tools
            summary {
            display: flex;
            align-items: center;
            min-height: 32px;
            padding: 0 2px;
            color: #64748b;
            font-size: 11px;
            line-height: 1;
            font-weight: 750;
            cursor: pointer;
            list-style: none;
            user-select: none;
          }

          .aios-cn-chat-section
            .aios-cn-more-tools
            summary::-webkit-details-marker {
            display: none;
          }

          .aios-cn-chat-section
            .aios-cn-more-tools
            summary::after {
            content: "+";
            margin-left: auto;
            color: #94a3b8;
            font-size: 17px;
            font-weight: 500;
          }

          .aios-cn-chat-section
            .aios-cn-more-tools[open]
            summary::after {
            content: "-";
          }

          .aios-cn-chat-section
            .aios-cn-more-tools-content {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 8px;
            padding-top: 7px;
          }

          .aios-cn-chat-section
            .aios-cn-media-tool {
            min-width: 0;
            padding: 8px;
            border:
              1px solid #e5eaf0;
            border-radius: 11px;
            background: #f8fafc;
          }

          .aios-cn-chat-section
            .aios-cn-media-tool
            > div {
            margin-top: 0 !important;
          }

          .aios-cn-chat-section
            .aios-cn-media-tool
            button,
          .aios-cn-chat-section
            .aios-cn-media-tool
            select {
            box-sizing: border-box !important;
            max-width: 100% !important;
            min-height: 34px !important;
            height: auto !important;
            padding: 7px 9px !important;
            border-radius: 9px !important;
            font-size: 11px !important;
          }

          .aios-cn-chat-section
            .aios-cn-media-tool
            button {
            border:
              1px solid #d8e0e8 !important;
            background: #ffffff !important;
            color: #334155 !important;
            font-weight: 800 !important;
          }

          .aios-cn-chat-section
            .aios-cn-media-tool
            select {
            border:
              1px solid #d8e0e8 !important;
            background: #ffffff !important;
            color: #334155 !important;
            font-weight: 700 !important;
          }

          @media (max-width: 900px) {
            .aios-cn-page {
              padding:
                14px 14px 28px;
            }

            .aios-cn-chat-section
              section {
              min-height:
                calc(100vh - 108px);
            }
          }

          @media (max-width: 700px) {
            .aios-cn-page {
              min-height:
                calc(100vh - 68px);
              padding:
                6px 5px
                calc(
                  20px +
                  env(
                    safe-area-inset-bottom
                  )
                );
            }

            .aios-cn-chat-section
              section {
              min-height:
                calc(100vh - 88px) !important;
              border-radius:
                20px !important;
            }

            .aios-cn-chat-section
              section
              > header {
              display: none !important;
            }

            .aios-cn-chat-section
              section
              > div:last-child {
              padding:
                9px 9px
                11px !important;
            }

            .aios-cn-chat-section
              .aios-input-action {
              flex:
                1 1
                calc(
                  25% - 5px
                );
              min-width: 0 !important;
              padding:
                0 7px !important;
              font-size:
                10px !important;
            }

            .aios-cn-chat-section
              .aios-input-action-icon {
              width:
                16px !important;
              height:
                16px !important;
              flex-basis:
                16px !important;
              font-size:
                8px !important;
            }

            .aios-cn-chat-section
              .aios-cn-more-tools-content {
              grid-template-columns:
                minmax(0, 1fr);
              gap: 6px;
            }

            .aios-cn-chat-section
              .aios-cn-media-tool {
              padding: 7px;
              border-radius: 10px;
            }

            .aios-cn-chat-section
              .aios-cn-media-tool
              button,
            .aios-cn-chat-section
              .aios-cn-media-tool
              select {
              min-height:
                32px !important;
              font-size:
                10px !important;
            }
          }
        `}</style>
      </main>
    </WorkspaceShell>
  );
}
