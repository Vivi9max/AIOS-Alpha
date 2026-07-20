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

import type {
  PlannerSnapshot,
} from "@/lib/planner/types";

export interface PlannerContextValue {
  snapshot:
    | PlannerSnapshot
    | null;

  loading: boolean;
  refreshing: boolean;
  error:
    | string
    | null;

  lastUpdated:
    | number
    | null;

  refresh: () =>
    Promise<void>;
}

export const PlannerContext =
  createContext<
    PlannerContextValue
    | undefined
  >(undefined);

interface PlannerProviderProps {
  children: ReactNode;

  initialSnapshot?:
    | PlannerSnapshot
    | null;

  autoRefresh?: boolean;

  refreshInterval?: number;
}

function getErrorMessage(
  error: unknown
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

  initialSnapshot = null,

  autoRefresh = true,

  refreshInterval = 30000,
}: PlannerProviderProps) {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      PlannerSnapshot
      | null
    >(initialSnapshot);

  const [
    loading,
    setLoading,
  ] =
    useState(
      initialSnapshot === null
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string
      | null
    >(null);

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<
      number
      | null
    >(
      initialSnapshot
        ?.generatedAt ??
        null
    );

  const mountedRef =
    useRef(true);

  const activeControllerRef =
    useRef<
      AbortController
      | null
    >(null);

  const refresh =
    useCallback(
      async () => {
        activeControllerRef
          .current
          ?.abort();

        const controller =
          new AbortController();

        activeControllerRef.current =
          controller;

        if (!snapshot) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError(null);

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

          setSnapshot(
            nextSnapshot
          );

          setLastUpdated(
            nextSnapshot.generatedAt
          );
        } catch (requestError) {
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
            setLoading(false);
            setRefreshing(false);
          }
        }
      },
      [snapshot]
    );

  useEffect(() => {
    mountedRef.current =
      true;

    if (!initialSnapshot) {
      void refresh();
    }

    return () => {
      mountedRef.current =
        false;

      activeControllerRef
        .current
        ?.abort();
    };
  }, [
    initialSnapshot,
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
          void refresh();
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
        refresh,
      }),
      [
        snapshot,
        loading,
        refreshing,
        error,
        lastUpdated,
        refresh,
      ]
    );

  return (
    <PlannerContext.Provider
      value={value}
    >
      {children}
    </PlannerContext.Provider>
  );
}