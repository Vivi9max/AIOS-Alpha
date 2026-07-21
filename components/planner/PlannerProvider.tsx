"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  fetchPlannerSnapshot,
} from "@/lib/planner/client";

import {
  PLANNER_REFRESH_EVENT,
} from "@/lib/planner/events";

import type {
  PlannerRefreshDetail,
} from "@/lib/planner/events";

import type {
  PlannerSnapshot,
} from "@/lib/planner/types";

export interface PlannerContextValue {
  snapshot:
    PlannerSnapshot |
    null;

  loading:
    boolean;

  refreshing:
    boolean;

  error:
    string |
    null;

  lastUpdated:
    number |
    null;

  lastRefreshReason:
    string |
    null;

  refresh: (
    reason?:
      string
  ) => Promise<void>;
}

export const PlannerContext =
  createContext<
    PlannerContextValue |
    undefined
  >(undefined);

interface PlannerProviderProps {
  children:
    ReactNode;

  initialSnapshot?:
    PlannerSnapshot |
    null;

  autoRefresh?:
    boolean;

  refreshInterval?:
    number;
}

function getErrorMessage(
  error:
    unknown
): string {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Planner loading failed.";
}

export default function PlannerProvider({
  children,

  initialSnapshot =
    null,

  autoRefresh =
    true,

  refreshInterval =
    30000,
}: PlannerProviderProps) {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      PlannerSnapshot |
      null
    >(
      initialSnapshot
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      initialSnapshot ===
      null
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<
      number |
      null
    >(
      initialSnapshot
        ?.generatedAt ??
        null
    );

  const [
    lastRefreshReason,
    setLastRefreshReason,
  ] =
    useState<
      string |
      null
    >(
      initialSnapshot
        ? "initial"
        : null
    );

  const mountedRef =
    useRef(
      true
    );

  const snapshotRef =
    useRef<
      PlannerSnapshot |
      null
    >(
      initialSnapshot
    );

  const controllerRef =
    useRef<
      AbortController |
      null
    >(
      null
    );

  const refresh =
    useCallback(
      async (
        reason =
          "manual"
      ) => {
        controllerRef
          .current
          ?.abort();

        const controller =
          new AbortController();

        controllerRef.current =
          controller;

        if (
          snapshotRef.current
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError(
          null
        );

        try {
          const nextSnapshot =
            await fetchPlannerSnapshot(
              {
                signal:
                  controller.signal,

                cache:
                  "no-store",
              }
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          snapshotRef.current =
            nextSnapshot;

          setSnapshot(
            nextSnapshot
          );

          setLastUpdated(
            nextSnapshot.generatedAt
          );

          setLastRefreshReason(
            reason
          );
        } catch (
          requestError
        ) {
          if (
            requestError instanceof
              DOMException &&
            requestError.name ===
              "AbortError"
          ) {
            return;
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          setError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setLoading(
              false
            );

            setRefreshing(
              false
            );
          }
        }
      },
      []
    );

  useEffect(() => {
    mountedRef.current =
      true;

    if (
      !initialSnapshot
    ) {
      void refresh(
        "initial"
      );
    }

    return () => {
      mountedRef.current =
        false;

      controllerRef
        .current
        ?.abort();
    };
  }, [
    initialSnapshot,
    refresh,
  ]);

  useEffect(() => {
    function handlePlannerRefresh(
      event:
        Event
    ) {
      const customEvent =
        event as
          CustomEvent<
            PlannerRefreshDetail
          >;

      void refresh(
        customEvent.detail
          ?.reason ??
          "event"
      );
    }

    window.addEventListener(
      PLANNER_REFRESH_EVENT,
      handlePlannerRefresh
    );

    return () => {
      window.removeEventListener(
        PLANNER_REFRESH_EVENT,
        handlePlannerRefresh
      );
    };
  }, [
    refresh,
  ]);

  useEffect(() => {
    function handleFocus() {
      void refresh(
        "window-focus"
      );
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refresh(
          "page-visible"
        );
      }
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    refresh,
  ]);

  useEffect(() => {
    if (
      !autoRefresh ||
      refreshInterval <= 0
    ) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void refresh(
            "interval"
          );
        },
        refreshInterval
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    autoRefresh,
    refresh,
    refreshInterval,
  ]);

  const value =
    useMemo<
      PlannerContextValue
    >(
      () => ({
        snapshot,
        loading,
        refreshing,
        error,
        lastUpdated,
        lastRefreshReason,
        refresh,
      }),
      [
        snapshot,
        loading,
        refreshing,
        error,
        lastUpdated,
        lastRefreshReason,
        refresh,
      ]
    );

  return (
    <PlannerContext.Provider
      value={
        value
      }
    >
      {children}
    </PlannerContext.Provider>
  );
}