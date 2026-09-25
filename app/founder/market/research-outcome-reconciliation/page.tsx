"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { MarketRegion } from "@/lib/runtime/market/market-types";
import type { MarketDecisionWorkspaceItem } from "@/lib/runtime/market/market-decision-workspace-types";
import type { MarketPaperTradePerformanceResult } from "@/lib/runtime/market/market-paper-trade-performance-types";
import type { MarketResearchOutcomeReconciliationResult } from "@/lib/runtime/market/market-research-outcome-reconciliation-types";

export default function Page() {
  const [session, setSession] = useState(false);
  const [symbol, setSymbol] = useState("NVDA");
  const [market, setMarket] = useState<MarketRegion>("us");
  const [decision, setDecision] = useState("");
  const [performance, setPerformance] = useState("");
  const [result, setResult] = useState<MarketResearchOutcomeReconciliationResult | null>(null);
  const [regression, setRegression] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(Boolean(sessionStorage.getItem("aios-founder-session")));
  }, []);

  async function run() {
    setError("");
    try {
      const decisionWorkspace = JSON.parse(decision) as MarketDecisionWorkspaceItem;
      const performanceReview = JSON.parse(performance) as MarketPaperTradePerformanceResult;
      const response = await fetch("/api/founder/market/research-outcome-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, market, decisionWorkspace, performanceReview }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.code || "C160 failed");
      setResult(payload);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Invalid JSON or C160 request.");
    }
  }

  async function regressionRun() {
    setError("");
    try {
      const response = await fetch("/api/founder/market/research-outcome-reconciliation?regression=true", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || payload.code || "C160 regression failed");
      setRegression(`${payload.code} · ${payload.passed}/${payload.total} checks passed`);
    } catch (value) {
      setError(value instanceof Error ? value.message : "C160 regression failed.");
    }
  }

  const box: CSSProperties = { marginTop: 18, border: "1px solid #222", borderRadius: 14, padding: 16, background: "#0d0d0d" };
  const input: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #333", borderRadius: 8, padding: 10, background: "#111", color: "#eee", fontFamily: "monospace", fontSize: 11 };

  return (
    <main style={{ minHeight: "100vh", background: "#070707", color: "#eee", padding: "38px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ color: "#777", letterSpacing: 3, fontSize: 12, fontWeight: 700 }}>PRIVATE FOUNDER ACCESS</div>
        <h1 style={{ fontSize: 40, lineHeight: 1.05, margin: "18px 0 8px", fontWeight: 800 }}>AIOS Market Research ↔ Outcome Reconciliation</h1>
        <div style={{ color: "#777", fontSize: 17, fontWeight: 700 }}>C160.1 · C157 Human Decision → C159 Historical Outcome</div>

        <section style={box}><strong>Founder Session</strong><div style={{ marginTop: 6, color: session ? "#86efac" : "#fca5a5", fontSize: 12 }}>{session ? "Founder Session detected" : "Founder Session not detected"}</div></section>

        <section style={box}>
          <h2 style={{ marginTop: 0 }}>C157 + C159 Inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} style={input} />
            <select value={market} onChange={(e) => setMarket(e.target.value as MarketRegion)} style={input}>
              <option value="us">US</option><option value="hk">HK</option><option value="cn">A-SHARE</option>
            </select>
          </div>
          <textarea value={decision} onChange={(e) => setDecision(e.target.value)} placeholder={'Paste actual C157 "workspace item" JSON here.'} rows={8} style={{ ...input, marginTop: 10 }} />
          <textarea value={performance} onChange={(e) => setPerformance(e.target.value)} placeholder="Paste actual C159 performance review JSON here." rows={8} style={{ ...input, marginTop: 10 }} />
          <button disabled={!session || !decision || !performance} onClick={run} style={{ marginTop: 10, padding: "10px 15px", border: "1px solid #444", borderRadius: 9, background: "#151515", color: "#eee" }}>Run Reconciliation</button>
          {error && <div style={{ marginTop: 10, color: "#fca5a5", fontSize: 12 }}>{error}</div>}
        </section>

        {result && <section style={box}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{result.symbol}</div>
          <div style={{ color: "#777", marginTop: 4 }}>C160.1 · {result.state}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginTop: 15 }}>
            <div style={{ border: "1px solid #222", padding: 10 }}>Decision: {result.reconciliation.decisionState}</div>
            <div style={{ border: "1px solid #222", padding: 10 }}>Review: {result.reconciliation.decisionReviewStatus}</div>
            <div style={{ border: "1px solid #222", padding: 10 }}>Net: {result.reconciliation.netProfit.toFixed(2)}</div>
            <div style={{ border: "1px solid #222", padding: 10 }}>Return: {result.reconciliation.totalReturnPercent.toFixed(2)}%</div>
            <div style={{ border: "1px solid #222", padding: 10 }}>Drawdown: {result.reconciliation.maxDrawdown.toFixed(2)}</div>
            <div style={{ border: "1px solid #222", padding: 10 }}>Filled: {result.reconciliation.filledOrders}</div>
            <div style={{ border: "1px solid #222", padding: 10 }}>Rejected: {result.reconciliation.rejectedOrders}</div>
            <div style={{ border: "1px solid #222", padding: 10 }}>Open: {result.reconciliation.openPositions}</div>
          </div>
          <h3 style={{ marginTop: 22 }}>Invalidation Conditions — Human Review</h3>
          {result.conditionReviews.map((item, i) => <div key={i} style={{ border: "1px solid #222", borderRadius: 8, padding: 10, marginTop: 8, color: "#aaa", fontSize: 12 }}>{item.condition}</div>)}
          <h3 style={{ marginTop: 22 }}>Findings</h3>
          {result.findings.map((item, i) => <div key={i} style={{ border: "1px solid #222", borderRadius: 8, padding: 10, marginTop: 8 }}><strong>{item.title}</strong><div style={{ color: "#888", fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>{item.observation}</div></div>)}
          <div style={{ marginTop: 16, color: "#777", fontSize: 11, lineHeight: 1.6 }}>C160 does not decide whether the research thesis was correct or incorrect. It preserves invalidation conditions for human review and reports historical C159 outcomes without predicting future performance or generating trading recommendations.</div>
        </section>}

        <section style={box}>
          <strong>C160.1 Runtime Regression</strong>
          <div style={{ color: "#666", fontSize: 11, marginTop: 5 }}>C157 → C159 → Reconciliation → Human Review Boundary</div>
          <button disabled={!session} onClick={regressionRun} style={{ marginTop: 12, padding: "10px 14px", border: "1px solid #333", borderRadius: 9, background: "transparent", color: "#ddd" }}>Run Regression</button>
          {regression && <div style={{ marginTop: 12, color: "#86efac", fontSize: 12 }}>{regression}</div>}
        </section>

        <footer style={{ marginTop: 18, color: "#555", fontSize: 11, lineHeight: 1.7 }}>C157 Human Decision → C158 Paper Trade Gate → C151 Paper Trading → C159 Performance Review → C160 Research ↔ Outcome Reconciliation → C152 Live Trading Boundary.</footer>
      </div>
    </main>
  );
}
