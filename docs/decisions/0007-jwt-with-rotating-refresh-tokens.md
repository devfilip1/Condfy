# 0007 · Short-lived JWT plus an opaque rotating renewal credential

**Status:** Accepted · **Date:** 2026-09

## Context

The app had no accounts at all: every route was open to anyone on the network. Sessions had to
survive closing the app for weeks without asking for the password again, and had to be revocable —
signing out must end that device's access, and a stolen credential must stop working. Those two
requirements pull in opposite directions: a token that proves identity without a database lookup
is fast, but cannot be taken back.

The same problem had already been solved in the author's other project, ListToDo, and that shape
was adopted here after comparing both.

## Decision

Two credentials with different jobs, and **no session table**.

- **Access:** a JWT signed with HS256, valid for 15 minutes, carrying only `sub`, `iat`, `exp` and
  `iss`. Verified by `@fastify/jwt` without touching the database.
- **Renewal:** 32 random bytes, opaque, stored only as a SHA-256 hash, with its own 30-day
  deadline. Every use rotates it: the old row is revoked and a new one is issued **with a fresh
  30-day deadline**.

A session is therefore the chain of renewal credentials of a user, not a row somewhere. Opening
the app at least once a month keeps a person signed in indefinitely; 30 days away ends it.

The swap is a compare-and-swap in the database:

```ts
const { count } = await prisma.refreshToken.updateMany({
  where: { id: atual.id, revokedAt: null },
  data: { revokedAt: new Date() },
});
```

Exactly one concurrent request can get `count === 1`. Anyone presenting an already-revoked
credential — a thief with a copy, or the loser of that race — causes **every** renewal credential
of that user to be revoked, on every device.

## Alternatives considered

- **A `sessions` table owning a fixed deadline and per-device revocation** (the first
  implementation here). It buys "sign out this device only" on reuse and the ability to list
  active sessions, at the cost of a second table and a session that dies 30 days after sign-in
  even for daily users. Dropped: the sliding model keeps people signed in, which is what the
  product wants, and revoking everything on suspicion is the safer default.
- **Server-side sessions with an `HttpOnly` cookie** — the strongest option for a browser, and
  revocation is trivial. Rejected because the client is a React Native app where cookies are
  awkward, and every request would hit the session store.
- **A long-lived JWT with no renewal** — one credential, no tables, no rotation. Rejected: it
  cannot be revoked, so signing out would be a lie.
- **A JWT as the renewal credential** — pointless. Revocation already requires database state, so
  a signed token buys nothing.
- **`scrypt` for the renewal credential's hash** — it exists to slow down guessing low-entropy
  secrets. A 32-byte random value has no dictionary, and the cost (128 MiB per verification) would
  be paid on every renewal.

## Consequences

- Verifying a request costs no database query, which is the whole point of the short lifetime.
- A deleted or compromised account keeps access for at most 15 minutes; renewal is refused at once.
- One table instead of two, and revoking everything is one `updateMany` on `user_id`.
- **A lost response followed by a retry is indistinguishable from a stolen copy**, and signs the
  person out of every device. The app renews once at a time, so it does not cause this itself, but
  a dropped connection at the wrong moment can. Accepted deliberately: treating reuse as theft is
  the safe reading.
- Every rotation leaves a revoked row behind. Harmless at this scale; a cleanup job becomes
  worthwhile when the table grows.
- Rotation and reuse detection have many paths and no automated tests. This is the first code to
  cover when a test framework arrives.

**Evidence:** [auth.service.ts](../../server/src/auth/auth.service.ts),
[authenticate.ts](../../server/src/auth/authenticate.ts),
[tokens.ts](../../server/src/lib/tokens.ts),
[http.ts](../../mobile/features/auth/services/http.ts)
