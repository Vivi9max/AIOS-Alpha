import "server-only";
import { NextResponse } from "next/server";
import { dispatchGitHubTask, type GitHubTaskRequest } from "@/lib/github/task-dispatch";
import { createFounderDevelopmentContract } from "@/lib/github/founder-development-contract";
import {
  createExecutionJob,
  markExecutionJobRunning,
  markExecutionJobCompleted,
  markExecutionJobFailed,
} from "@/lib/jobs/execution-job";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, path, content, commitMessage, objective } = body;

    // Build contract via factory, never hand‑write literal contract bypassing types
    const contract = createFounderDevelopmentContract({
      objective,
      requestedFiles: [path], // C141.10 bind current path into requestedFiles
      actions: ["read", "write", "verify"],
      verification: {
        required: true,
        checks: ["readback", "build", "production"],
      },
      commitMessage,
    });

    const jobId = await createExecutionJob();
    await markExecutionJobRunning(jobId, {
      founderContract: {
        version: contract.version,
        repository: "Vivi9max/AIOS‑Alpha",
        branch: "main",
        action,
        path,
        verificationChecks: contract.verification.checks,
      },
      contractEnforced: true,
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

    if (result.success) {
      await markExecutionJobCompleted(jobId, {
        result,
        founderContract: {
          version: contract.version,
          repository: "Vivi9max/AIOS‑Alpha",
          branch: "main",
          action,
          path,
          verificationChecks: contract.verification.checks,
        },
        contractEnforced: true,
      });
    } else {
      await markExecutionJobFailed(jobId, {
        error: result.error,
        result,
        founderContract: {
          version: contract.version,
          repository: "Vivi9max/AIOS‑Alpha",
          branch: "main",
          action,
          path,
          verificationChecks: contract.verification.checks,
        },
        contractEnforced: true,
      });
    }

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
