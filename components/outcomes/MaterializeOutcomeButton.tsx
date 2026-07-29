"use client";

import Link from "next/link";

import {
  useState,
} from "react";

import {
  requestPlannerRefresh,
} from "@/lib/planner/events";

interface MaterializeTask {
  milestoneId:
    string;

  milestoneTitle:
    string;

  taskId:
    string;

  taskTitle:
    string;

  created:
    boolean;
}

interface MaterializeResponse {
  success:
    boolean;

  workflow?: {
    materialized:
      boolean;

    total:
      number;

    created:
      number;

    reused:
      number;

    tasks:
      MaterializeTask[];
  };

  error?:
    string;
}

interface MaterializeOutcomeButtonProps {
  outcomeId:
    string;

  outcomeTitle:
    string;

  existingTaskCount:
    number;

  onCompleted:
    () =>
      Promise<void> |
      void;
}

async function readResponse(
  response:
    Response
): Promise<MaterializeResponse> {
  let data:
    MaterializeResponse;

  try {
    data =
      (await response.json()) as
        MaterializeResponse;
  } catch {
    throw new Error(
      `服务器返回了无法解析的结果（HTTP ${response.status}）。`
    );
  }

  if (
    !response.ok ||
    !data.success
  ) {
    throw new Error(
      data.error ||
        `执行任务生成失败（HTTP ${response.status}）。`
    );
  }

  return data;
}

export default function MaterializeOutcomeButton({
  outcomeId,
  outcomeTitle,
  existingTaskCount,
  onCompleted,
}: MaterializeOutcomeButtonProps) {
  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    result,
    setResult,
  ] =
    useState<{
      total:
        number;

      created:
        number;

      reused:
        number;
    } | null>(
      null
    );

  async function materializeOutcome() {
    if (
      loading
    ) {
      return;
    }

    setLoading(
      true
    );

    setError(
      ""
    );

    setResult(
      null
    );

    try {
      const response =
        await fetch(
          "/api/outcomes/materialize",
          {
            method:
              "POST",

            cache:
              "no-store",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                outcomeId,
              }),
          }
        );

      const data =
        await readResponse(
          response
        );

      const workflow =
        data.workflow;

      if (
        !workflow
      ) {
        throw new Error(
          "服务器未返回任务生成结果。"
        );
      }

      setResult({
        total:
          workflow.total,

        created:
          workflow.created,

        reused:
          workflow.reused,
      });

      requestPlannerRefresh(
        "task-created"
      );

      await onCompleted();
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "执行任务生成失败。"
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  const alreadyMaterialized =
    existingTaskCount >
    0;

  return (
    <div
      style={{
        marginTop:
          16,

        padding:
          14,

        border:
          "1px solid #dbeafe",

        borderRadius:
          15,

        background:
          "#eff6ff",
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          gap:
            12,
        }}
      >
        <div
          style={{
            minWidth:
              0,

            flex:
              1,
          }}
        >
          <div
            style={{
              color:
                "#1d4ed8",

              fontSize:
                11,

              fontWeight:
                950,

              letterSpacing:
                "0.08em",
            }}
          >
            EXECUTION ENGINE
          </div>

          <h4
            style={{
              margin:
                "6px 0 0",

              color:
                "#0f172a",

              fontSize:
                16,
            }}
          >
            {alreadyMaterialized
              ? "执行任务已连接"
              : "将里程碑转为真实任务"}
          </h4>

          <p
            style={{
              margin:
                "5px 0 0",

              color:
                "#64748b",

              fontSize:
                12,

              lineHeight:
                1.55,
            }}
          >
            {alreadyMaterialized
              ? `当前 Outcome 已连接 ${existingTaskCount} 项任务。再次执行不会重复创建活动中的同名任务。`
              : `为「${outcomeTitle}」的每个里程碑创建一项任务，并同步到 Planner。`}
          </p>
        </div>

        <span
          aria-hidden="true"
          style={{
            fontSize:
              23,

            flexShrink:
              0,
          }}
        >
          ⚡
        </span>
      </div>

      <button
        type="button"
        disabled={
          loading
        }
        onClick={() =>
          void materializeOutcome()
        }
        style={{
          width:
            "100%",

          minHeight:
            44,

          marginTop:
            13,

          padding:
            "0 14px",

          border:
            0,

          borderRadius:
            12,

          background:
            loading
              ? "#94a3b8"
              : "#1d4ed8",

          color:
            "#ffffff",

          fontSize:
            13,

          fontWeight:
            950,

          cursor:
            loading
              ? "default"
              : "pointer",
        }}
      >
        {loading
          ? "正在生成执行任务…"
          : alreadyMaterialized
            ? "重新同步执行任务"
            : "⚡ 生成执行任务"}
      </button>

      {error && (
        <div
          style={{
            marginTop:
              10,

            padding:
              10,

            border:
              "1px solid #fecaca",

            borderRadius:
              10,

            background:
              "#fef2f2",

            color:
              "#b91c1c",

            fontSize:
              12,

            lineHeight:
              1.5,

            overflowWrap:
              "anywhere",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop:
              10,

            padding:
              11,

            border:
              "1px solid #bbf7d0",

            borderRadius:
              10,

            background:
              "#f0fdf4",

            color:
              "#166534",

            fontSize:
              12,

            lineHeight:
              1.6,
          }}
        >
          <strong>
            执行计划已同步。
          </strong>

          <div>
            共 {result.total} 项任务，新建 {result.created} 项，复用 {result.reused} 项。
          </div>

          <div
            style={{
              display:
                "flex",

              flexWrap:
                "wrap",

              gap:
                8,

              marginTop:
                9,
            }}
          >
            <Link
              href="/tasks"
              prefetch={
                false
              }
              style={{
                display:
                  "inline-flex",

                minHeight:
                  34,

                padding:
                  "0 11px",

                alignItems:
                  "center",

                border:
                  "1px solid #86efac",

                borderRadius:
                  9,

                background:
                  "#ffffff",

                color:
                  "#15803d",

                textDecoration:
                  "none",

                fontWeight:
                  850,
              }}
            >
              查看 Tasks →
            </Link>

            <Link
              href="/dashboard"
              prefetch={
                false
              }
              style={{
                display:
                  "inline-flex",

                minHeight:
                  34,

                padding:
                  "0 11px",

                alignItems:
                  "center",

                border:
                  "1px solid #86efac",

                borderRadius:
                  9,

                background:
                  "#ffffff",

                color:
                  "#15803d",

                textDecoration:
                  "none",

                fontWeight:
                  850,
              }}
            >
              查看 Planner →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}