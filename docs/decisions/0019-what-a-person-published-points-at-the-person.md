# 0019 · What a person published points at the person, not at their membership

**Status:** Accepted · **Date:** 2026-10

## Context

A notice and a found item each record who published them. Until feature 014 that column was half of
a **composite foreign key to the membership** — `(published_by_id, condominium_id)` →
`condominium_members(user_id, condominium_id)` — with `ON DELETE RESTRICT`.

It bought two things. The database proved that whoever published belonged to that condominium
([ADR 0010](0010-permission-rules-live-in-the-service.md): "the schema guarantees membership, the
service guarantees role"). And the `Restrict` was meant to keep the board when an administrator was
replaced: a notice is the condominium speaking, and must not vanish with a person.

But nothing replaced an administrator then. What the `Restrict` actually did was make the
membership of anybody who had published a single notice **impossible to delete**.

Feature 014 lets the síndico remove an administrator. With the key as it was, removing one who had
ever published would fail in the database — and the requirement is the reverse: the person goes,
and everything the condominium keeps stays.

## Decision

**`notices.published_by_id` and `found_items.posted_by_id` are simple foreign keys to `users`**,
still `ON DELETE RESTRICT`. One migration swaps the two constraints; no row changes, because both
columns already held user ids.

**The display name is worked out from two things that may now disagree**: the author's name comes
from the user, and the author's role from their membership *in that condominium*, which may no
longer exist. `displayNameOf` accepts `role: null` and answers with the person's own name — what
RN-MEM-04 already said about somebody who is no longer the administrator.

## Alternatives considered

| Option | Why not |
|---|---|
| Hand the notices to the síndico on removal, **instead of** re-pointing the key | Rewrites who published them while the person still has an account to be named by. (It became part of the removal after all — see the note at the end — but on top of this decision, not in place of it) |
| A `removedAt` on the membership instead of deleting it | Every query on memberships in seven services would have to remember to exclude it, and forgetting one is a removed person who still gets in |
| `ON DELETE SET NULL` on the composite key | The column is half of a two-column key whose other half is the notice's own condominium; it cannot be nulled alone |
| Cascade | Loses the board, which is the one thing the original rule was right about |

## Consequences

- **The database no longer guarantees that whoever published belonged to that condominium.** The
  service does: `publishNotice` and `postFoundItem` read the membership and its role before
  writing. A membership that ends is now precisely the case the column has to allow. This amends
  the sentence of ADR 0010 quoted above; the rest of that decision stands.
- **The account of somebody who published still cannot be deleted.** `deleteAccount` turns the same
  `P2003` into the same explanation as before.
- A removed administrator's notices show their **personal name** to the residents, where they used
  to read "Administrator". This follows RN-MEM-04 and was accepted with it.
- Visits and reservations are untouched: they still point at the membership and still leave with
  it, on purpose.
- **A query that assumes the author has a membership turns the newsletter into a `500`** the first
  time somebody is removed. `noticeColumns` in `notice.service.ts` is where that is handled.

## Later the same day: removal also deletes the account

The product owner decided that removing a person deletes the account the síndico created for them.
That did not undo this decision; it added a step that depends on it:

- the membership is deleted first, which is only possible because of the re-pointed keys;
- the notices and found items the person published **in that condominium** are handed to the
  síndico who removed them — the `RESTRICT` on `users` would otherwise refuse the next step, and
  there is no person left to name;
- the account is deleted.

When the account is **kept** — it belongs to another condominium, or published something another
condominium keeps — nothing is handed over, and the consequences above apply as written.

**Evidence:** migration `20261007130002_point_authors_at_users`,
[schema.prisma](../../server/prisma/schema.prisma),
[notice.service.ts](../../server/src/condominiums/notice.service.ts),
[displayName.ts](../../server/src/lib/displayName.ts),
[staff.service.ts](../../server/src/condominiums/staff.service.ts) (`removeStaffMember`)
