# 0006 · English database, Portuguese API contract

**Status:** Superseded by [0008](0008-english-everywhere.md) · **Date:** 2026-09

## Context

The domain vocabulary is Portuguese — `Visitante`, `dataPrevista`, `autorizadoPor` — and the app
was built on it, including the validation messages the API returns, which the form displays under
each field. The first table followed the same vocabulary (`visitantes`, `data_prevista`). When the
condominium model arrived, mixed-language SQL became a real cost: `SELECT` statements combining
`condominium_members` with `visitantes`, and tooling, examples and Prisma conventions that assume
English.

## Decision

Everything persisted is English: tables, columns, enum values and the Prisma models. The JSON
contract stays Portuguese, unchanged, so no app code had to move. The resource **service** is the
single place where the two vocabularies meet — it maps `visitante | entrega | prestador` to
`visitor | delivery | service_provider` and back, and renames every field.

The existing table was renamed in a migration (`ALTER TABLE … RENAME`), keeping the rows.

## Alternatives considered

- **Portuguese everywhere** — keeps one vocabulary, but fights every tool and every SQL example.
- **English everywhere, including the contract** — cleanest in theory, but it would rewrite the
  app's domain, its components and its validation messages for no user-facing gain.
- **Translating in the controller** — would spread mapping tables across route handlers instead of
  keeping them in one service.

## Why it was superseded

The boundary worked, but it meant every reader crossed a language line, and every new resource had
to repeat the mapping. On 2026-09-30 the author decided to move the whole project to English —
contract included — which removes the translation entirely. See
[ADR 0008](0008-english-everywhere.md).

## Consequences

- Reading the code requires crossing one language boundary, always in the same file.
- Any new resource must repeat the pattern: English persistence, Portuguese contract, translation
  in the service.
- The mapping tables are exhaustive `Record` types, so adding an enum value fails to compile until
  both directions are updated.
- A field renamed in the database is invisible to the app, which is the point.

**Evidence:** [visitor.service.ts](../../server/src/visitors/visitor.service.ts),
[rename migration](../../server/prisma/migrations/20260929040257_rename_visitors_to_english/migration.sql),
[schema.prisma](../../server/prisma/schema.prisma)
