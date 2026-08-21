# AIOS Alpha Specification

> Canonical engineering specification for AIOS Alpha.

## Project

Name: AIOS Alpha

Mission: An AI Operating System that converts long-term goals into executable outcomes, continuously learns from execution, and evolves through accumulated knowledge.

Current Stage: Private Alpha

Current Release: C133

## Core Architecture

Dashboard / Planner / Outcomes / Tasks / Memory / Knowledge / Runtime / Founder Console / User Profile / Storage / APIs

## Core Engines

### Planner Engine

Status: Active

Responsibilities:
- Planning
- Prioritization
- Next Action
- Execution Queue

### Execution Engine

Status: Active

Responsibilities:
- Execute Tasks
- Update Progress
- Sync Milestones
- Complete Outcomes

### Execution Memory

Status: Active

Responsibilities:
- Store execution history
- Runtime metrics
- Planner history
- Learning context

### Knowledge Engine

Status: Planned

Responsibilities:
- Long-term knowledge
- Retrieval
- Experience synthesis
- Planner optimization

## Internationalization

Status: Active

Supported locales:
- en
- zh-CN
- ja

Dashboard and Settings: Localized

Workspace and execution surfaces: Localized

## Independent Development

Status: Active

Capabilities:
- Project continuity verification
- TypeScript typecheck
- Production build verification
- GitHub Actions CI
- Node 24 CI runtime
- Provider-independent deployment health endpoint
- Provider-independent deployment verification
- Automated deployment verification after successful deployment status

## Deployment Health

Endpoint:

`GET /api/health`

Purpose:

Confirm that the deployed AIOS Alpha application is running and its canonical release manifest is available.

The endpoint must not require an AI provider or API key.

Verification command:

`npm run verify:deployment -- https://your-domain.example`

## Release Verification

Pipeline:

`Commit → CI → Build → Deployment → Deployment Status → /api/health → Deployment Verified`

Manual fallback:

`GitHub Actions → AIOS Alpha Deployment Verify → Run workflow → base_url`

## Engineering Rules

1. Preserve existing working capabilities.
2. Do not replace a more advanced implementation with a weaker shortcut.
3. Keep model providers replaceable.
4. Avoid mandatory ChatGPT dependency.
5. Prefer complete runnable modules.
6. Run verification, typecheck and production build before delivery.
7. Verify deployed applications independently of AI provider availability.
8. Prefer automated release verification after successful deployment.
