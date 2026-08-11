# AIOS Alpha — Development Handoff

This file is the durable starting point for any human or AI continuing the project without access to earlier ChatGPT conversations.

## Current checkpoint

- Release: C130
- Product direction: multilingual international edition first
- Supported interface languages: English, Simplified Chinese, Japanese
- Runtime: Next.js 16, React 19, TypeScript
- Primary constraint: the system must remain useful and developable without ChatGPT Plus

## C130

Dashboard and Settings now participate in the shared language state through `WorkspaceShell` and the route-scoped `LegacyPageLocalizer`. The adapter preserves existing dashboard/settings data flows and translates rendered UI text on `/dashboard` and `/settings` without changing server APIs or provider routing.

## Resume protocol

1. Read `aios-alpha.manifest.json`, this file, and `docs/aios-spec.md`.
2. Inspect the latest GitHub `main` branch and recent merged pull request before editing.
3. Install with `npm ci`.
4. Establish the baseline with `npx tsc --noEmit` and `npm run build`.
5. Continue only from the latest working implementation; do not reconstruct older modules from chat history.
6. Deliver a complete module and update the manifest release, date, capabilities, and next priority.

## Working capabilities

- Replaceable AI provider routing with fallback support
- User-scoped memory and task persistence
- Planner execution guardrails and adaptive limits
- Execution evidence ledger
- Execution review engine with a single corrective action
- Shared browser-persisted language state
- English, Simplified Chinese and Japanese global navigation
- Runtime handoff API and continuity page
- Localized workspace, tasks, planner, runtime, projects, outcomes, memory and execution observability
- Localized dashboard and settings flows

## Non-negotiable engineering rules

- Prefer independent runtime capability over dependence on a particular chat product.
- Keep providers replaceable; OpenAI must never be the only usable provider.
- New files are delivered whole. Existing files are replaced whole.
- Preserve user isolation and server-side authorization boundaries.
- Never expose API keys, secrets, internal user data, or private deployment details.
- Every delivery must pass TypeScript checking and a production build.
- International-facing UI must use the shared `lib/i18n/index.ts` foundation.

## High-value next work

Validate the international edition end-to-end, then harden deployment and independent development workflows. Do not add more languages until the existing three are production-usable.

## Minimal prompt for another AI

> Read `aios-alpha.manifest.json`, `docs/AIOS-HANDOFF.md`, and `docs/aios-spec.md`, then inspect the latest `main`. Continue the manifest's `nextPriority` as one complete runnable module. Preserve existing capabilities, keep providers replaceable, extend the shared i18n system, and run `npx tsc --noEmit` plus `npm run build` before delivery.
