# 0018 · A provisional account carries a restriction in its token

**Status:** Accepted · **Date:** 2026-10

## Context

Feature 014 lets the síndico bring an administrator and doormen into a condominium by **creating
their accounts**: a name, an e-mail and a provisional password, which the síndico then tells the
person. For as long as that password stands, two people can sign in as that account — and one of
the two roles is in charge of the building.

The requirement is that such an account can do **nothing** until its owner chooses a password, and
that this "cannot be skipped by any route". Hiding screens in the app does not do that.

The check has to sit where every protected route passes, and that is `authenticate`. But
`authenticate` verifies a signature and never touches the database, on purpose
([ADR 0007](0007-jwt-with-rotating-refresh-tokens.md), RN-AUT-06). And RN-AUT-05 says the access
token carries identity and nothing else, because a permission baked into a token cannot be
withdrawn before it expires.

## Decision

**The access token of an account whose password is provisional carries `prov: true`.** Every other
account's token is exactly what it was: `sub`, `iat`, `exp`.

**`authenticate` refuses a token with that claim, with `403`** and
`{ "message": "Choose a new password to continue.", "code": "passwordChangeRequired" }`.

**`authenticateAllowingProvisional` accepts it, and is used by two routes and no third**: `GET /me`,
so the app can learn that it must ask for a password, and `PATCH /me/password`, which is how the
account stops being provisional.

**There is no route for a "first password".** The person types the provisional password as
`currentPassword` in the ordinary password change, which already refuses an equal one, ends every
other session and issues a new pair. It gained one thing: it clears `users.password_is_provisional`
in the same `UPDATE` that writes the hash, and the pair it returns is signed without the claim.

**The síndico may set another provisional password only while the flag is still true**, and that
condition is inside the `UPDATE` itself.

## Why this does not break RN-AUT-05

That rule exists so that a token never grants something the database has since taken away. This
claim is the opposite of a grant:

- it only ever **removes** access, so a stale one errs on the closed side — too restricted, never
  too open;
- it is cleared in exactly one place, which hands over a fresh token on the spot;
- it never has to be **added** to a live session: an account is provisional from its creation, and
  nothing sets the flag back to true. That last property is load-bearing — a feature that made an
  existing account provisional again ("force a password reset") would need the sessions of that
  account deleted at the same moment, or this decision revisited.

## Alternatives considered

| Option | Why not |
|---|---|
| Read the user in `authenticate` | A query on every request of every account, to serve a state a handful of accounts are in for a few minutes — and the end of "verifying a token does not touch the database" |
| Check the flag in each service | Seven services today, and the next route forgets. The requirement is "any route" |
| Only gate the screens in the app | The API would still answer the provisional password with everything the role can do |
| Answer `401` | The app reacts to a `401` by renewing the session and repeating the request, and the renewed token carries the same claim: a loop. The same trap as [ADR 0015](0015-changing-the-account-asks-for-the-password-again.md) |
| A route that takes only the new password while provisional | A way to set a password with nothing but an open session, which ADR 0015 exists to prevent |
| The síndico generates an invitation instead of an account | Rejected by the product owner for this feature: the síndico creates the account |

## Consequences

- **Every route added to `authenticateAllowingProvisional` is something a person can do with a
  password somebody else knows.** `PATCH /me/email` and `DELETE /me` were deliberately left out.
- `refresh` reads one more column, in the query it already made.
- The person types the provisional password twice in a row the first time: to sign in, and on the
  screen that replaces it. A session restored days later would need the field anyway.
- The app's gate (`mustChoosePassword`, in the root layout) is courtesy. It comes before the
  condominium gate of [ADR 0013](0013-the-current-condominium-is-chosen-once-and-is-never-a-permission.md).
- A person who forgets the password they chose themselves cannot be helped by the síndico. Nothing
  recovers a password yet.

**Evidence:** [authenticate.ts](../../server/src/auth/authenticate.ts),
[auth.service.ts](../../server/src/auth/auth.service.ts) (`issueCredentials`, `refresh`,
`changePassword`), [auth.controller.ts](../../server/src/auth/auth.controller.ts),
[staff.service.ts](../../server/src/condominiums/staff.service.ts) (`setProvisionalPassword`),
[app/_layout.tsx](../../mobile/app/_layout.tsx)
