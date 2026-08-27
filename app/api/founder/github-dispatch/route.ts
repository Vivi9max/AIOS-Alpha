import "server-only";
import { NextResponse } from "next/server";
import { dispatchGitHubTask, type GitHubTaskRequest } from "@/lib/github/task-dispatch";
import { createFounderDevelopmentContract } from "@/lib/github/founder-development-contract";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, path, content, commitMessage, objective } = body;

    // 通过工厂创建合约，禁止手写绕过类型系统
    const contract = createFounderDevelopmentContract({
      objective,
      requestedFiles: [path],
      actions: ["read", "write", "verify"],
      verification: {
        required: true,
        checks: ["readback", "build", "production"],
      },
      commitMessage,
    });

    const dispatchReq: GitHubTaskRequest = {
      action,
      repo: "Vivi9max/AIOS‑Alpha",
      branch: "main",
      path,
      content,
      commitMessage,
      contract,
    };

    const result = await dispatchGitHubTask(dispatchReq);

    const httpStatus = result.code === "FOUNDER_CONTRACT_REJECTED" ? 403 : 200;
    return NextResponse.json(result, { status: httpStatus });
  } catch (rootErr) {
    return NextResponse.json(
      {
        success: false,
        code: "FOUNDER_CONTRACT_REJECTED",
        error: rootErr instanceof Error ? rootErr.message : "Unknown dispatch error",
      },
      { status: 403 }
    );
  }
}
