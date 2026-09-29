# 0003 · Fastify plus Node's native TypeScript, with no build step

**Status:** Accepted · **Date:** 2026-09

## Context

The server had to be chosen from scratch. Two sub-decisions were entangled: which HTTP framework,
and how to run TypeScript on the server. The project's guiding principle is to prefer what the
platform already offers and to justify every new dependency in writing.

## Decision

**Fastify 5** with `@fastify/cors`, and **Node's native TypeScript execution** — no `tsx`, no
`tsc` build, no `nodemon`, no `dotenv` at runtime. The scripts are plain Node:
`node --watch --env-file=.env src/server.ts`.

Running `.ts` directly requires three things together: `"type": "module"` in the package, the
Prisma generator emitting `importFileExtension = "ts"` and `moduleFormat = "esm"`, and relative
imports written with the `.ts` extension. `tsconfig` sets `erasableSyntaxOnly`, so the compiler
rejects any syntax Node cannot simply strip (`enum`, `namespace`, parameter properties).

## Alternatives considered

- **`node:http` alone** — zero dependencies, but hand-written routing, body parsing and CORS that
  every future module would re-implement.
- **Express 5** — four packages (`express`, `cors` and their types) for the same result, without a
  built-in logger.
- **Hono** — needs an adapter to run on Node; its edge portability is not useful here.
- **`tsx`** — would resolve the Prisma Client's `.js`-style imports transparently and remove the
  three-part setup above, at the cost of one more dependency.
- **Compiling with `tsc` to `dist/`** — an extra build step and a generated folder, with no
  benefit during development.

## Consequences

- Four runtime dependencies on the server: Fastify, its CORS plugin, the Prisma adapter and `pg`.
- No build step: what runs is what is written.
- The three-part setup is fragile in a specific way — if the Prisma generator options are lost,
  the server stops booting with an error about `./enums.js`. That is the first thing to check.
- `erasableSyntaxOnly` forbids TypeScript `enum`, which is why enum-like values come from the
  generated Prisma enums or from union types.

**Evidence:** [server/package.json](../../server/package.json),
[server/tsconfig.json](../../server/tsconfig.json),
[schema.prisma](../../server/prisma/schema.prisma) (generator block)
