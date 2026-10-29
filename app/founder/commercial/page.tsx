"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const FOUNDER_STORAGE_KEY = "aios-founder-access-key";

const stages = [
  ["01", "ACQUISITION", "Inbound Growth", "生成获客方案、内容机会和 Founder 人工发布执行包。", "/founder/inbound-growth", "进入获客工作台", "不自动发布、不自动私信、不自动投放。"],
  ["02", "QUALIFICATION", "Lead Qualification", "记录真实询盘、评分、生成回复草稿，并由 Founder 决定是否转为成交。", "/founder/inbound-growth", "进入询盘队列", "评分只用于优先级，不代表真实成交。"],
  ["03", "REVENUE", "Revenue Execution", "把已成交询盘交接到报价、订单、交付与人工收款记录。", "/founder/revenue", "进入收入账本", "不自动创建订单、不自动确认金额、不自动记录到账。"],
  ["04", "CLOSURE", "Revenue Closure", "复核待收款、交付完成度、结算闭环与收入记录一致性。", "/founder/revenue", "进入闭环控制中心", "不自动改状态、不自动退款、不跨币种合计。"],
] as const;

function panel(): CSSProperties {
  return { border: "1px solid #27272a", borderRadius: 16, padding: 18, background: "#111114" };
}

function link(primary = false): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40,
    padding: "0 14px", border: "1px solid #52525b", borderRadius: 9,
    background: primary ? "#f4f4f5" : "#202024", color: primary ? "#09090b" : "#f4f4f5",
    textDecoration: "none", fontSize: 13, fontWeight: 700,
  };
}

export default function FounderCommercialPage() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const sync = () => setAuthorized(Boolean(window.sessionStorage.getItem(FOUNDER_STORAGE_KEY)?.trim()));
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!authorized) {
    return (
      <main style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", padding: 24 }}>
        <div style={{ maxWidth: 760, margin: "80px auto", ...panel() }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: 1.4 }}>C168.18 · FOUNDER ONLY</div>
          <h1 style={{ margin: "10px 0 8px", fontSize: 28 }}>Commercial Operating Center</h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.8, fontSize: 13 }}>未检测到 Founder Session。请先进入 Founder Console 完成授权。</p>
          <Link href="/founder" style={link(true)}>返回 Founder Console</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", padding: "24px 18px 60px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header style={{ marginBottom: 22 }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: 1.4 }}>C168.18 · FOUNDER ONLY</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-end", flexWrap: "wrap", marginTop: 8 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 30 }}>Commercial Operating Center</h1>
              <p style={{ margin: "8px 0 0", color: "#a1a1aa", fontSize: 13, lineHeight: 1.8 }}>
                AIOS Founder 商业主链路：获客 → 询盘 → 成交交接 → 订单 / 交付 / 收款 → 闭环复核。
              </p>
            </div>
            <Link href="/founder" style={link()}>Founder Console</Link>
          </div>
        </header>

        <section style={{ ...panel(), marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[["获客入口", "Inbound Growth"], ["真实询盘", "Lead Queue"], ["成交交接", "C168 Revenue Handoff"], ["收入闭环", "Revenue Control"]].map(([label, value]) => (
              <div key={label} style={{ border: "1px solid #3f3f46", borderRadius: 11, padding: 13 }}>
                <div style={{ color: "#71717a", fontSize: 11 }}>{label}</div>
                <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
          {stages.map(([index, stage, title, description, href, action, boundary]) => (
            <article key={index} style={panel()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: "#71717a", fontSize: 12 }}>{index}</span>
                <span style={{ color: "#a1a1aa", fontSize: 11 }}>{stage}</span>
              </div>
              <h2 style={{ margin: "12px 0 8px", fontSize: 19 }}>{title}</h2>
              <p style={{ minHeight: 64, margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.75 }}>{description}</p>
              <div style={{ marginTop: 14 }}><Link href={href} style={link(index === "01" || index === "03")}>{action}</Link></div>
              <p style={{ margin: "14px 0 0", color: "#71717a", fontSize: 11, lineHeight: 1.7 }}>{boundary}</p>
            </article>
          ))}
        </section>

        <section style={{ ...panel(), marginTop: 16, background: "#0c0c0f" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>C168.18 边界</h2>
          <p style={{ margin: 0, color: "#a1a1aa", fontSize: 12, lineHeight: 1.9 }}>
            本版本不继续修改 app/founder/revenue/page.tsx，而是新增 Founder 商业操作中心，复用现有 Inbound Growth 与 Revenue 能力形成清晰入口。
            不新增 API，不修改 Store，不修改现有数据类型，不复制收入账本逻辑，不执行外部发布、联系、付款或自动状态变更。
          </p>
        </section>
      </div>
    </main>
  );
}
