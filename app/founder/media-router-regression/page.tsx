"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aios-founder-access-key";

type Result = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  latencyMs?: number;
  environment?: { geminiConfigured?: boolean; openAIConfigured?: boolean };
  automaticRoute?: { provider?: string; fallback?: boolean; model?: string };
  checks?: Record<string, boolean>;
};

export default function FounderMediaRouterRegressionPage() {
  const [result,setResult]=useState<Result|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function run() {
    setLoading(true); setError(""); setResult(null);
    const key=window.sessionStorage.getItem(STORAGE_KEY)?.trim() ?? "";
    if(!key){
      setError("未检测到 Founder Console 会话。请先进入 /founder 完成 Founder 登录。");
      setLoading(false); return;
    }
    try {
      const r=await fetch("/api/founder/media/regression",{
        method:"GET",cache:"no-store",
        headers:{Accept:"application/json",Authorization:`Bearer ${key}`}
      });
      const data=(await r.json()) as Result;
      setResult(data);
      if(!r.ok || data.success!==true) setError(data.message ?? `Regression failed (HTTP ${r.status}).`);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Media Router regression request failed.");
    } finally { setLoading(false); }
  }

  useEffect(()=>{void run();},[]);

  const pass=result?.success===true &&
    result?.verified===true &&
    result?.code==="C146_17_MEDIA_ROUTER_REGRESSION_PASS";

  return (
    <main style={{minHeight:"100vh",padding:"24px 18px 60px",boxSizing:"border-box",background:"#f4f6fb",color:"#0f172a"}}>
      <div style={{maxWidth:900,width:"100%",margin:"0 auto"}}>
        <div style={{color:"#2563eb",fontSize:12,fontWeight:950,letterSpacing:"0.14em"}}>PRIVATE FOUNDER ACCESS</div>
        <h1 style={{margin:"8px 0 0",fontSize:30}}>Media Generation Router</h1>
        <p style={{margin:"9px 0 0",color:"#64748b"}}>C146.17 Live Router Regression</p>

        <section style={{marginTop:22,padding:20,border:"1px solid #dbe3f0",borderRadius:22,background:"#fff"}}>
          <div style={{fontWeight:900,fontSize:17}}>Chat Prompt → Media Router → Provider</div>
          <p style={{margin:"8px 0 0",color:"#64748b",lineHeight:1.6}}>
            页面自动使用 Founder Console 会话中的 Access Key，不要求再次输入。
          </p>
          <button type="button" onClick={()=>void run()} disabled={loading}
            style={{width:"100%",minHeight:52,marginTop:18,border:0,borderRadius:15,background:loading?"#94a3b8":"#0f172a",color:"#fff",fontSize:16,fontWeight:900}}>
            {loading?"正在执行 Media Router 回归验证…":"▶ Run C146.17 Regression"}
          </button>
          {error && <div style={{marginTop:14,padding:14,borderRadius:14,background:"#fff1f2",color:"#be123c"}}>{error}</div>}
        </section>

        {result && <section style={{marginTop:18,padding:20,borderRadius:22,background:"#fff",border:pass?"1px solid #86efac":"1px solid #fecaca"}}>
          <div style={{fontSize:21,fontWeight:950,color:pass?"#166534":"#b91c1c"}}>
            {pass?"✓ C146.17 MEDIA ROUTER REGRESSION PASS":"✕ C146.17 MEDIA ROUTER REGRESSION FAILED"}
          </div>
          <div style={{marginTop:7,color:"#64748b",fontSize:13}}>{result.code ?? "UNKNOWN"}{typeof result.latencyMs==="number"?` · ${result.latencyMs} ms`:""}</div>
          <div style={{display:"grid",gap:10,marginTop:18}}>
            {Object.entries(result.checks ?? {}).map(([k,v])=><Row key={k} label={k} value={v?"PASSED":"FAILED"}/>)}
            <Row label="Gemini" value={result.environment?.geminiConfigured?"CONFIGURED":"NOT CONFIGURED"}/>
            <Row label="Automatic Provider" value={result.automaticRoute?.provider ?? "unknown"}/>
            <Row label="Automatic Fallback" value={result.automaticRoute?.fallback?"YES":"NO"}/>
          </div>
          <details style={{marginTop:18}}><summary>查看完整 Regression JSON</summary>
            <pre style={{marginTop:12,padding:14,overflowX:"auto",borderRadius:14,background:"#0f172a",color:"#e2e8f0",fontSize:12,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
              {JSON.stringify(result,null,2)}
            </pre>
          </details>
        </section>}
      </div>
    </main>
  );
}

function Row({label,value}:{label:string;value:string}) {
  return <div style={{display:"flex",justifyContent:"space-between",gap:16,padding:"11px 13px",borderRadius:13,background:"#f8fafc"}}>
    <span style={{fontSize:13,color:"#475569"}}>{label}</span><strong style={{fontSize:12}}>{value}</strong>
  </div>;
}
