# 0001 · Split the repository into `mobile/` and `server/`

**Status:** Accepted · **Date:** 2026-09

## Context

The project started as a single Expo application. When persistence arrived, the backend was first
added as a folder inside the app project. That immediately caused friction: the app's `tsconfig`
type-checked server files, its ESLint configuration linted them with React rules, and a single
`node_modules` would have mixed React Native packages with database drivers. Worse, nothing
structurally prevented someone from importing the Prisma Client — and therefore the database
credentials — into code that ships to a phone.

## Decision

Two independent projects in one repository: `mobile/` and `server/`, each with its own
`package.json`, `tsconfig.json`, `node_modules` and verification commands. The only contract
between them is HTTP over JSON.

## Alternatives considered

- **Single project with subfolders** — what was tried first; the tooling boundaries do not hold.
- **Two repositories** — a real boundary, but a solo developer would pay for two clones, two
  histories and cross-repository coordination on every contract change.
- **A shared package for types** — tempting for the contract, but it would couple the build of a
  React Native bundle to the build of a Node server.

## Consequences

- The phone can never reach the database: Prisma and `DATABASE_URL` live only in `server/`.
  Verified by inspecting a production bundle — neither string appears in it.
- Two terminals and two `npm install`s to develop.
- The JSON contract is duplicated as types on both sides and must be kept in sync by hand, which
  is why [api.md](../api.md) treats the error message text as part of the contract.

**Evidence:** [mobile/package.json](../../mobile/package.json),
[server/package.json](../../server/package.json), [root README](../../README.md)
