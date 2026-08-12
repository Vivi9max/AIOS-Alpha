# AIOS Alpha — Independent Development Handoff

This file is the durable starting point for any human or AI continuing the project.

## Current checkpoint

- Release: C130
- Product direction: multilingual international edition first
- Supported interface languages: English, Simplified Chinese, Japanese
- Runtime: Next.js 16, React 19, TypeScript
- Primary constraint: the system must remain useful and developable without ChatGPT Plus

## C130

Dashboard and Settings now participate in the shared language state through `WorkspaceShell` and the route-scoped `LegacyPageLocalizer`. The adapter preserves existing dashboard/settings data flows and translates rendered UI text on `/dashboard` and `/settings` without changing server APIs or provider routing.

## Resume protocol

1. Read `/aios-alpha.manifest.json`.
2. Read this handoff.
3. Read `/docs/aios-spec.md`.
4. Preserve existing working capabilities.
5. Run typecheck and production build before delivery.

## Current capability baseline

- Shared browser-persisted language state
- English, Simplified Chinese and Japanese global navigation
- Runtime handoff API and continuity page
- Localized workspace, tasks, planner, runtime, projects, outcomes, memory and execution observability
- Localized dashboard and settings flows

## Non-negotiable engineering rules

- Preserve working capabilities and never regress a more advanced implementation.
- Deliver complete runnable modules, not isolated fragments.
- Keep model providers replaceable and avoid a mandatory ChatGPT dependency.
- Add internationalized UI through the shared i18n foundation.
- Run typecheck and production build before delivery.

## High-value next work

Validate the international edition end-to-end, then harden deployment and independent development workflows. Do not add more languages until the existing three are production-usable.

## Minimal prompt for another AI

Continue AIOS Alpha from C130. Read `aios-alpha.manifest.json`, `docs/AIOS-HANDOFF.md`, and `docs/aios-spec.md` first. Preserve all working capabilities, avoid mandatory ChatGPT dependency, use the shared i18n foundation, and deliver a complete runnable module with typecheck and production-build validation.
