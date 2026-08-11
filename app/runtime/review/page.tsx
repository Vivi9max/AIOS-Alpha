"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { ExecutionReview } from "@/lib/planner/execution-review";

interface ReviewResponse { success: boolean; review?: ExecutionReview; error?: string }

export default function ExecutionReviewPage() {
  const { locale } = useLanguage();
  const copy = {
    en: { title: "Execution Review", description: "Turn execution evidence into the next improvement action.", analyzing: "Analyzing…", analyze: "Analyze again", error: "Execution review could not be loaded.", score: "Health score", allowedRate: "Allowed rate", completion: "Completion conversion", trend: "Recent trend", samples: "Evidence samples", priority: "SINGLE PRIORITY ACTION", reason: "Primary block reason:", act: "Execute priority action", evidence: "View source evidence", nav: "Review related pages", health: { "insufficient-data": "Build baseline", healthy: "Healthy", watch: "Watch", blocked: "Blocked" }, trends: { "insufficient-data": "Insufficient data", improving: "Improving", stable: "Stable", declining: "Declining" } },
    "zh-CN": { title: "执行复盘", description: "把执行证据转化为下一项改进行动。", analyzing: "分析中…", analyze: "重新分析", error: "执行复盘读取失败。", score: "健康分", allowedRate: "允许率", completion: "完成转化", trend: "近期趋势", samples: "证据样本", priority: "唯一优先动作", reason: "主要阻止原因：", act: "执行优先动作", evidence: "查看原始证据", nav: "复盘相关页面", health: { "insufficient-data": "建立基线", healthy: "健康", watch: "需关注", blocked: "受阻" }, trends: { "insufficient-data": "数据不足", improving: "正在改善", stable: "保持稳定", declining: "正在下降" } },
    ja: { title: "実行レビュー", description: "実行証拠を次の改善アクションへ変換します。", analyzing: "分析中…", analyze: "再分析", error: "実行レビューを読み込めませんでした。", score: "健全性スコア", allowedRate: "許可率", completion: "完了転換率", trend: "最近の傾向", samples: "証拠サンプル", priority: "最優先アクション", reason: "主なブロック理由：", act: "優先アクションを実行", evidence: "元の証拠を見る", nav: "レビュー関連ページ", health: { "insufficient-data": "基準を構築", healthy: "健全", watch: "要注意", blocked: "ブロック" }, trends: { "insufficient-data": "データ不足", improving: "改善中", stable: "安定", declining: "低下中" } },
  }[locale];
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/planner/review", { cache: "no-store" });
      setData(await response.json() as ReviewResponse);
    } catch {
      setData({ success: false, error: copy.error });
    } finally {
      setLoading(false);
    }
  }, [copy.error]);

  useEffect(() => { void load(); }, [load]);
  const review = data?.review;

  return (
    <WorkspaceShell>
      <main style={{ width: "100%", maxWidth: 900, margin: "0 auto", color: "#111827" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <p style={{ margin: 0, color: "#7c3aed", fontSize: 12, fontWeight: 800, letterSpacing: ".12em" }}>EXECUTION REVIEW</p>
            <h1 style={{ margin: "7px 0 0", fontSize: 30 }}>{copy.title}</h1>
            <p style={{ margin: "9px 0 0", color: "#64748b", lineHeight: 1.6 }}>{copy.description}</p>
          </div>
          <button type="button" aria-label="重新生成执行复盘" onClick={() => void load()} disabled={loading} style={{ minHeight: 42, padding: "0 16px", border: 0, borderRadius: 12, background: "#111827", color: "white", fontWeight: 700 }}>
            {loading ? copy.analyzing : copy.analyze}
          </button>
        </header>

        {!data?.success && data?.error && <p role="alert" style={{ padding: 14, borderRadius: 12, background: "#fef2f2", color: "#b91c1c" }}>{data.error}</p>}

        {review && <>
          <section style={{ padding: 22, border: "1px solid #ddd6fe", borderRadius: 20, background: "linear-gradient(135deg,#faf5ff,#fff)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <span style={{ display: "inline-block", padding: "5px 10px", borderRadius: 999, background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 800 }}>{copy.health[review.health]}</span>
                <h2 style={{ margin: "12px 0 6px", fontSize: 23 }}>{review.headline}</h2>
                <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>{review.insight}</p>
              </div>
              <div aria-label={`执行健康分 ${review.score}`} style={{ minWidth: 90, textAlign: "center" }}>
                <strong style={{ display: "block", fontSize: 38 }}>{review.score}</strong>
                <span style={{ color: "#64748b", fontSize: 12 }}>{copy.score}</span>
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, margin: "14px 0" }}>
            {[[copy.allowedRate, `${review.allowedRate}%`], [copy.completion, `${review.completionRate}%`], [copy.trend, copy.trends[review.trend]], [copy.samples, review.sampleSize]].map(([label, value]) =>
              <div key={String(label)} style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" }}><strong style={{ display: "block", fontSize: 22 }}>{value}</strong><span style={{ color: "#64748b", fontSize: 13 }}>{label}</span></div>
            )}
          </section>

          <section style={{ padding: 20, borderRadius: 18, background: "#111827", color: "white" }}>
            <p style={{ margin: 0, color: "#c4b5fd", fontSize: 12, fontWeight: 800, letterSpacing: ".1em" }}>{copy.priority}</p>
            <h2 style={{ margin: "10px 0 0", fontSize: 21, lineHeight: 1.5 }}>{review.priorityAction}</h2>
            {review.primaryBlockCode && <p style={{ margin: "10px 0 0", color: "#94a3b8", fontSize: 12 }}>{copy.reason}{review.primaryBlockCode}</p>}
          </section>

          <nav aria-label={copy.nav} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <Link href="/tasks" style={{ padding: "11px 15px", borderRadius: 12, background: "#7c3aed", color: "white", textDecoration: "none", fontWeight: 700 }}>{copy.act}</Link>
            <Link href="/runtime/ledger" style={{ padding: "11px 15px", borderRadius: 12, border: "1px solid #cbd5e1", color: "#334155", textDecoration: "none", fontWeight: 700 }}>{copy.evidence}</Link>
          </nav>
        </>}
      </main>
    </WorkspaceShell>
  );
}
