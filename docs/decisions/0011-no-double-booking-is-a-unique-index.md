# 0011 · No double booking is a unique index, not a check in the code

**Status:** Accepted · **Date:** 2026-10

## Context

Booking a common area is the first operation in this project where **two people can want the same
thing in the same second**. Everything before it — a visitor, a notice, a session — was one person
acting on their own record, and concurrency never had a chance to produce a wrong answer.

The `reservations` table arrived with [feature 005](../data-model.md#reservation) with nothing able
to write a row, and that feature recorded the gap rather than closing it: the data makes the check
*possible*, but nothing makes a double booking *impossible*.

Two residents tapping the same slot at the same moment must end with exactly one reservation. The
obvious implementation is the wrong one, and it is wrong in the way that is hardest to notice: read
the slot, see it free, insert. Two requests can both read "free" before either writes, and both
succeed. It passes every manual test and fails exactly when the system is busy — which is when a
party room is worth fighting over.

## Decision

A **unique index** on `reservations (common_area_id, date, start_minute)`, with the slot grid pinned
by a CHECK so that every row lands on one of eight start minutes.

The service does **not** read the slot before inserting. It inserts, and translates the unique
violation (Prisma `P2002`) into a `409 Conflict` saying the time was just taken.

## Why this works, and why it is small

The grid is fixed: eight two-hour slots, identical for every place and every day. Two bookings of the
same slot therefore carry *the same three column values*. That turns "no overlapping reservations"
from a question about intervals into a question about duplicate keys — the one thing a relational
database does without being asked twice.

Both inserts reach the index. One commits; the other is refused by Postgres itself, inside the write,
with no transaction to open and no lock to remember. The guarantee holds for the API, for the seed,
for a script, and for a second client written years from now.

## Alternatives considered

- **Check then insert in the service.** The failure the specification rejects by name. Two requests
  both read an empty slot, both insert, both succeed.
- **`SELECT … FOR UPDATE` on the common area row.** Correct, but serialises every booking of a place
  against every other booking of that place, needs an explicit transaction, and leaves the guarantee
  in code that a seed or a script bypasses.
- **An exclusion constraint over a time range** (`tsrange` + `btree_gist`). The right answer *if*
  periods were arbitrary. They are not — with a fixed grid, overlap can only mean equality. It would
  cost an extension, a column shape Prisma cannot model, and raw SQL in every query, to express
  something a unique index already expresses. If per-place opening hours ever make the grid variable,
  this is the decision to revisit, and this ADR is what to supersede.
- **`isolationLevel: "Serializable"`.** Moves a conflict the index can simply refuse into application
  retry logic, and slows every other write to buy it.

## What the database still cannot hold

The **60-day booking window** depends on what day it is, and a CHECK constraint may only call
immutable functions. So the grid and the uniqueness are properties of the data and live in the
schema; the window is a property of *when the request arrives* and lives in the service.

That asymmetry is worth stating, because it is not laziness and the next person will try to add
`CHECK (date <= CURRENT_DATE + 60)` and find out why Postgres refuses it. It is also an acceptable
difference in kind: a row 90 days out is odd but harmless, while two rows in one slot is a resident
standing outside a locked party room.

## Consequences

- The API gains **409** as a status, its first. It means the request was correct when it was written
  and is no longer correct now — distinct from `400` (wrong when written) and from `404`.
- `HttpErrorKind` in the app gains `"conflict"`, because a 409 is the only failure whose right answer
  is "show this message and refresh the list" rather than "something went wrong, try again".
- The slot grid now exists in three places: `server/src/condominiums/slot.ts`,
  `mobile/features/reservations/domain/slot.ts` and the CHECK. The first two are a deliberate
  duplication of the kind CLAUDE.md already records; the third is different in kind — the modules
  decide what to **offer**, the CHECK decides what may **exist**.
- Changing the grid is now a migration, not an edit. That is the point.

**Evidence:** [schema.prisma](../../server/prisma/schema.prisma),
[the migration](../../server/prisma/migrations/),
[reservation.service.ts](../../server/src/condominiums/reservation.service.ts)
