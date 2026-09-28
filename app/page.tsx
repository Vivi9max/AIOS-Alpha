"use client";

import Link from "next/link";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "AIOS",
    title: "AIOS Workspace",
    description:
      "One workspace for thinking, research, files, tasks and execution.",
    globalTitle: "AIOS Global",
    globalDescription:
      "Global AIOS workspace.",
    globalAction: "Enter Workspace",
    cnTitle: "AIOS CN",
    cnDescription:
      "China-oriented AIOS workspace.",
    cnAction: "Enter AIOS CN",
    status: "Runtime Online",
    version:
      "ALPHA v0.5.1",
  },
  "zh-CN": {
    eyebrow: "AIOS",
    title: "AIOS 工作区",
    description:
      "统一处理思考、研究、文件、任务与执行。",
    globalTitle: "AIOS Global",
    globalDescription:
      "全球 AIOS 工作区。",
    globalAction: "进入工作区",
    cnTitle: "AIOS CN",
    cnDescription:
      "面向中国使用场景的 AIOS 工作区。",
    cnAction: "进入 AIOS CN",
    status: "运行正常",
    version:
      "ALPHA v0.5.1",
  },
  ja: {
    eyebrow: "AIOS",
    title: "AIOS ワークスペース",
    description:
      "思考、リサーチ、ファイル、タスク、実行を一つのワークスペースで扱います。",
    globalTitle: "AIOS Global",
    globalDescription:
      "グローバル AIOS ワークスペース。",
    globalAction: "ワークスペースへ",
    cnTitle: "AIOS CN",
    cnDescription:
      "中国向け AIOS ワークスペース。",
    cnAction: "AIOS CN へ",
    status: "Runtime Online",
    version:
      "ALPHA v0.5.1",
  },
} as const;

export default function Home() {
  const {
    locale,
  } = useLanguage();

  const currentCopy =
    copy[locale];

  return (
    <main
      style={{
        minHeight:
          "100vh",
        boxSizing:
          "border-box",
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        padding:
          "28px 18px",
        background:
          "#f8fafc",
        color:
          "#111827",
      }}
    >
      <div
        style={{
          width:
            "100%",
          maxWidth:
            900,
        }}
      >
        <header
          style={{
            textAlign:
              "center",
            marginBottom:
              30,
          }}
        >
          <div
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap: 7,
              padding:
                "6px 11px",
              borderRadius:
                999,
              background:
                "#111827",
              color:
                "#ffffff",
              fontSize:
                11,
              fontWeight:
                850,
              letterSpacing:
                "0.08em",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius:
                  "50%",
                background:
                  "#22c55e",
              }}
            />

            {currentCopy.eyebrow}
          </div>

          <h1
            style={{
              margin:
                "18px 0 10px",
              fontSize:
                "clamp(34px, 7vw, 52px)",
              lineHeight:
                1.05,
              fontWeight:
                900,
              letterSpacing:
                "-0.035em",
            }}
          >
            {currentCopy.title}
          </h1>

          <p
            style={{
              maxWidth:
                650,
              margin:
                "0 auto",
              color:
                "#64748b",
              fontSize:
                15,
              lineHeight:
                1.7,
            }}
          >
            {
              currentCopy.description
            }
          </p>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center",
              alignItems:
                "center",
              flexWrap:
                "wrap",
              gap: 8,
              marginTop:
                16,
            }}
          >
            <span
              style={{
                padding:
                  "5px 9px",
                borderRadius:
                  999,
                background:
                  "#ecfdf5",
                color:
                  "#15803d",
                fontSize:
                  11,
                fontWeight:
                  800,
              }}
            >
              {currentCopy.status}
            </span>

            <span
              style={{
                color:
                  "#94a3b8",
                fontSize:
                  11,
              }}
            >
              ·
            </span>

            <span
              style={{
                color:
                  "#94a3b8",
                fontSize:
                  11,
              }}
            >
              {currentCopy.version}
            </span>
          </div>
        </header>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap:
              16,
          }}
        >
          <Link
            href="/workspace"
            prefetch={false}
            style={{
              display:
                "block",
              padding:
                26,
              borderRadius:
                22,
              background:
                "#ffffff",
              border:
                "1px solid #dbe3ef",
              boxShadow:
                "0 12px 32px rgba(15, 23, 42, 0.06)",
              color:
                "#111827",
              textDecoration:
                "none",
            }}
          >
            <div
              style={{
                display:
                  "inline-flex",
                padding:
                  "5px 9px",
                borderRadius:
                  999,
                background:
                  "#eef2ff",
                color:
                  "#3730a3",
                fontSize:
                  11,
                fontWeight:
                  800,
              }}
            >
              GLOBAL
            </div>

            <h2
              style={{
                margin:
                  "17px 0 7px",
                fontSize:
                  25,
                fontWeight:
                  850,
              }}
            >
              {
                currentCopy.globalTitle
              }
            </h2>

            <p
              style={{
                margin:
                  "0 0 20px",
                color:
                  "#64748b",
                fontSize:
                  14,
                lineHeight:
                  1.65,
              }}
            >
              {
                currentCopy.globalDescription
              }
            </p>

            <span
              style={{
                display:
                  "inline-flex",
                padding:
                  "10px 14px",
                borderRadius:
                  10,
                background:
                  "#111827",
                color:
                  "#ffffff",
                fontSize:
                  13,
                fontWeight:
                  800,
              }}
            >
              {
                currentCopy.globalAction
              }
            </span>
          </Link>

          <Link
            href="/cn"
            prefetch={false}
            style={{
              display:
                "block",
              padding:
                26,
              borderRadius:
                22,
              background:
                "#ffffff",
              border:
                "1px solid #fecaca",
              boxShadow:
                "0 12px 32px rgba(15, 23, 42, 0.06)",
              color:
                "#111827",
              textDecoration:
                "none",
            }}
          >
            <div
              style={{
                display:
                  "inline-flex",
                padding:
                  "5px 9px",
                borderRadius:
                  999,
                background:
                  "#fef2f2",
                color:
                  "#b91c1c",
                fontSize:
                  11,
                fontWeight:
                  800,
              }}
            >
              CN
            </div>

            <h2
              style={{
                margin:
                  "17px 0 7px",
                fontSize:
                  25,
                fontWeight:
                  850,
              }}
            >
              {
                currentCopy.cnTitle
              }
            </h2>

            <p
              style={{
                margin:
                  "0 0 20px",
                color:
                  "#64748b",
                fontSize:
                  14,
                lineHeight:
                  1.65,
              }}
            >
              {
                currentCopy.cnDescription
              }
            </p>

            <span
              style={{
                display:
                  "inline-flex",
                padding:
                  "10px 14px",
                borderRadius:
                  10,
                background:
                  "#b91c1c",
                color:
                  "#ffffff",
                fontSize:
                  13,
                fontWeight:
                  800,
              }}
            >
              {
                currentCopy.cnAction
              }
            </span>
          </Link>
        </section>

        <footer
          style={{
            marginTop:
              22,
            textAlign:
              "center",
            color:
              "#94a3b8",
            fontSize:
              11,
          }}
        >
          AIOS · Outcome-oriented workspace
        </footer>
      </div>
    </main>
  );
}
