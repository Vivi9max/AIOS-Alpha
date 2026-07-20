"use client";

import {
  useContext,
} from "react";

import {
  PlannerContext,
} from "@/components/planner/PlannerProvider";

export function usePlanner() {
  const context =
    useContext(
      PlannerContext
    );

  if (!context) {
    throw new Error(
      "usePlanner must be used inside PlannerProvider."
    );
  }

  return context;
}