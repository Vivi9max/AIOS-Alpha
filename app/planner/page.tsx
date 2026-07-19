"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

import {
  PLANNER_PLACEHOLDER,
  PLANNER_PRESETS,
} from "@/lib/planner/presets";

interface PlannerPlan {
  id: string;
  type: string;
  goal: string;
  intent: string;
  confidence: number;
  capabilities: string[];
  steps: string[];
}

interface PlannerExecution {
  requestId: string;
  provider: string;
  fallbackUsed: boolean;
  content: string;
  latencyMs: number;
  status?: string;
  capabilityTrace?: string[];
}

interface PlannerWorkflowTask {
  id: string;
  title: string;
  status: string;
  created: boolean;
}

interface PlannerWorkflow {
  status: string;
  createdCount: number;
  reusedCount: number;
  taskCount: number;
  tasks: PlannerWorkflowTask[];
}

interface PlannerGoalQuality {
  score: number;
  level:
    | "basic"
    | "clear"
    | "strong";
  hasResult: boolean;
  hasDeadline: boolean;
  hasSuccessMetric: boolean;
  hasConstraint: boolean;
}

interface PlannerAnalysis {
  goalQuality?: PlannerGoalQuality;
  complexity?:
    | "low"
    | "medium"
    | "high";
  stageCount?: number;
  capabilityCount?: number;
}

interface PlannerResponse {
  success: boolean;
  mode?: "plan" | "execute";
  plan?: PlannerPlan;
  execution?: PlannerExecution | null;
  workflow?: PlannerWorkflow | null;
  analysis?: PlannerAnalysis;
  latencyMs?: number;
  error?: string;
  code?: string;
}

interface PlannerHistoryItem {
  id: string;
  goal: string;
  mode: "plan" | "execute";
  createdAt: number;
  provider?: string;
  latencyMs?: number;
}

const MAX_GOAL_LENGTH = 1000;

const HISTORY_KEY =
  "aios-alpha:planner-history";

export default function PlannerPage() {
  const [goal, setGoal] =
    useState("");

  const [result, setResult] =
    useState<PlannerResponse | null>(
      null
    );

  const [loadingMode, setLoadingMode] =
    useState<
      "plan" | "execute" | null
    >(null);

  const [history, setHistory] =
    useState<
      PlannerHistoryItem[]
    >([]);

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(
          HISTORY_KEY
        );

      if (!raw) {
        return;
      }

      const parsed =
        JSON.parse(
          raw
        ) as PlannerHistoryItem[];

      if (Array.isArray(parsed)) {
        setHistory(
          parsed.slice(0, 6)
        );
      }
    } catch {
      setHistory([]);
    }
  }, []);

  const goalQuality =
    useMemo(() => {
      const cleanGoal =
        goal.trim();

      if (!cleanGoal) {
        return {
          label:
            "等待目标",
          color:
            "#94a3b8",
          score: 0,
        };
      }

      let score = 1;

      if (
        cleanGoal.length >=
        40
      ) {
        score += 1;
      }

      if (
        /天|周|月|小时|日期|期限|之前|以内|截止/.test(
          cleanGoal
        )
      ) {
        score += 1;
      }

      if (
        /至少|完成|获得|达到|成功|标准|指标|结果|验证/.test(
          cleanGoal
        )
      ) {
        score += 1;
      }

      if (
        /限制|预算|成本|时间|不能|必须|优先|资源|风险/.test(
          cleanGoal
        )
      ) {
        score += 1;
      }

      if (score >= 5) {
        return {
          label:
            "目标清晰",
          color:
            "#22c55e",
          score,
        };
      }

      if (score >= 3) {
        return {
          label:
            "可以规划",
          color:
            "#60a5fa",
          score,
        };
      }

      return {
        label:
          "建议补充细节",
        color:
          "#f59e0b",
        score,
      };
    }, [goal]);

  async function runPlanner(
    mode:
      | "plan"
      | "execute"
  ) {
    const cleanGoal =
      goal.trim();

    if (!cleanGoal) {
      setResult({
        success: false,
        error:
          "请输入希望 AIOS 最终完成的目标。",
      });

      return;
    }

    setLoadingMode(mode);
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/planner",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                goal:
                  cleanGoal,
                mode,
              }),
          }
        );

      const data =
        (await response.json()) as
          PlannerResponse;

      setResult(data);

      if (
        response.ok &&
        data.success
      ) {
        saveHistory({
          id:
            data.plan?.id ??
            data.execution
              ?.requestId ??
            `${Date.now()}`,

          goal:
            cleanGoal,

          mode,

          createdAt:
            Date.now(),

          provider:
            data.execution
              ?.provider,

          latencyMs:
            data.execution
              ?.latencyMs ??
            data.latencyMs,
        });
      }
    } catch {
      setResult({
        success: false,

        error:
          "无法连接 Planner Engine，请稍后重试。",
      });
    } finally {
      setLoadingMode(null);
    }
  }

  function saveHistory(
    item: PlannerHistoryItem
  ) {
    setHistory(
      (current) => {
        const next = [
          item,

          ...current.filter(
            (existing) =>
              existing.goal !==
              item.goal
          ),
        ].slice(0, 6);

        try {
          window.localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(
              next
            )
          );
        } catch {
          // 本地历史失败不能阻断 Planner。
        }

        return next;
      }
    );
  }

  function selectGoal(
    value: string
  ) {
    setGoal(
      value.slice(
        0,
        MAX_GOAL_LENGTH
      )
    );

    setResult(null);

    window.requestAnimationFrame(
      () => {
        document
          .getElementById(
            "planner-goal"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "center",
          });
      }
    );
  }

  function clearHistory() {
    setHistory([]);

    try {
      window.localStorage.removeItem(
        HISTORY_KEY
      );
    } catch {
      // 不阻断页面。
    }
  }

  return (
    <WorkspaceShell>
      <main style={pageStyle}>
        <header
          style={{
            marginBottom: 24,
          }}
        >
          <p style={eyebrowStyle}>
            AIOS BRAIN ENGINE
          </p>

          <h1 style={titleStyle}>
            🧭 Strategic Planner
          </h1>

          <p style={subtitleStyle}>
            描述你希望得到的最终结果。Planner
            将理解目标、拆解阶段、选择能力，并在需要时调度
            Runtime 执行。
          </p>

          <div
            style={
              headerLinksStyle
            }
          >
            <Link
              href="/runtime"
              style={
                headerLinkStyle
              }
            >
              ⚡ Runtime 状态
            </Link>

            <Link
              href="/runtime/trace"
              style={
                headerLinkStyle
              }
            >
              📍 Execution
              Trace
            </Link>
          </div>
        </header>

        <section
          style={goalPanelStyle}
        >
          <div
            style={
              goalHeadingRowStyle
            }
          >
            <div
              style={{
                minWidth: 0,
              }}
            >
              <label
                htmlFor="planner-goal"
                style={
                  goalLabelStyle
                }
              >
                你希望 AIOS
                最终完成什么？
              </label>

              <p
                style={
                  goalHelpStyle
                }
              >
                描述最终结果，而不是只输入一个动作。目标越明确，执行路线越准确。
              </p>
            </div>

            <span
              style={{
                ...goalStatusStyle,

                color:
                  goalQuality.color,

                borderColor:
                  `${goalQuality.color}66`,

                background:
                  `${goalQuality.color}18`,
              }}
            >
              {
                goalQuality.label
              }
            </span>
          </div>

          <textarea
            id="planner-goal"
            value={goal}
            maxLength={
              MAX_GOAL_LENGTH
            }
            onChange={(
              event
            ) => {
              setGoal(
                event.target.value
              );

              setResult(null);
            }}
            placeholder={
              PLANNER_PLACEHOLDER
            }
            rows={7}
            style={textareaStyle}
          />

          <div
            style={goalMetaStyle}
          >
            <span>
              建议包含：最终结果
              · 时间范围 ·
              成功标准 ·
              已知限制
            </span>

            <span>
              {goal.length}/
              {
                MAX_GOAL_LENGTH
              }
            </span>
          </div>

          <div
            style={
              qualityChecklistStyle
            }
          >
            <QualityItem
              ready={
                goal.trim()
                  .length >= 20
              }
              label="最终结果"
            />

            <QualityItem
              ready={/天|周|月|小时|日期|期限|之前|以内|截止/.test(
                goal
              )}
              label="时间范围"
            />

            <QualityItem
              ready={/至少|完成|获得|达到|成功|标准|指标|结果|验证/.test(
                goal
              )}
              label="成功标准"
            />

            <QualityItem
              ready={/限制|预算|成本|时间|不能|必须|优先|资源|风险/.test(
                goal
              )}
              label="限制条件"
            />
          </div>

          <div
            style={actionGridStyle}
          >
            <button
              type="button"
              disabled={
                loadingMode !==
                null
              }
              onClick={() =>
                void runPlanner(
                  "plan"
                )
              }
              style={{
                ...secondaryButtonStyle,

                opacity:
                  loadingMode !==
                  null
                    ? 0.65
                    : 1,
              }}
            >
              {loadingMode ===
              "plan"
                ? "正在生成计划…"
                : "仅生成计划"}
            </button>

            <button
              type="button"
              disabled={
                loadingMode !==
                null
              }
              onClick={() =>
                void runPlanner(
                  "execute"
                )
              }
              style={{
                ...primaryButtonStyle,

                opacity:
                  loadingMode !==
                  null
                    ? 0.65
                    : 1,
              }}
            >
              {loadingMode ===
              "execute"
                ? "正在规划并执行…"
                : "规划并执行"}
            </button>
          </div>
        </section>

        <section
          style={sectionStyle}
        >
          <div
            style={
              sectionHeaderStyle
            }
          >
            <div>
              <p
                style={
                  sectionEyebrowStyle
                }
              >
                QUICK START
              </p>

              <h2
                style={
                  sectionTitleStyle
                }
              >
                快速目标
              </h2>
            </div>

            <span
              style={
                sectionHintStyle
              }
            >
              点击即可载入
            </span>
          </div>

          <div
            style={
              presetGridStyle
            }
          >
            {PLANNER_PRESETS.map(
              (preset) => (
                <button
                  key={
                    preset.id
                  }
                  type="button"
                  onClick={() =>
                    selectGoal(
                      preset.goal
                    )
                  }
                  style={
                    presetCardStyle
                  }
                >
                  <span
                    style={
                      presetIconStyle
                    }
                  >
                    {preset.icon}
                  </span>

                  <span
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={
                        presetCategoryStyle
                      }
                    >
                      {formatCategory(
                        preset.category
                      )}
                    </span>

                    <strong
                      style={
                        presetTitleStyle
                      }
                    >
                      {
                        preset.title
                      }
                    </strong>

                    <span
                      style={
                        presetDescriptionStyle
                      }
                    >
                      {
                        preset.description
                      }
                    </span>
                  </span>
                </button>
              )
            )}
          </div>
        </section>

        {loadingMode && (
          <ExecutionLoading
            mode={
              loadingMode
            }
          />
        )}

        {result && (
          <section
            style={
              resultSectionStyle
            }
          >
            {!result.success ? (
              <div
                style={
                  errorCardStyle
                }
              >
                <strong>
                  Planner
                  未完成本次请求
                </strong>

                <p
                  style={{
                    margin:
                      "8px 0 0",

                    lineHeight:
                      1.6,
                  }}
                >
                  {result.error ??
                    "Planner 执行失败。"}
                </p>
              </div>
            ) : (
              <PlannerResult
                result={result}
              />
            )}
          </section>
        )}

        <section
          style={sectionStyle}
        >
          <div
            style={
              sectionHeaderStyle
            }
          >
            <div>
              <p
                style={
                  sectionEyebrowStyle
                }
              >
                PRIVATE LOCAL
                HISTORY
              </p>

              <h2
                style={
                  sectionTitleStyle
                }
              >
                最近计划
              </h2>
            </div>

            {history.length >
              0 && (
              <button
                type="button"
                onClick={
                  clearHistory
                }
                style={
                  clearHistoryButtonStyle
                }
              >
                清除
              </button>
            )}
          </div>

          <p
            style={
              privacyHintStyle
            }
          >
            最近计划仅保存在当前设备浏览器中。避免输入密码、证件号码、银行卡信息或其他敏感资料。
          </p>

          {history.length ===
          0 ? (
            <div
              style={
                emptyHistoryStyle
              }
            >
              <strong>
                尚无 Planner
                历史
              </strong>

              <p
                style={{
                  margin:
                    "7px 0 0",

                  color:
                    "#64748b",

                  lineHeight:
                    1.55,
                }}
              >
                完成一次生成计划或规划并执行后，最近记录会显示在这里。
              </p>
            </div>
          ) : (
            <div
              style={{
                display:
                  "grid",

                gap: 10,
              }}
            >
              {history.map(
                (item) => (
                  <button
                    key={`${item.id}-${item.createdAt}`}
                    type="button"
                    onClick={() =>
                      selectGoal(
                        item.goal
                      )
                    }
                    style={
                      historyCardStyle
                    }
                  >
                    <span
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <strong
                        style={
                          historyGoalStyle
                        }
                      >
                        {
                          item.goal
                        }
                      </strong>

                      <span
                        style={
                          historyMetaStyle
                        }
                      >
                        {formatHistoryTime(
                          item.createdAt
                        )}{" "}
                        ·{" "}
                        {item.mode ===
                        "execute"
                          ? "已执行"
                          : "已规划"}

                        {item.provider
                          ? ` · ${item.provider}`
                          : ""}

                        {typeof item.latencyMs ===
                        "number"
                          ? ` · ${item.latencyMs}ms`
                          : ""}
                      </span>
                    </span>

                    <span
                      style={
                        historyArrowStyle
                      }
                    >
                      →
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </section>
      </main>
    </WorkspaceShell>
  );
}

function ExecutionLoading({
  mode,
}: {
  mode:
    | "plan"
    | "execute";
}) {
  const stages =
    mode === "execute"
      ? [
          "理解目标",
          "生成计划",
          "选择能力",
          "调用 Runtime",
          "创建任务",
        ]
      : [
          "理解目标",
          "分析限制",
          "生成计划",
          "整理执行路线",
        ];

  return (
    <section
      style={
        loadingSectionStyle
      }
    >
      <div
        style={
          loadingHeaderStyle
        }
      >
        <div>
          <p
            style={
              sectionEyebrowStyle
            }
          >
            EXECUTION
            PROGRESS
          </p>

          <h2
            style={
              loadingTitleStyle
            }
          >
            {mode ===
            "execute"
              ? "正在规划并执行"
              : "正在生成计划"}
          </h2>
        </div>

        <span
          style={
            runningBadgeStyle
          }
        >
          RUNNING
        </span>
      </div>

      <div
        style={
          progressTrackStyle
        }
      >
        <span
          style={
            progressBarStyle
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 9,
          marginTop: 16,
        }}
      >
        {stages.map(
          (
            stage,
            index
          ) => (
            <div
              key={stage}
              style={
                loadingStageStyle
              }
            >
              <span
                style={
                  loadingStageNumberStyle
                }
              >
                {index + 1}
              </span>

              <span>
                {stage}
              </span>

              <span
                style={{
                  marginLeft:
                    "auto",

                  color:
                    index === 0
                      ? "#2563eb"
                      : "#94a3b8",
                }}
              >
                {index === 0
                  ? "处理中"
                  : "等待"}
              </span>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function PlannerResult({
  result,
}: {
  result: PlannerResponse;
}) {
  const plan =
    result.plan;

  const execution =
    result.execution;

  const workflow =
    result.workflow;

  return (
    <>
      <div
        style={
          resultHeaderStyle
        }
      >
        <div>
          <p
            style={
              sectionEyebrowStyle
            }
          >
            PLANNER OUTPUT
          </p>

          <h2
            style={
              resultTitleStyle
            }
          >
            {result.mode ===
            "execute"
              ? "计划已生成并执行"
              : "执行计划已生成"}
          </h2>
        </div>

        <span
          style={{
            ...resultBadgeStyle,

            background:
              result.mode ===
              "execute"
                ? "#dcfce7"
                : "#dbeafe",

            color:
              result.mode ===
              "execute"
                ? "#15803d"
                : "#1d4ed8",
          }}
        >
          {result.mode ===
          "execute"
            ? "EXECUTED"
            : "PLANNED"}
        </span>
      </div>

      {plan && (
        <>
          <div
            style={
              analysisGridStyle
            }
          >
            <AnalysisCard
              label="目标类型"
              value={formatPlanType(
                plan.type
              )}
            />

            <AnalysisCard
              label="复杂度"
              value={formatComplexity(
                result.analysis
                  ?.complexity
              )}
            />

            <AnalysisCard
              label="置信度"
              value={`${Math.round(
                normalizeConfidence(
                  plan.confidence
                ) * 100
              )}%`}
            />

            <AnalysisCard
              label="执行阶段"
              value={`${plan.steps.length} Stages`}
            />
          </div>

          <div
            style={
              goalSummaryCardStyle
            }
          >
            <p
              style={
                cardLabelStyle
              }
            >
              FINAL GOAL
            </p>

            <p
              style={
                goalSummaryTextStyle
              }
            >
              {plan.goal}
            </p>
          </div>

          <div
            style={
              capabilitySectionStyle
            }
          >
            <p
              style={
                cardLabelStyle
              }
            >
              SELECTED
              CAPABILITIES
            </p>

            <div
              style={
                capabilityListStyle
              }
            >
              {plan.capabilities
                .length > 0 ? (
                plan.capabilities.map(
                  (
                    capability
                  ) => (
                    <span
                      key={
                        capability
                      }
                      style={
                        capabilityBadgeStyle
                      }
                    >
                      {formatCapability(
                        capability
                      )}
                    </span>
                  )
                )
              ) : (
                <span
                  style={
                    capabilityBadgeStyle
                  }
                >
                  Planner
                </span>
              )}
            </div>
          </div>

          <div
            style={
              workflowSectionStyle
            }
          >
            <p
              style={
                cardLabelStyle
              }
            >
              EXECUTION
              WORKFLOW
            </p>

            <h3
              style={
                workflowTitleStyle
              }
            >
              分阶段执行路线
            </h3>

            <div
              style={{
                display:
                  "grid",

                gap: 0,

                marginTop:
                  15,
              }}
            >
              {plan.steps.map(
                (
                  step,
                  index
                ) => (
                  <div
                    key={`${step}-${index}`}
                    style={
                      workflowRowStyle
                    }
                  >
                    <div
                      style={
                        workflowRailStyle
                      }
                    >
                      <span
                        style={
                          workflowNumberStyle
                        }
                      >
                        {index +
                          1}
                      </span>

                      {index <
                        plan.steps
                          .length -
                          1 && (
                        <span
                          style={
                            workflowLineStyle
                          }
                        />
                      )}
                    </div>

                    <div
                      style={
                        workflowCardStyle
                      }
                    >
                      <span
                        style={
                          phaseLabelStyle
                        }
                      >
                        PHASE{" "}
                        {index +
                          1}
                      </span>

                      <p
                        style={
                          workflowStepStyle
                        }
                      >
                        {step}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}

      {execution && (
        <div
          style={
            runtimeResultStyle
          }
        >
          <div
            style={
              runtimeHeaderStyle
            }
          >
            <div>
              <p
                style={{
                  ...cardLabelStyle,

                  color:
                    "#93c5fd",
                }}
              >
                RUNTIME
                EXECUTION
              </p>

              <h3
                style={
                  runtimeTitleStyle
                }
              >
                执行结果
              </h3>
            </div>

            <span
              style={
                runtimeSuccessBadgeStyle
              }
            >
              {execution.status ===
              "failed"
                ? "FAILED"
                : "COMPLETED"}
            </span>
          </div>

          <div
            style={
              runtimeMetricsStyle
            }
          >
            <RuntimeMetric
              label="Provider"
              value={
                execution.provider ||
                "Unknown"
              }
            />

            <RuntimeMetric
              label="Latency"
              value={`${execution.latencyMs ?? 0} ms`}
            />

            <RuntimeMetric
              label="Fallback"
              value={
                execution.fallbackUsed
                  ? "Yes"
                  : "No"
              }
            />

            <RuntimeMetric
              label="Request"
              value={shortRequestId(
                execution.requestId
              )}
            />
          </div>

          <div
            style={
              runtimeContentStyle
            }
          >
            {execution.content}
          </div>
        </div>
      )}

      {workflow && (
        <div
          style={
            outcomeCardStyle
          }
        >
          <div
            style={
              outcomeHeaderStyle
            }
          >
            <div>
              <p
                style={{
                  ...cardLabelStyle,

                  color:
                    "#166534",
                }}
              >
                OUTCOME
              </p>

              <h3
                style={
                  outcomeTitleStyle
                }
              >
                已转化为可执行任务
              </h3>
            </div>

            <span
              style={
                outcomeBadgeStyle
              }
            >
              READY
            </span>
          </div>

          <div
            style={
              outcomeMetricsStyle
            }
          >
            <OutcomeMetric
              label="任务总数"
              value={`${workflow.taskCount}`}
            />

            <OutcomeMetric
              label="新建任务"
              value={`${workflow.createdCount}`}
            />

            <OutcomeMetric
              label="复用任务"
              value={`${workflow.reusedCount}`}
            />
          </div>

          {workflow.tasks.length >
            0 && (
            <div
              style={{
                display:
                  "grid",

                gap: 8,

                marginTop:
                  15,
              }}
            >
              {workflow.tasks
                .slice(0, 5)
                .map(
                  (
                    task,
                    index
                  ) => (
                    <div
                      key={
                        task.id
                      }
                      style={
                        outcomeTaskStyle
                      }
                    >
                      <span
                        style={
                          outcomeTaskNumberStyle
                        }
                      >
                        {index +
                          1}
                      </span>

                      <span
                        style={{
                          minWidth:
                            0,

                          flex: 1,
                        }}
                      >
                        {
                          task.title
                        }
                      </span>

                      <span
                        style={
                          outcomeTaskStatusStyle
                        }
                      >
                        {task.created
                          ? "NEW"
                          : "REUSED"}
                      </span>
                    </div>
                  )
                )}
            </div>
          )}

          <Link
            href="/tasks"
            style={
              outcomeLinkStyle
            }
          >
            打开 Tasks
            开始下一步 →
          </Link>
        </div>
      )}

      <div
        style={
          resultFooterLinksStyle
        }
      >
        <Link
          href="/runtime"
          style={
            resultFooterLinkStyle
          }
        >
          查看 Runtime 状态
          →
        </Link>

        <Link
          href="/runtime/trace"
          style={
            resultFooterLinkStyle
          }
        >
          查看 Execution Trace
          →
        </Link>
      </div>
    </>
  );
}

function QualityItem({
  ready,
  label,
}: {
  ready: boolean;
  label: string;
}) {
  return (
    <span
      style={{
        ...qualityItemStyle,

        color: ready
          ? "#bbf7d0"
          : "#94a3b8",
      }}
    >
      {ready ? "✓" : "○"}{" "}
      {label}
    </span>
  );
}

function AnalysisCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={
        analysisCardStyle
      }
    >
      <p
        style={
          cardLabelStyle
        }
      >
        {label.toUpperCase()}
      </p>

      <p
        style={
          analysisValueStyle
        }
      >
        {value}
      </p>
    </div>
  );
}

function RuntimeMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={
        runtimeMetricStyle
      }
    >
      <span
        style={
          runtimeMetricLabelStyle
        }
      >
        {label}
      </span>

      <strong
        style={
          runtimeMetricValueStyle
        }
      >
        {value}
      </strong>
    </div>
  );
}

function OutcomeMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={
        outcomeMetricStyle
      }
    >
      <span
        style={
          outcomeMetricLabelStyle
        }
      >
        {label}
      </span>

      <strong
        style={
          outcomeMetricValueStyle
        }
      >
        {value}
      </strong>
    </div>
  );
}

function normalizeConfidence(
  confidence: number
): number {
  if (
    !Number.isFinite(
      confidence
    )
  ) {
    return 0;
  }

  if (confidence > 1) {
    return Math.min(
      confidence / 100,
      1
    );
  }

  return Math.max(
    0,
    Math.min(
      confidence,
      1
    )
  );
}

function formatPlanType(
  type: string
): string {
  if (!type) {
    return "General";
  }

  return type
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatCapability(
  capability: string
): string {
  return capability
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatCategory(
  category: string
): string {
  const labels: Record<
    string,
    string
  > = {
    work: "工作",
    business: "商业",
    learning: "学习",
    content: "内容",
    decision: "决策",
    personal: "个人",
  };

  return (
    labels[category] ??
    category
  );
}

function formatComplexity(
  value:
    | "low"
    | "medium"
    | "high"
    | undefined
): string {
  if (value === "high") {
    return "High";
  }

  if (
    value === "medium"
  ) {
    return "Medium";
  }

  if (value === "low") {
    return "Low";
  }

  return "—";
}

function shortRequestId(
  value: string
): string {
  if (!value) {
    return "—";
  }

  if (
    value.length <= 10
  ) {
    return value;
  }

  return `${value.slice(
    0,
    6
  )}…${value.slice(-4)}`;
}

function formatHistoryTime(
  timestamp: number
): string {
  const date =
    new Date(timestamp);

  const now =
    new Date();

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
    return `今天 ${date.toLocaleTimeString(
      "zh-CN",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,
      }
    )}`;
  }

  return date.toLocaleDateString(
    "zh-CN",
    {
      month:
        "numeric",

      day:
        "numeric",
    }
  );
}

const pageStyle = {
  width: "100%",
  maxWidth: 860,
  margin: "0 auto",
  color: "#111827",
} as const;

const eyebrowStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing:
    "0.08em",
} as const;

const titleStyle = {
  margin: "8px 0 0",
  fontSize:
    "clamp(34px, 7vw, 52px)",
  lineHeight: 1.08,
  letterSpacing:
    "-0.04em",
} as const;

const subtitleStyle = {
  maxWidth: 720,
  margin: "14px 0 0",
  color: "#64748b",
  fontSize: 17,
  lineHeight: 1.7,
  fontWeight: 650,
} as const;

const headerLinksStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 9,
  marginTop: 16,
} as const;

const headerLinkStyle = {
  display:
    "inline-flex",
  alignItems: "center",
  minHeight: 38,
  padding: "0 12px",
  border:
    "1px solid #dbe3ef",
  borderRadius: 999,
  background:
    "#ffffff",
  color: "#334155",
  textDecoration:
    "none",
  fontSize: 13,
  fontWeight: 850,
} as const;

const goalPanelStyle = {
  padding:
    "clamp(18px, 4vw, 28px)",
  borderRadius: 26,
  background:
    "#111827",
  color: "#ffffff",
  boxShadow:
    "0 24px 60px rgba(15, 23, 42, 0.16)",
} as const;

const goalHeadingRowStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 14,
  marginBottom: 16,
} as const;

const goalLabelStyle = {
  display: "block",
  fontSize:
    "clamp(21px, 5vw, 28px)",
  lineHeight: 1.25,
  fontWeight: 950,
  letterSpacing:
    "-0.02em",
} as const;

const goalHelpStyle = {
  maxWidth: 620,
  margin: "8px 0 0",
  color: "#cbd5e1",
  fontSize: 14,
  lineHeight: 1.6,
} as const;

const goalStatusStyle = {
  flexShrink: 0,
  padding: "7px 10px",
  border:
    "1px solid",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  whiteSpace:
    "nowrap",
} as const;

const textareaStyle = {
  width: "100%",
  boxSizing:
    "border-box",
  resize: "vertical",
  border:
    "2px solid transparent",
  outline: "none",
  borderRadius: 18,
  padding: 18,
  fontSize: 16,
  lineHeight: 1.7,
  fontFamily:
    "inherit",
  background:
    "#ffffff",
  color: "#111827",
  boxShadow:
    "inset 0 0 0 1px rgba(148, 163, 184, 0.18)",
} as const;

const goalMetaStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  marginTop: 10,
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.45,
} as const;

const qualityChecklistStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px 14px",
  marginTop: 14,
} as const;

const qualityItemStyle = {
  fontSize: 12,
  fontWeight: 800,
} as const;

const actionGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 20,
} as const;

const secondaryButtonStyle = {
  minHeight: 52,
  padding: "0 14px",
  border: 0,
  borderRadius: 15,
  background:
    "#ffffff",
  color: "#111827",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
} as const;

const primaryButtonStyle = {
  minHeight: 52,
  padding: "0 14px",
  border:
    "1px solid #60a5fa",
  borderRadius: 15,
  background:
    "#2563eb",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow:
    "0 12px 30px rgba(37, 99, 235, 0.28)",
} as const;

const sectionStyle = {
  marginTop: 24,
} as const;

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-end",
  gap: 14,
  marginBottom: 12,
} as const;

const sectionEyebrowStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing:
    "0.08em",
} as const;

const sectionTitleStyle = {
  margin: "5px 0 0",
  fontSize: 24,
  lineHeight: 1.2,
  letterSpacing:
    "-0.02em",
} as const;

const sectionHintStyle = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 800,
} as const;

const presetGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
} as const;

const presetCardStyle = {
  display: "flex",
  alignItems:
    "flex-start",
  gap: 12,
  minWidth: 0,
  padding: 16,
  border:
    "1px solid #e2e8f0",
  borderRadius: 17,
  background:
    "#ffffff",
  color: "#111827",
  textAlign: "left",
  cursor: "pointer",
  boxShadow:
    "0 8px 24px rgba(15, 23, 42, 0.04)",
} as const;

const presetIconStyle = {
  display: "grid",
  placeItems:
    "center",
  flexShrink: 0,
  width: 38,
  height: 38,
  borderRadius: 12,
  background:
    "#f1f5f9",
  fontSize: 19,
} as const;

const presetCategoryStyle = {
  display: "block",
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing:
    "0.06em",
} as const;

const presetTitleStyle = {
  display: "block",
  marginTop: 4,
  fontSize: 15,
  lineHeight: 1.4,
} as const;

const presetDescriptionStyle = {
  display:
    "-webkit-box",
  marginTop: 5,
  overflow: "hidden",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.55,
  WebkitLineClamp: 3,
  WebkitBoxOrient:
    "vertical",
} as const;

const loadingSectionStyle = {
  marginTop: 24,
  padding: 20,
  border:
    "1px solid #dbeafe",
  borderRadius: 20,
  background:
    "#eff6ff",
} as const;

const loadingHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 12,
} as const;

const loadingTitleStyle = {
  margin: "6px 0 0",
  fontSize: 22,
} as const;

const runningBadgeStyle = {
  padding: "7px 10px",
  borderRadius: 999,
  background:
    "#dbeafe",
  color: "#1d4ed8",
  fontSize: 10,
  fontWeight: 900,
} as const;

const progressTrackStyle = {
  height: 9,
  marginTop: 17,
  overflow: "hidden",
  borderRadius: 999,
  background:
    "#dbeafe",
} as const;

const progressBarStyle = {
  display: "block",
  width: "44%",
  height: "100%",
  borderRadius: 999,
  background:
    "#2563eb",
} as const;

const loadingStageStyle = {
  display: "flex",
  alignItems:
    "center",
  gap: 10,
  minHeight: 42,
  padding: "0 12px",
  borderRadius: 12,
  background:
    "#ffffff",
  fontSize: 13,
  fontWeight: 800,
} as const;

const loadingStageNumberStyle = {
  display: "grid",
  placeItems:
    "center",
  width: 24,
  height: 24,
  borderRadius: 999,
  background:
    "#eff6ff",
  color: "#2563eb",
  fontSize: 11,
} as const;

const resultSectionStyle = {
  marginTop: 24,
  padding:
    "clamp(18px, 4vw, 26px)",
  border:
    "1px solid #e2e8f0",
  borderRadius: 24,
  background:
    "#ffffff",
  boxShadow:
    "0 16px 45px rgba(15, 23, 42, 0.07)",
} as const;

const errorCardStyle = {
  padding: 17,
  border:
    "1px solid #fecaca",
  borderRadius: 15,
  background:
    "#fff1f2",
  color: "#be123c",
} as const;

const resultHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 14,
} as const;

const resultTitleStyle = {
  margin: "6px 0 0",
  fontSize: 26,
  lineHeight: 1.25,
} as const;

const resultBadgeStyle = {
  flexShrink: 0,
  padding: "7px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
} as const;

const analysisGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 18,
} as const;

const analysisCardStyle = {
  minWidth: 0,
  padding: 15,
  border:
    "1px solid #e5e7eb",
  borderRadius: 15,
  background:
    "#f8fafc",
} as const;

const cardLabelStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing:
    "0.06em",
} as const;

const analysisValueStyle = {
  margin: "7px 0 0",
  fontSize: 19,
  fontWeight: 900,
  overflowWrap:
    "anywhere",
} as const;

const goalSummaryCardStyle = {
  marginTop: 16,
  padding: 17,
  borderRadius: 16,
  background:
    "#eff6ff",
  border:
    "1px solid #bfdbfe",
} as const;

const goalSummaryTextStyle = {
  margin: "8px 0 0",
  color: "#1e293b",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.65,
} as const;

const capabilitySectionStyle = {
  marginTop: 18,
} as const;

const capabilityListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
} as const;

const capabilityBadgeStyle = {
  padding: "8px 11px",
  borderRadius: 999,
  background:
    "#eef2ff",
  color: "#4338ca",
  fontSize: 12,
  fontWeight: 900,
} as const;

const workflowSectionStyle = {
  marginTop: 22,
  paddingTop: 20,
  borderTop:
    "1px solid #e5e7eb",
} as const;

const workflowTitleStyle = {
  margin: "6px 0 0",
  fontSize: 22,
} as const;

const workflowRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "38px minmax(0, 1fr)",
  gap: 11,
  minWidth: 0,
} as const;

const workflowRailStyle = {
  position:
    "relative",
  display: "flex",
  justifyContent:
    "center",
} as const;

const workflowNumberStyle = {
  position:
    "relative",
  zIndex: 1,
  display: "grid",
  placeItems:
    "center",
  width: 32,
  height: 32,
  borderRadius: 999,
  background:
    "#2563eb",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 900,
} as const;

const workflowLineStyle = {
  position:
    "absolute",
  top: 32,
  bottom: 0,
  width: 2,
  background:
    "#dbeafe",
} as const;

const workflowCardStyle = {
  minWidth: 0,
  marginBottom: 12,
  padding: 15,
  borderRadius: 15,
  border:
    "1px solid #e2e8f0",
  background:
    "#ffffff",
} as const;

const phaseLabelStyle = {
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing:
    "0.08em",
} as const;

const workflowStepStyle = {
  margin: "7px 0 0",
  color: "#1e293b",
  lineHeight: 1.65,
  fontWeight: 750,
  overflowWrap:
    "anywhere",
} as const;

const runtimeResultStyle = {
  marginTop: 22,
  padding: 19,
  borderRadius: 20,
  background:
    "#111827",
  color: "#ffffff",
} as const;

const runtimeHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 12,
} as const;

const runtimeTitleStyle = {
  margin: "6px 0 0",
  fontSize: 23,
} as const;

const runtimeSuccessBadgeStyle = {
  flexShrink: 0,
  padding: "7px 10px",
  borderRadius: 999,
  background:
    "#dcfce7",
  color: "#15803d",
  fontSize: 10,
  fontWeight: 900,
} as const;

const runtimeMetricsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 9,
  marginTop: 16,
} as const;

const runtimeMetricStyle = {
  minWidth: 0,
  padding: 12,
  borderRadius: 13,
  background:
    "rgba(255, 255, 255, 0.08)",
} as const;

const runtimeMetricLabelStyle = {
  display: "block",
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 900,
  textTransform:
    "uppercase",
} as const;

const runtimeMetricValueStyle = {
  display: "block",
  marginTop: 5,
  overflowWrap:
    "anywhere",
} as const;

const runtimeContentStyle = {
  marginTop: 16,
  padding: 16,
  borderRadius: 14,
  background:
    "rgba(255, 255, 255, 0.06)",
  whiteSpace:
    "pre-wrap",
  lineHeight: 1.75,
  overflowWrap:
    "anywhere",
} as const;

const outcomeCardStyle = {
  marginTop: 20,
  padding: 18,
  border:
    "1px solid #bbf7d0",
  borderRadius: 18,
  background:
    "#f0fdf4",
} as const;

const outcomeHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 12,
} as const;

const outcomeTitleStyle = {
  margin: "6px 0 0",
  fontSize: 21,
  color: "#14532d",
} as const;

const outcomeBadgeStyle = {
  padding: "7px 10px",
  borderRadius: 999,
  background:
    "#dcfce7",
  color: "#15803d",
  fontSize: 10,
  fontWeight: 900,
} as const;

const outcomeMetricsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginTop: 15,
} as const;

const outcomeMetricStyle = {
  minWidth: 0,
  padding: 12,
  borderRadius: 12,
  background:
    "#ffffff",
} as const;

const outcomeMetricLabelStyle = {
  display: "block",
  color: "#64748b",
  fontSize: 10,
  fontWeight: 800,
} as const;

const outcomeMetricValueStyle = {
  display: "block",
  marginTop: 5,
  color: "#166534",
  fontSize: 18,
} as const;

const outcomeTaskStyle = {
  display: "flex",
  alignItems:
    "center",
  gap: 9,
  minWidth: 0,
  padding: 11,
  borderRadius: 11,
  background:
    "#ffffff",
  color: "#1e293b",
  fontSize: 12,
  fontWeight: 750,
} as const;

const outcomeTaskNumberStyle = {
  display: "grid",
  placeItems:
    "center",
  flexShrink: 0,
  width: 23,
  height: 23,
  borderRadius: 999,
  background:
    "#dcfce7",
  color: "#15803d",
  fontSize: 10,
  fontWeight: 900,
} as const;

const outcomeTaskStatusStyle = {
  flexShrink: 0,
  color: "#15803d",
  fontSize: 9,
  fontWeight: 900,
} as const;

const outcomeLinkStyle = {
  display:
    "inline-flex",
  marginTop: 15,
  color: "#166534",
  textDecoration:
    "none",
  fontSize: 13,
  fontWeight: 900,
} as const;

const resultFooterLinksStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  marginTop: 18,
} as const;

const resultFooterLinkStyle = {
  color: "#2563eb",
  textDecoration:
    "none",
  fontSize: 13,
  fontWeight: 850,
} as const;

const privacyHintStyle = {
  margin:
    "-2px 0 12px",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.55,
} as const;

const clearHistoryButtonStyle = {
  padding: "7px 10px",
  border:
    "1px solid #e2e8f0",
  borderRadius: 10,
  background:
    "#ffffff",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
} as const;

const emptyHistoryStyle = {
  padding: 18,
  border:
    "1px dashed #cbd5e1",
  borderRadius: 16,
  background:
    "#ffffff",
} as const;

const historyCardStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
  gap: 13,
  minWidth: 0,
  padding: 15,
  border:
    "1px solid #e2e8f0",
  borderRadius: 15,
  background:
    "#ffffff",
  color: "#111827",
  textAlign: "left",
  cursor: "pointer",
} as const;

const historyGoalStyle = {
  display:
    "-webkit-box",
  overflow: "hidden",
  lineHeight: 1.5,
  WebkitLineClamp: 2,
  WebkitBoxOrient:
    "vertical",
} as const;

const historyMetaStyle = {
  display: "block",
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 11,
  lineHeight: 1.45,
} as const;

const historyArrowStyle = {
  flexShrink: 0,
  color: "#64748b",
  fontSize: 18,
  fontWeight: 900,
} as const;