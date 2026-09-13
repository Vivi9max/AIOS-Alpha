"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import MaterializeOutcomeButton from "@/components/outcomes/MaterializeOutcomeButton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  outcomesCopy,
  type MilestoneStatus,
  type OutcomePriority,
  type OutcomeStatus,
} from "@/lib/i18n/outcomes";
import type { Locale } from "@/lib/i18n";

interface OutcomeMilestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  order: number;
  taskIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

interface Outcome {
  id: string;
  title: string;
  description: string;
  successCriteria: string;
  status: OutcomeStatus;
  priority: OutcomePriority;
  progress: number;
  targetDate: number | null;
  milestones: OutcomeMilestone[];
  taskIds: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

interface OutcomeSummary {
  total: number;
  planned: number;
  active: number;
  blocked: number;
  completed: number;
  archived: number;
  averageProgress: number;
}

interface OutcomesResponse {
  success: boolean;
  outcomes?: Outcome[];
  outcome?: Outcome;
  summary?: OutcomeSummary;
  error?: string;
}

interface MilestoneDraft {
  title: string;
  description: string;
}

const EMPTY_SUMMARY: OutcomeSummary = {
  total: 0,
  planned: 0,
  active: 0,
  blocked: 0,
  completed: 0,
  archived: 0,
  averageProgress: 0,
};

function formatDate(timestamp: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function parseTargetDate(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    normalized
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    23,
    59,
    59,
    999
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const timestamp = date.getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

type OutcomePageCopy =
  (typeof outcomesCopy)[Locale];

async function readJson(
  response: Response,
  copy: OutcomePageCopy
): Promise<OutcomesResponse> {
  let data: OutcomesResponse;

  try {
    data = (await response.json()) as OutcomesResponse;
  } catch {
    throw new Error(
      copy.errors.invalidResponse(response.status)
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ||
        copy.errors.operationFailed(response.status)
    );
  }

  return data;
}

function getStatusIcon(status: OutcomeStatus): string {
  return {
    planned: "📝",
    active: "🚀",
    blocked: "⚠️",
    completed: "✅",
    archived: "📦",
  }[status];
}

function getMilestoneIcon(
  status: MilestoneStatus
): string {
  return {
    pending: "○",
    active: "◉",
    blocked: "⚠️",
    completed: "✓",
  }[status];
}

export default function OutcomesPage() {
  const { locale } = useLanguage();
  const copy = outcomesCopy[locale];

  const [outcomes, setOutcomes] = useState<Outcome[]>(
    []
  );
  const [summary, setSummary] =
    useState<OutcomeSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [successCriteria, setSuccessCriteria] =
    useState("");
  const [priority, setPriority] =
    useState<OutcomePriority>("normal");
  const [targetDate, setTargetDate] =
    useState("");

  const [milestones, setMilestones] =
    useState<MilestoneDraft[]>(
      () => copy.initialMilestones
    );

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadOutcomes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/outcomes",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await readJson(response, copy);

      setOutcomes(data.outcomes ?? []);
      setSummary(
        data.summary ?? EMPTY_SUMMARY
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : copy.errors.load
      );
    } finally {
      setLoading(false);
    }
  }, [copy]);

  useEffect(() => {
    void loadOutcomes();
  }, [loadOutcomes]);

  const visibleOutcomes = useMemo(
    () =>
      outcomes.filter(
        (outcome) =>
          outcome.status !== "archived"
      ),
    [outcomes]
  );

  function updateMilestoneDraft(
    index: number,
    field: "title" | "description",
    value: string
  ) {
    setMilestones((current) =>
      current.map(
        (milestone, milestoneIndex) =>
          milestoneIndex === index
            ? {
                ...milestone,
                [field]: value,
              }
            : milestone
      )
    );
  }

  function addMilestoneDraft() {
    setMilestones((current) => [
      ...current,
      {
        title: "",
        description: "",
      },
    ]);
  }

  function removeMilestoneDraft(index: number) {
    setMilestones((current) =>
      current.filter(
        (_, milestoneIndex) =>
          milestoneIndex !== index
      )
    );
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setSuccessCriteria("");
    setPriority("normal");
    setTargetDate("");
    setMilestones(copy.initialMilestones);
  }

  async function createNewOutcome() {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setError(copy.errors.titleRequired);
      return;
    }

    const validMilestones = milestones
      .map((item) => ({
        title: item.title.trim(),
        description:
          item.description.trim(),
      }))
      .filter((item) =>
        Boolean(item.title)
      );

    if (validMilestones.length === 0) {
      setError(
        copy.errors.milestoneRequired
      );
      return;
    }

    const parsedTargetDate =
      parseTargetDate(targetDate);

    if (
      targetDate.trim() &&
      parsedTargetDate === null
    ) {
      setError(copy.errors.invalidDate);
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/outcomes",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title: normalizedTitle,
            description:
              description.trim(),
            successCriteria:
              successCriteria.trim(),
            priority,
            targetDate:
              parsedTargetDate,
            milestones:
              validMilestones,
          }),
        }
      );

      const data = await readJson(
        response,
        copy
      );

      const createdTitle =
        data.outcome?.title ??
        normalizedTitle;

      const createdId =
        data.outcome?.id ?? null;

      setSuccessMessage(
        copy.success.created(
          createdTitle
        )
      );

      setFormOpen(false);
      resetForm();

      await loadOutcomes();

      if (createdId) {
        setExpandedId(createdId);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : copy.errors.create
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateOutcomeStatus(
    outcome: Outcome,
    status: OutcomeStatus
  ) {
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/outcomes",
        {
          method: "PATCH",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: outcome.id,
            status,
          }),
        }
      );

      await readJson(response, copy);

      setSuccessMessage(
        copy.success.statusUpdated(
          outcome.title,
          copy.status[status]
        )
      );

      await loadOutcomes();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : copy.errors.update
      );
    }
  }

  async function updateMilestoneStatus(
    outcome: Outcome,
    milestone: OutcomeMilestone,
    status: MilestoneStatus
  ) {
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/outcomes",
        {
          method: "PATCH",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action:
              "update-milestone",
            id: outcome.id,
            milestoneId:
              milestone.id,
            status,
          }),
        }
      );

      await readJson(response, copy);

      setSuccessMessage(
        copy.success.milestoneUpdated(
          milestone.title
        )
      );

      await loadOutcomes();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : copy.errors.milestoneUpdate
      );
    }
  }

  async function removeOutcome(
    outcome: Outcome
  ) {
    if (
      !window.confirm(
        copy.confirmDelete(
          outcome.title
        )
      )
    ) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/outcomes?id=${encodeURIComponent(
          outcome.id
        )}`,
        {
          method: "DELETE",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      await readJson(response, copy);

      setSuccessMessage(
        copy.success.deleted(
          outcome.title
        )
      );

      if (
        expandedId === outcome.id
      ) {
        setExpandedId(null);
      }

      await loadOutcomes();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : copy.errors.delete
      );
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            {copy.eyebrow}
          </div>

          <h1 style={styles.title}>
            {copy.title}
          </h1>

          <p style={styles.subtitle}>
            {copy.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormOpen(
              (current) => !current
            );
            setError("");
          }}
          style={{
            ...styles.primaryButton,
            minWidth: 110,
            background: formOpen
              ? "#e2e8f0"
              : "#0f172a",
            color: formOpen
              ? "#334155"
              : "#ffffff",
          }}
        >
          {formOpen
            ? copy.cancel
            : copy.newOutcome}
        </button>
      </header>

      <section style={styles.summaryGrid}>
        <SummaryCard
          label={copy.all}
          value={summary.total}
          icon="🎯"
        />

        <SummaryCard
          label={copy.active}
          value={summary.active}
          icon="🚀"
        />

        <SummaryCard
          label={copy.blocked}
          value={summary.blocked}
          icon="⚠️"
        />

        <SummaryCard
          label={copy.completed}
          value={summary.completed}
          icon="✅"
        />

        <SummaryCard
          label={copy.average}
          value={`${summary.averageProgress}%`}
          icon="📊"
        />

        <SummaryCard
          label={copy.planned}
          value={summary.planned}
          icon="📝"
        />
      </section>

      {error ? (
        <MessageBox type="error">
          {error}
        </MessageBox>
      ) : null}

      {successMessage ? (
        <MessageBox type="success">
          {successMessage}
        </MessageBox>
      ) : null}

      {formOpen ? (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>
            {copy.createTitle}
          </h2>

          <p
            style={
              styles.sectionDescription
            }
          >
            {copy.createDescription}
          </p>

          <FieldLabel>
            {copy.titleLabel}
          </FieldLabel>

          <input
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            placeholder={
              copy.titlePlaceholder
            }
            style={styles.input}
          />

          <FieldLabel>
            {copy.description}
          </FieldLabel>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            placeholder={
              copy.descriptionPlaceholder
            }
            rows={4}
            style={styles.textarea}
          />

          <FieldLabel>
            {copy.criteria}
          </FieldLabel>

          <textarea
            value={successCriteria}
            onChange={(event) =>
              setSuccessCriteria(
                event.target.value
              )
            }
            placeholder={
              copy.criteriaPlaceholder
            }
            rows={3}
            style={styles.textarea}
          />

          <div style={styles.twoColumns}>
            <div>
              <FieldLabel>
                {copy.priority}
              </FieldLabel>

              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target
                      .value as OutcomePriority
                  )
                }
                style={styles.input}
              >
                <option value="low">
                  {copy.low}
                </option>
                <option value="normal">
                  {copy.normal}
                </option>
                <option value="high">
                  {copy.high}
                </option>
                <option value="critical">
                  {copy.critical}
                </option>
              </select>
            </div>

            <div>
              <FieldLabel>
                {copy.targetDate}
              </FieldLabel>

              <input
                type="date"
                value={targetDate}
                onChange={(event) =>
                  setTargetDate(
                    event.target.value
                  )
                }
                style={styles.input}
              />
            </div>
          </div>

          <div
            style={{
              ...styles.sectionHeader,
              marginTop: 22,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                }}
              >
                {copy.milestones}
              </h3>

              <p
                style={
                  styles.sectionDescription
                }
              >
                {copy.milestoneHelp}
              </p>
            </div>

            <button
              type="button"
              onClick={
                addMilestoneDraft
              }
              style={
                styles.secondaryButton
              }
            >
              {copy.add}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: 11,
              marginTop: 13,
            }}
          >
            {milestones.map(
              (milestone, index) => (
                <div
                  key={index}
                  style={
                    styles.draftCard
                  }
                >
                  <div
                    style={
                      styles.sectionHeader
                    }
                  >
                    <strong>
                      {copy.milestone}{" "}
                      {index + 1}
                    </strong>

                    {milestones.length >
                    1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          removeMilestoneDraft(
                            index
                          )
                        }
                        style={
                          styles.dangerTextButton
                        }
                      >
                        {copy.delete}
                      </button>
                    ) : null}
                  </div>

                  <input
                    value={
                      milestone.title
                    }
                    onChange={(event) =>
                      updateMilestoneDraft(
                        index,
                        "title",
                        event.target.value
                      )
                    }
                    placeholder={
                      copy.milestoneTitle
                    }
                    style={{
                      ...styles.input,
                      marginTop: 11,
                    }}
                  />

                  <textarea
                    value={
                      milestone.description
                    }
                    onChange={(event) =>
                      updateMilestoneDraft(
                        index,
                        "description",
                        event.target.value
                      )
                    }
                    placeholder={
                      copy.milestoneDescription
                    }
                    rows={2}
                    style={{
                      ...styles.textarea,
                      marginTop: 9,
                    }}
                  />
                </div>
              )
            )}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void createNewOutcome()
            }
            style={{
              ...styles.primaryButton,
              width: "100%",
              marginTop: 18,
              background: saving
                ? "#94a3b8"
                : "#0f172a",
              cursor: saving
                ? "default"
                : "pointer",
            }}
          >
            {saving
              ? copy.creating
              : copy.create}
          </button>
        </section>
      ) : null}

      <section
        style={{ marginTop: 22 }}
      >
        <div
          style={styles.sectionHeader}
        >
          <div>
            <h2
              style={
                styles.sectionTitle
              }
            >
              {copy.list}
            </h2>

            <p
              style={
                styles.sectionDescription
              }
            >
              {copy.listDescription}
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void loadOutcomes()
            }
            style={
              styles.secondaryButton
            }
          >
            {loading
              ? copy.refreshing
              : copy.refresh}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            marginTop: 15,
          }}
        >
          {loading ? (
            <EmptyState>
              {copy.loading}
            </EmptyState>
          ) : null}

          {!loading &&
          visibleOutcomes.length ===
            0 ? (
            <EmptyState>
              {copy.empty}
            </EmptyState>
          ) : null}

          {!loading
            ? visibleOutcomes.map(
                (outcome) => (
                  <OutcomeCard
                    key={outcome.id}
                    outcome={outcome}
                    expanded={
                      expandedId ===
                      outcome.id
                    }
                    copy={copy}
                    locale={locale}
                    onToggle={() =>
                      setExpandedId(
                        (current) =>
                          current ===
                          outcome.id
                            ? null
                            : outcome.id
                      )
                    }
                    onStatusChange={
                      updateOutcomeStatus
                    }
                    onMilestoneChange={
                      updateMilestoneStatus
                    }
                    onDelete={
                      removeOutcome
                    }
                    onRefresh={
                      loadOutcomes
                    }
                  />
                )
              )
            : null}
        </div>
      </section>
    </div>
  );
}

function OutcomeCard({
  outcome,
  expanded,
  copy,
  locale,
  onToggle,
  onStatusChange,
  onMilestoneChange,
  onDelete,
  onRefresh,
}: {
  outcome: Outcome;
  expanded: boolean;
  copy: OutcomePageCopy;
  locale: Locale;
  onToggle: () => void;
  onStatusChange: (
    outcome: Outcome,
    status: OutcomeStatus
  ) => Promise<void>;
  onMilestoneChange: (
    outcome: Outcome,
    milestone: OutcomeMilestone,
    status: MilestoneStatus
  ) => Promise<void>;
  onDelete: (
    outcome: Outcome
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const orderedMilestones = [
    ...outcome.milestones,
  ].sort(
    (first, second) =>
      first.order - second.order
  );

  return (
    <article
      style={styles.outcomeCard}
    >
      <button
        type="button"
        onClick={onToggle}
        style={styles.cardToggle}
      >
        <div style={styles.cardHeader}>
          <div
            style={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={
                styles.badgeRow
              }
            >
              <span
                style={{
                  fontSize: 20,
                }}
              >
                {getStatusIcon(
                  outcome.status
                )}
              </span>

              <span
                style={
                  styles.statusBadge
                }
              >
                {
                  copy.status[
                    outcome.status
                  ]
                }
              </span>

              <span
                style={{
                  ...styles.priorityBadge,
                  background:
                    outcome.priority ===
                    "critical"
                      ? "#fef2f2"
                      : "#f8fafc",
                  color:
                    outcome.priority ===
                    "critical"
                      ? "#dc2626"
                      : "#64748b",
                }}
              >
                {copy.priorityPrefix}{" "}
                {
                  copy[
                    outcome.priority
                  ]
                }
              </span>
            </div>

            <h3
              style={
                styles.cardTitle
              }
            >
              {outcome.title}
            </h3>

            {outcome.description ? (
              <p
                style={
                  styles.cardDescription
                }
              >
                {outcome.description}
              </p>
            ) : null}
          </div>

          <span
            style={{
              color: "#94a3b8",
              fontSize: 22,
              transform: expanded
                ? "rotate(90deg)"
                : "none",
              transition:
                "transform 180ms ease",
            }}
          >
            ›
          </span>
        </div>

        <div
          style={styles.progressRow}
        >
          <div
            style={{
              flex: 1,
            }}
          >
            <div
              style={
                styles.progressTrack
              }
            >
              <div
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      outcome.progress
                    )
                  )}%`,
                  height: "100%",
                  borderRadius: 999,
                  background:
                    outcome.progress ===
                    100
                      ? "#22c55e"
                      : "#2563eb",
                  transition:
                    "width 240ms ease",
                }}
              />
            </div>
          </div>

          <strong
            style={
              styles.progressLabel
            }
          >
            {outcome.progress}%
          </strong>
        </div>
      </button>

      {expanded ? (
        <div
          style={
            styles.expandedPanel
          }
        >
          <MaterializeOutcomeButton
            outcomeId={outcome.id}
            outcomeTitle={
              outcome.title
            }
            existingTaskCount={
              outcome.taskIds.length
            }
            onCompleted={
              onRefresh
            }
          />

          {outcome.successCriteria ? (
            <div
              style={styles.criteria}
            >
              <div
                style={
                  styles.criteriaLabel
                }
              >
                {copy.criteria.toUpperCase()}
              </div>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  lineHeight: 1.6,
                }}
              >
                {
                  outcome.successCriteria
                }
              </p>
            </div>
          ) : null}

          <div
            style={{
              ...styles.sectionHeader,
              marginTop: 17,
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: 17,
              }}
            >
              {copy.milestones}
            </h4>

            <span
              style={{
                color: "#64748b",
                fontSize: 12,
              }}
            >
              {
                outcome.milestones.filter(
                  (item) =>
                    item.status ===
                    "completed"
                ).length
              }
              /{outcome.milestones.length}{" "}
              {copy.done}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gap: 9,
              marginTop: 11,
            }}
          >
            {orderedMilestones.map(
              (milestone) => (
                <div
                  key={milestone.id}
                  style={{
                    ...styles.milestoneCard,
                    background:
                      milestone.status ===
                      "completed"
                        ? "#f0fdf4"
                        : "#ffffff",
                  }}
                >
                  <div
                    style={
                      styles.cardHeader
                    }
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <strong>
                        {getMilestoneIcon(
                          milestone.status
                        )}{" "}
                        {
                          milestone.title
                        }
                      </strong>

                      {milestone.description ? (
                        <p
                          style={
                            styles.milestoneDescription
                          }
                        >
                          {
                            milestone.description
                          }
                        </p>
                      ) : null}

                      {milestone.taskIds
                        .length >
                      0 ? (
                        <div
                          style={
                            styles.linkedTask
                          }
                        >
                          {
                            milestone
                              .taskIds
                              .length
                          }{" "}
                          {copy.linked}
                        </div>
                      ) : null}
                    </div>

                    <select
                      value={
                        milestone.status
                      }
                      onChange={(
                        event
                      ) =>
                        void onMilestoneChange(
                          outcome,
                          milestone,
                          event.target
                            .value as MilestoneStatus
                        )
                      }
                      style={
                        styles.milestoneSelect
                      }
                    >
                      <option value="pending">
                        {
                          copy
                            .milestoneStatus
                            .pending
                        }
                      </option>

                      <option value="active">
                        {
                          copy
                            .milestoneStatus
                            .active
                        }
                      </option>

                      <option value="blocked">
                        {
                          copy
                            .milestoneStatus
                            .blocked
                        }
                      </option>

                      <option value="completed">
                        {
                          copy
                            .milestoneStatus
                            .completed
                        }
                      </option>
                    </select>
                  </div>
                </div>
              )
            )}
          </div>

          <div
            style={styles.actionRow}
          >
            {outcome.status !==
              "active" &&
            outcome.status !==
              "completed" ? (
              <ActionButton
                onClick={() =>
                  void onStatusChange(
                    outcome,
                    "active"
                  )
                }
              >
                {copy.start}
              </ActionButton>
            ) : null}

            {outcome.status !==
              "blocked" &&
            outcome.status !==
              "completed" ? (
              <ActionButton
                onClick={() =>
                  void onStatusChange(
                    outcome,
                    "blocked"
                  )
                }
              >
                ⚠️ {copy.blocked}
              </ActionButton>
            ) : null}

            {outcome.status !==
            "completed" ? (
              <ActionButton
                onClick={() =>
                  void onStatusChange(
                    outcome,
                    "completed"
                  )
                }
              >
                {copy.markComplete}
              </ActionButton>
            ) : null}

            <ActionButton
              danger
              onClick={() =>
                void onDelete(outcome)
              }
            >
              {copy.remove}
            </ActionButton>
          </div>

          <div
            style={styles.updatedAt}
          >
            {copy.refresh} ·{" "}
            {formatDate(
              outcome.updatedAt,
              locale
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <article
      style={styles.summaryCard}
    >
      <div
        style={styles.summaryHeader}
      >
        <span>{label}</span>
        <span
          style={{
            fontSize: 19,
          }}
        >
          {icon}
        </span>
      </div>

      <div
        style={styles.summaryValue}
      >
        {value}
      </div>
    </article>
  );
}

function FieldLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <label
      style={styles.fieldLabel}
    >
      {children}
    </label>
  );
}

function EmptyState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={styles.emptyState}
    >
      {children}
    </div>
  );
}

function MessageBox({
  children,
  type,
}: {
  children: ReactNode;
  type: "error" | "success";
}) {
  const isError =
    type === "error";

  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        border: `1px solid ${
          isError
            ? "#fecaca"
            : "#bbf7d0"
        }`,
        borderRadius: 14,
        background: isError
          ? "#fef2f2"
          : "#f0fdf4",
        color: isError
          ? "#b91c1c"
          : "#15803d",
        lineHeight: 1.5,
        fontWeight: isError
          ? 500
          : 750,
        overflowWrap:
          "anywhere",
      }}
    >
      {children}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  danger = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 38,
        padding: "0 12px",
        border: danger
          ? "1px solid #fecaca"
          : "1px solid #cbd5e1",
        borderRadius: 11,
        background: danger
          ? "#fef2f2"
          : "#ffffff",
        color: danger
          ? "#dc2626"
          : "#334155",
        fontSize: 12,
        fontWeight: 850,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const styles: Record<
  string,
  CSSProperties
> = {
  page: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    color: "#0f172a",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: 14,
  },

  eyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing:
      "0.12em",
  },

  title: {
    margin: "7px 0 0",
    fontSize: 32,
    lineHeight: 1.1,
  },

  subtitle: {
    margin: "9px 0 0",
    color: "#64748b",
    lineHeight: 1.55,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 11,
    marginTop: 22,
  },

  summaryCard: {
    padding: 15,
    border:
      "1px solid #dbe3f0",
    borderRadius: 17,
    background: "#ffffff",
  },

  summaryHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 850,
  },

  summaryValue: {
    marginTop: 9,
    fontSize: 27,
    fontWeight: 950,
  },

  panel: {
    marginTop: 18,
    padding: 18,
    border:
      "1px solid #dbe3f0",
    borderRadius: 22,
    background: "#ffffff",
  },

  sectionTitle: {
    margin: 0,
    fontSize: 23,
  },

  sectionDescription: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },

  fieldLabel: {
    display: "block",
    margin: "16px 0 7px",
    color: "#475569",
    fontSize: 13,
    fontWeight: 850,
  },

  input: {
    width: "100%",
    height: 46,
    padding: "0 13px",
    boxSizing: "border-box",
    border:
      "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#ffffff",
    color: "#0f172a",
    font: "inherit",
    outline: "none",
  },

  textarea: {
    width: "100%",
    padding: 13,
    boxSizing: "border-box",
    resize: "vertical",
    border:
      "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#ffffff",
    color: "#0f172a",
    font: "inherit",
    lineHeight: 1.55,
    outline: "none",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
  },

  draftCard: {
    padding: 14,
    border:
      "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#f8fafc",
  },

  primaryButton: {
    minHeight: 45,
    padding: "0 15px",
    border: 0,
    borderRadius: 14,
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    minHeight: 40,
    padding: "0 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#ffffff",
    color: "#2563eb",
    fontWeight: 900,
    cursor: "pointer",
  },

  dangerTextButton: {
    border: 0,
    background: "transparent",
    color: "#dc2626",
    fontWeight: 850,
    cursor: "pointer",
  },

  emptyState: {
    padding: "40px 20px",
    border:
      "1px dashed #cbd5e1",
    borderRadius: 19,
    background: "#ffffff",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 1.7,
  },

  outcomeCard: {
    padding: 17,
    border:
      "1px solid #dbe3f0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow:
      "0 7px 22px rgba(15, 23, 42, 0.04)",
  },

  cardToggle: {
    width: "100%",
    padding: 0,
    border: 0,
    background: "transparent",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
  },

  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: 12,
  },

  badgeRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  statusBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 11,
    fontWeight: 900,
  },

  priorityBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 850,
  },

  cardTitle: {
    margin: "11px 0 0",
    fontSize: 20,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },

  cardDescription: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55,
  },

  progressRow: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
    marginTop: 15,
  },

  progressTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    background: "#e2e8f0",
  },

  progressLabel: {
    minWidth: 42,
    textAlign: "right",
  },

  expandedPanel: {
    marginTop: 17,
    paddingTop: 17,
    borderTop:
      "1px solid #e2e8f0",
  },

  criteria: {
    marginTop: 16,
    padding: 13,
    borderRadius: 14,
    background: "#f8fafc",
  },

  criteriaLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing:
      "0.08em",
  },

  milestoneCard: {
    padding: 13,
    border:
      "1px solid #e2e8f0",
    borderRadius: 14,
  },

  milestoneDescription: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },

  linkedTask: {
    marginTop: 7,
    color: "#15803d",
    fontSize: 11,
    fontWeight: 800,
  },

  milestoneSelect: {
    height: 34,
    padding: "0 8px",
    border:
      "1px solid #cbd5e1",
    borderRadius: 9,
    background: "#ffffff",
    fontSize: 11,
    fontWeight: 800,
  },

  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  updatedAt: {
    marginTop: 14,
    color: "#94a3b8",
    fontSize: 11,
  },
};
