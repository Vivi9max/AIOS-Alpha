# C141 — GitHub Direct Bridge

This module connects AIOS Alpha server-side execution to GitHub through `GITHUB_TOKEN`.

## Files

- `lib/github/bridge.ts` — server-only GitHub REST client.
- `app/api/github/route.ts` — protected AIOS GitHub Bridge API.

## Required Vercel environment variables

### Required

`GITHUB_TOKEN`

Use a GitHub fine-grained personal access token scoped to `Vivi9max/AIOS-Alpha`.

For the current bridge, grant:

- Repository access: `Vivi9max/AIOS-Alpha`
- Contents: Read and write

GitHub documents repository `Contents` permissions for repository content API operations.

### Existing AIOS protection

The bridge uses:

1. `GITHUB_BRIDGE_SECRET` if configured; otherwise
2. existing `CRON_SECRET`

The secret is required on every bridge request and is never returned by the API.

## Optional

- `GITHUB_REPOSITORY` — defaults to `Vivi9max/AIOS-Alpha`
- `GITHUB_DEFAULT_BRANCH` — defaults to `main`
- `GITHUB_API_URL` — defaults to `https://api.github.com`

## API

All requests require either:

`x-aios-bridge-secret: <secret>`

or

`Authorization: Bearer <secret>`

### Status

`GET /api/github?action=status`

Returns authenticated GitHub account information and bridge state without exposing the token.

### Repository

`GET /api/github?action=repo`

### Read file

`GET /api/github?action=read&path=README.md&ref=main`

### List path

`GET /api/github?action=list&path=app/api&ref=main`

### Write file

`POST /api/github`

```json
{
  "action": "write",
  "repo": "Vivi9max/AIOS-Alpha",
  "path": "docs/example.md",
  "content": "# Example",
  "message": "feat(c141): write through GitHub Direct Bridge",
  "branch": "main"
}
```

For updating an existing file, include its current blob SHA as `sha`.

## Security

- `GITHUB_TOKEN` is server-only.
- Do not prefix it with `NEXT_PUBLIC_`.
- Do not commit it to Git.
- Do not expose it in API responses.
- Write operations are protected by the AIOS bridge secret.
