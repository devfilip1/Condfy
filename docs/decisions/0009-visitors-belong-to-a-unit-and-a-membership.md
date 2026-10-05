# 0009 · A visit belongs to a unit and to a membership

**Status:** Accepted · **Date:** 2026-10

## Context

The `visitors` table was the first thing the project built, months before condominiums, units and
users existed. It had no foreign key to any of them: `authorized_by` was free text, and every
visitor was therefore visible to every client of the API. [ADR 0001](0001-split-mobile-and-server.md)
and [data-model.md](../data-model.md) both recorded this as the largest gap between the two halves
of the model, and [business-rules.md](../business-rules.md) listed the questions the feature closing
it would have to answer.

Three of those questions were open:

1. Does the visit point at the unit alone, with the condominium reached through it, or at both?
2. Does `authorized_by` become a foreign key, and to what?
3. What happens to the rows already registered, which have no condominium to point at?

Question 2 is the one with consequences beyond the schema, because the target decides **who is
allowed to authorize a visit**. Pointing at `unit_residents` would mean only someone who lives in
the very unit being visited can do it. In a real building the doorman registers most visits, and a
manager may not live in the condominium at all.

## Decision

`visitors` gains three columns — `authorized_by_id`, `unit_id` and `condominium_id` — and the free
text `authorized_by` is dropped. Two composite foreign keys carry all the integrity:

```
(unit_id, condominium_id)         → units(id, condominium_id)
(authorized_by_id, condominium_id) → condominium_members(user_id, condominium_id)
```

`condominium_id` is repeated on the row on purpose. That repetition is what lets both keys resolve
to the same condominium, and it is the same device `unit_residents` already uses (research R-002).
**No trigger was needed**: the two keys are declarative and cannot be bypassed.

The visit points at the **membership**, not at the residence. So a resident, a manager and a doorman
can all authorize a visit, as long as they belong to the condominium the unit is in.

In the HTTP contract, `POST /visitors` receives only `unitId`. The condominium is read from the unit
and `authorized_by_id` comes from the token, so the request body cannot choose either
([ADR 0007](0007-jwt-with-rotating-refresh-tokens.md) put the identity in the token; this is the
first route that consumes it).

The rows that already existed were deleted, which the author authorized explicitly. There was one,
in a development database.

## Alternatives considered

- **Foreign key to `unit_residents`** — the strongest guarantee available: the database would prove
  that whoever authorized the visit lives in the unit. Rejected because it locks out the doorman and
  any manager without a unit, which is the opposite of how a front desk works.
- **Three independent foreign keys plus triggers** — one key each to `users`, `condominiums` and
  `units`, with hand-written constraint triggers to check that the unit and the user belong to the
  same condominium. Rejected: it reimplements in PL/pgSQL what a composite key already does, and it
  departs from the pattern the rest of the schema follows.
- **`condominium_id` only, with no unit** — simpler, but then a visit cannot be shown to the
  household it belongs to, which is the point of the feature that follows.
- **Keeping `authorized_by` as free text alongside the key** — would let the doorman record a name
  typed by hand. Rejected for now: two sources for the same fact, and the name is one join away.

## Consequences

- Who may authorize a visit is now a property of the schema rather than of application code. Making
  it stricter later means changing a foreign key and a migration, not an `if`.
- `POST /visitors` requires `unitId`, so the app's visitor form is out of date until it sends one:
  the free text field has to become a unit picker. The duplicated validation in
  [visitor.ts](../../mobile/features/visitors/domain/visitor.ts) and
  [visitor.dto.ts](../../server/src/visitors/visitor.dto.ts) must move together, as always.
- The response shape changed: `authorizedBy` is now an object (`id`, `name`) and `unit` is an object
  (`id`, `block`, `number`), instead of one free-text field.
- Unknown unit and unit-of-another-condominium get the **same** rejection, so the API does not
  reveal which units exist.
- `GET /visitors` still returns every condominium's visitors. The schema now makes scoping possible,
  but what each role may see is a decision for the resident feature, not this one.

**Evidence:** [schema.prisma](../../server/prisma/schema.prisma),
[link_visitors_to_unit_and_member](../../server/prisma/migrations/20261002155125_link_visitors_to_unit_and_member/migration.sql),
[visitor.service.ts](../../server/src/visitors/visitor.service.ts)
