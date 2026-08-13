# AIOS Alpha — Independent Development Handoff

## Current checkpoint

- Release: C132
- Product direction: multilingual international edition first
- Supported interface languages: English, Simplified Chinese, Japanese
- Runtime: Next.js 16, React 19, TypeScript
- Primary constraint: the system must remain useful and developable without ChatGPT Plus

## C132

C132 turns deployment readiness into a real, provider-independent capability.

Added:
- `GET /api/health` application health endpoint.
- Health response exposes the current AIOS Alpha release from the canonical manifest.
- `npm run verify:deployment -- <URL>` checks a deployed instance.
- Manifest and handoff now record deployment health and verification capabilities.
- The canonical engineering specification is synchronized to the current release.

The health endpoint does not call an AI provider and does not require an API key.

## Local verification

```bash
npm install
npm run verify
npm run typecheck
npm run build
npm start
```

Then:

```bash
npm run verify:deployment -- http://localhost:3000
```

For a deployed application:

```bash
npm run verify:deployment -- https://your-domain.example
```

## Resume protocol

1. Read `/aios-alpha.manifest.json`.
2. Read this handoff.
3. Read `/docs/aios-spec.md`.
4. Preserve existing working capabilities.
5. Run `npm run verify`, `npm run typecheck`, and `npm run build`.
6. After deployment, run `npm run verify:deployment -- <deployed-url>`.

## Current capability baseline

- Shared browser-persisted language state
- English, Simplified Chinese and Japanese global navigation
- Localized workspace, tasks, planner, runtime, projects, outcomes, memory and execution observability
- Localized dashboard and settings flows
- Provider-independent architecture
- Independent repository verification and GitHub Actions CI
- Provider-independent deployment health and verification

## Non-negotiable engineering rules

- Preserve existing working capabilities and never regress a more advanced implementation.
- Deliver complete runnable modules, not isolated fragments.
- Keep model providers replaceable and avoid a mandatory ChatGPT dependency.
- Add internationalized UI through the shared i18n foundation.
- Run verification, typecheck and production build before delivery.
- Verify deployed applications without depending on an AI provider.

## High-value next work

Harden deployment and independent development workflows, then connect deployment verification to release automation.
