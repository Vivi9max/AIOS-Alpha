"use client";

import type {
  RealtimeCapabilityType,
} from "@/lib/runtime/realtime-capability-router";
import type {
  RealtimeResponseStatus,
} from "@/lib/runtime/realtime-response-formatter";

interface Props {
  active: boolean;
  status: RealtimeResponseStatus;
  capability?: RealtimeCapabilityType;
  sourceCount: number;
  sourceHosts: string[];
  locale: "en" | "zh-CN" | "ja";
}

function getCapabilityLabel(
  capability: RealtimeCapabilityType | undefined,
  locale: Props["locale"],
): string {
  if (locale === "zh-CN") {
    switch (capability) {
      case "time":
        return "时间";
      case "weather":
        return "天气";
      case "news":
        return "新闻";
      case "exchange-rate":
        return "汇率";
      case "market":
        return "市场";
      default:
        return "实时信息";
    }
  }

  if (locale === "ja") {
    switch (capability) {
      case "time":
        return "時刻";
      case "weather":
        return "天気";
      case "news":
        return "ニュース";
      case "exchange-rate":
        return "為替";
      case "market":
        return "市場";
      default:
        return "リアルタイム情報";
    }
  }

  switch (capability) {
    case "time":
      return "Time";
    case "weather":
      return "Weather";
    case "news":
      return "News";
    case "exchange-rate":
      return "Exchange rate";
    case "market":
      return "Market";
    default:
      return "Realtime information";
  }
}

function getStatusLabel(
  status: RealtimeResponseStatus,
  locale: Props["locale"],
): string {
  if (locale === "zh-CN") {
    switch (status) {
      case "completed":
        return "已完成";
      case "evidence-verified":
        return "实时证据已验证";
      case "evidence-unverified":
        return "实时证据未验证";
      case "failed":
        return "实时信息不可用";
      default:
        return "";
    }
  }

  if (locale === "ja") {
    switch (status) {
      case "completed":
        return "完了";
      case "evidence-verified":
        return "リアルタイム証拠を検証済み";
      case "evidence-unverified":
        return "リアルタイム証拠を未検証";
      case "failed":
        return "リアルタイム情報を利用できません";
      default:
        return "";
    }
  }

  switch (status) {
    case "completed":
      return "Completed";
    case "evidence-verified":
      return "Realtime evidence verified";
    case "evidence-unverified":
      return "Realtime evidence unverified";
    case "failed":
      return "Realtime information unavailable";
    default:
      return "";
  }
}

function getDisclosureText(
  status: RealtimeResponseStatus,
  sourceCount: number,
  locale: Props["locale"],
): string {
  if (status === "evidence-verified") {
    if (locale === "zh-CN") {
      return sourceCount > 0
        ? `已通过外部证据验证 · ${sourceCount} 个来源`
        : "已通过外部证据验证";
    }

    if (locale === "ja") {
      return sourceCount > 0
        ? `外部証拠による検証済み · ${sourceCount} 件の情報源`
        : "外部証拠による検証済み";
    }

    return sourceCount > 0
      ? `Verified against external evidence · ${sourceCount} sources`
      : "Verified against external evidence";
  }

  if (status === "evidence-unverified") {
    if (locale === "zh-CN") {
      return "当前证据无法完成验证，AIOS 未将其作为实时结果";
    }

    if (locale === "ja") {
      return "現在の証拠を検証できないため、AIOS はリアルタイム結果として扱っていません";
    }

    return "Available evidence could not be verified, so AIOS did not present it as realtime";
  }

  if (status === "failed") {
    if (locale === "zh-CN") {
      return "实时外部证据不可用，AIOS 未返回未经验证的实时结果";
    }

    if (locale === "ja") {
      return "リアルタイムの外部証拠を利用できないため、未検証の結果は返していません";
    }

    return "Realtime external evidence is unavailable; AIOS did not return an unverified realtime result";
  }

  if (status === "completed") {
    if (locale === "zh-CN") {
      return "由 AIOS Runtime 直接完成";
    }

    if (locale === "ja") {
      return "AIOS Runtime が直接実行しました";
    }

    return "Completed directly by the AIOS Runtime";
  }

  return "";
}

function getStatusColors(
  status: RealtimeResponseStatus,
): {
  background: string;
  border: string;
  accent: string;
  text: string;
} {
  switch (status) {
    case "evidence-verified":
      return {
        background: "#ecfdf5",
        border: "#a7f3d0",
        accent: "#10b981",
        text: "#047857",
      };

    case "evidence-unverified":
      return {
        background: "#fffbeb",
        border: "#fde68a",
        accent: "#f59e0b",
        text: "#b45309",
      };

    case "failed":
      return {
        background: "#fef2f2",
        border: "#fecaca",
        accent: "#ef4444",
        text: "#b91c1c",
      };

    case "completed":
      return {
        background: "#eff6ff",
        border: "#bfdbfe",
        accent: "#3b82f6",
        text: "#1d4ed8",
      };

    default:
      return {
        background: "#f8fafc",
        border: "#e2e8f0",
        accent: "#94a3b8",
        text: "#64748b",
      };
  }
}

export default function RealtimeEvidenceDisclosure({
  active,
  status,
  capability,
  sourceCount,
  sourceHosts,
  locale,
}: Props) {
  if (
    !active ||
    status === "not-detected"
  ) {
    return null;
  }

  const colors =
    getStatusColors(status);

  const capabilityLabel =
    getCapabilityLabel(
      capability,
      locale,
    );

  const statusLabel =
    getStatusLabel(
      status,
      locale,
    );

  const disclosure =
    getDisclosureText(
      status,
      sourceCount,
      locale,
    );

  const normalizedHosts =
    Array.from(
      new Set(
        sourceHosts
          .filter(
            (
              host,
            ): host is string =>
              typeof host === "string" &&
              host.trim().length > 0,
          )
          .map(
            (host) =>
              host.trim(),
          ),
      ),
    );

  const sourceLabel =
    locale === "zh-CN"
      ? "证据来源"
      : locale === "ja"
        ? "証拠ソース"
        : "Evidence sources";

  return (
    <div
      role="status"
      aria-label={`${capabilityLabel}: ${statusLabel}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        minWidth: 0,
        maxWidth: 420,
        padding: "8px 10px",
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        background: colors.background,
        color: colors.text,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            flexShrink: 0,
            borderRadius: "50%",
            background: colors.accent,
          }}
        />

        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {capabilityLabel}
        </span>

        <span
          style={{
            width: 1,
            height: 12,
            flexShrink: 0,
            background: colors.border,
          }}
        />

        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div
        style={{
          color: colors.text,
          fontSize: 10,
          lineHeight: 1.45,
        }}
      >
        {disclosure}
      </div>

      {status === "evidence-verified" &&
        normalizedHosts.length > 0 && (
          <details
            style={{
              fontSize: 9,
              lineHeight: 1.45,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 700,
                userSelect: "none",
              }}
            >
              {sourceLabel}
            </summary>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                marginTop: 6,
              }}
            >
              {normalizedHosts.map(
                (host) => (
                  <span
                    key={host}
                    style={{
                      padding:
                        "3px 6px",
                      border:
                        `1px solid ${colors.border}`,
                      borderRadius: 6,
                      background:
                        "#ffffff",
                      color:
                        colors.text,
                      fontSize: 9,
                      fontWeight: 600,
                    }}
                  >
                    {host}
                  </span>
                ),
              )}
            </div>
          </details>
        )}
    </div>
  );
}
