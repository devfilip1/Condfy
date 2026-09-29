# 0004 · Enforce integrity rules in PostgreSQL, not only in application code

**Status:** Accepted · **Date:** 2026-09

## Context

The condominium model has rules that are easy to state and easy to break: one manager per
condominium, a unit identifier unique within its condominium, an e-mail unique system-wide, a
resident who must live in at least one unit, residency that cannot cross condominiums. At the time
of the decision there were no API routes for any of it — the only writer was a seed script, and
future writers (routes, imports, manual fixes) were unknown.

## Decision

Every rule that can be expressed in the database is expressed there:

| Rule | Mechanism |
|---|---|
| Trimmed, non-empty names; uppercase unit identifiers; lowercase, well-formed e-mail | `CHECK` constraints |
| Unit identity, e-mail uniqueness | Unique indexes |
| Unit without block; one manager per condominium | Partial unique indexes (`WHERE …`) |
| Residency confined to one condominium | Composite foreign keys sharing `condominium_id` |
| A resident lives in at least one unit | Two `CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED` running one shared function |

Normalization is not performed by the database: it *rejects* values that are not already
normalized, so callers must lowercase or uppercase before writing.

## Alternatives considered

- **Validate in application services only** — the natural place for rules, but it protects only
  the paths that go through those services; the seed, a script or a psql session would bypass it.
- **Case-insensitive comparison (`citext`, `lower()` indexes)** — works, but leaves the stored
  value free-form, so the same unit can be displayed three different ways.
- **Immediate triggers instead of deferred** — impossible for "a resident has at least one unit",
  since the membership necessarily exists for an instant before its first residency row.

## Consequences

- The rules survive any writer, including future ones nobody has designed yet.
- Violations surface as database errors, not friendly messages; any API route that writes this
  data will need to translate them.
- The rules live in SQL inside a migration, not in TypeScript, so they are invisible to someone
  reading only the application code — hence [business-rules.md](../business-rules.md).
- Prisma cannot express most of them; they are appended by hand to the generated migration, and
  the Prisma schema carries comments pointing at that file.

**Evidence:** [create_users_condominiums migration](../../server/prisma/migrations/20260929040409_create_users_condominiums/migration.sql),
[schema.prisma](../../server/prisma/schema.prisma)
