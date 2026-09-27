"use client";

import Link from "next/link";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

const copy = {
  en: {
    eyebrow: "AIOS PRODUCT ENTRY",
    title: "Choose your AIOS workspace",
    description:
      "AIOS Global and AIOS CN share the AIOS product foundation while using separate product entry points and runtime boundaries.",
    globalTitle: "AIOS Global",
    globalDescription:
      "Global AIOS workspace for chat, memory, tasks, planning, execution and broader AIOS capabilities.",
    globalAction: "Enter AIOS Global",
    globalTag: "Global Runtime",
    cnTitle: "AIOS CN",
    cnDescription:
      "China-oriented AIOS workspace with CN Runtime, DeepSeek provider support and China-accessible product boundaries.",
    cnAction: "Enter AIOS CN",
    cnTag: "CN Runtime",
    note:
      "Product entry is separated by runtime and capability boundary. Your workspace data remains isolated by the existing identity system.",
  },
  "zh-CN": {
    eyebrow: "AIOS 产品入口",
    title: "选择 AIOS 工作空间",
    description:
      "AIOS Global 与 AIOS CN 共用 AIOS 产品基础能力，同时保持独立的产品入口和 Runtime 边界。",
    globalTitle: "AIOS Global",
    globalDescription:
      "面向全球使用的 AIOS 工作空间，包含聊天、Memory、Tasks、Planner、Execution 及更完整的 AIOS 能力。",
    globalAction: "进入 AIOS Global",
    globalTag: "Global Runtime",
    cnTitle: "AIOS CN",
    cnDescription:
      "面向中国使用场景的 AIOS 工作空间，使用 CN Runtime、DeepSeek Provider，并保持独立的产品能力边界。",
    cnAction: "进入 AIOS CN",
    cnTag: "CN Runtime",
    note:
      "两个产品入口按照 Runtime 与能力边界进行区分，工作区数据继续由现有 Identity 系统进行隔离。",
  },
  ja: {
    eyebrow: "AIOS プロダクト入口",
    title: "AIOS ワークスペースを選択",
    description:
      "AIOS Global と AIOS CN は共通の AIOS 基盤を使用しながら、製品入口と Runtime 境界を分離しています。",
    globalTitle: "AIOS Global",
    globalDescription:
      "Chat、Memory、Tasks、Planner、Execution など、AIOS の主要機能を利用するグローバルワークスペース。",
    globalAction: "AIOS Global に入る",
    globalTag: "Global Runtime",
    cnTitle: "AIOS CN",
    cnDescription:
      "CN Runtime と DeepSeek Provider を利用する、中国向けの独立した AIOS ワークスペース。",
    cnAction: "AIOS CN に入る",
    cnTag: "CN Runtime",
    note:
      "2つの製品入口は Runtime と機能境界によって分離されています。ワークスペースデータは既存の Identity システムで分離されます。",
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
          "32px 18px",
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
            1040,
        }}
      >
        <section
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
              padding:
                "6px 10px",
              borderRadius:
                999,
              background:
                "#111827",
              color:
                "#ffffff",
              fontSize:
                11,
              fontWeight:
                800,
              letterSpacing:
                "0.08em",
            }}
          >
            {currentCopy.eyebrow}
          </div>

          <h1
            style={{
              margin:
                "18px 0 10px",
              fontSize:
                "clamp(30px, 6vw, 48px)",
              lineHeight:
                1.1,
              fontWeight:
                850,
            }}
          >
            {currentCopy.title}
          </h1>

          <p
            style={{
              maxWidth:
                760,
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
            {currentCopy.description}
          </p>
        </section>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap:
              18,
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
                20,
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
              {currentCopy.globalTag}
            </div>

            <h2
              style={{
                margin:
                  "18px 0 8px",
                fontSize:
                  25,
                fontWeight:
                  800,
              }}
            >
              {currentCopy.globalTitle}
            </h2>

            <p
              style={{
                minHeight:
                  76,
                margin:
                  "0 0 22px",
                color:
                  "#64748b",
                fontSize:
                  14,
                lineHeight:
                  1.7,
              }}
            >
              {currentCopy.globalDescription}
            </p>

            <span
              style={{
                display:
                  "inline-flex",
                padding:
                  "11px 15px",
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
              {currentCopy.globalAction}
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
                20,
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
              {currentCopy.cnTag}
            </div>

            <h2
              style={{
                margin:
                  "18px 0 8px",
                fontSize:
                  25,
                fontWeight:
                  800,
              }}
            >
              {currentCopy.cnTitle}
            </h2>

            <p
              style={{
                minHeight:
                  76,
                margin:
                  "0 0 22px",
                color:
                  "#64748b",
                fontSize:
                  14,
                lineHeight:
                  1.7,
              }}
            >
              {currentCopy.cnDescription}
            </p>

            <span
              style={{
                display:
                  "inline-flex",
                padding:
                  "11px 15px",
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
              {currentCopy.cnAction}
            </span>
          </Link>
        </section>

        <p
          style={{
            maxWidth:
              820,
            margin:
              "24px auto 0",
            textAlign:
              "center",
            color:
              "#94a3b8",
            fontSize:
              12,
            lineHeight:
              1.6,
          }}
        >
          {currentCopy.note}
        </p>
      </div>
    </main>
  );
}
