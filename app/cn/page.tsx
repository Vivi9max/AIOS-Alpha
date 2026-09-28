"use client";

import AIOSCNChatPanel from "@/components/chat/AIOSCNChatPanel";
import WorkspaceShell from "@/components/layout/WorkspaceShell";

export default function CNPage() {
  return (
    <WorkspaceShell>
      <main
        className="aios-cn-page"
        style={{
          width: "100%",
          minHeight: "calc(100vh - 72px)",
          boxSizing: "border-box",
          padding: "14px 12px 30px",
          background:
            "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 54%, #eef2f7 100%)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1180,
            margin: "0 auto",
          }}
        >
          <AIOSCNChatPanel />
        </div>

        <style jsx global>{`
          .aios-cn-page section {
            border-radius: 24px !important;
            border-color: #dfe5ec !important;
            box-shadow:
              0 20px 60px rgba(15, 23, 42, 0.08) !important;
          }

          .aios-cn-page section > header {
            padding: 16px 20px !important;
            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #fbfcfe 100%
              ) !important;
          }

          .aios-cn-page section > header strong {
            letter-spacing: -0.01em;
          }

          .aios-cn-page section > div:last-child {
            padding: 12px 14px 14px !important;
            background: #f8fafc !important;
            border-top-color: #e5eaf0 !important;
          }

          .aios-cn-page section > div:last-child > div:first-child {
            margin-bottom: 2px;
          }

          .aios-cn-page section > div:last-child > div:nth-child(2),
          .aios-cn-page section > div:last-child > div:nth-child(3) {
            display: inline-flex !important;
            width: auto !important;
            vertical-align: middle;
            margin-top: 6px !important;
            margin-right: 6px !important;
          }

          .aios-cn-page section textarea {
            background: #ffffff !important;
            border-color: #d8e0e8 !important;
          }

          .aios-cn-page section textarea:focus {
            border-color: #94a3b8 !important;
            box-shadow:
              0 0 0 3px rgba(100, 116, 139, 0.1) !important;
          }

          .aios-cn-page section > div:last-child
            button {
            -webkit-tap-highlight-color: transparent;
          }

          @media (max-width: 700px) {
            .aios-cn-page {
              padding: 8px 6px 20px !important;
            }

            .aios-cn-page section {
              min-height: calc(100vh - 104px) !important;
              border-radius: 20px !important;
            }

            .aios-cn-page section > header {
              padding: 14px 16px !important;
            }

            .aios-cn-page section > div:last-child {
              padding: 10px 10px 12px !important;
            }
          }
        `}
        </style>
      </main>
    </WorkspaceShell>
  );
}
