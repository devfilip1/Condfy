# 0005 · Hash passwords with `scrypt` from Node's standard library

**Status:** Accepted · **Date:** 2026-09

## Context

User accounts need a password that can be verified later and never recovered. The project rule is
to exhaust the platform before adding a dependency, and the server had, at that point, no
authentication code at all — only a seed script creating sample users.

## Decision

`scrypt` from `node:crypto`, with parameters following the OWASP recommendation
(`N = 2^17`, `r = 8`, `p = 1`, 64-byte key, 16-byte random salt per password). The stored value
encodes its own parameters: `scrypt$N$r$p$salt$hash`, base64url. Verification re-derives with the
parameters found in the stored value and compares in constant time.

## Alternatives considered

- **argon2** — OWASP's first choice, but the Node binding ships a native binary, adding a
  compilation step and a platform-specific dependency.
- **bcrypt** — also native, and limited to 72 bytes of input.
- **A plain hash (SHA-256) with a salt** — fast by design, which is exactly wrong for passwords.

## Consequences

- No new dependency; hashing works anywhere Node runs.
- Deriving a key at these parameters uses 128 MiB of memory, above Node's default `maxmem`, so the
  call passes an explicit 256 MiB limit. Many concurrent logins will be memory-hungry — worth
  revisiting when real authentication traffic exists.
- Because the parameters live in the stored value, they can be raised later without invalidating
  existing passwords: old values keep verifying with their own parameters.
- A malformed stored value never verifies, rather than throwing.

**Evidence:** [server/src/lib/password.ts](../../server/src/lib/password.ts),
[seed.ts](../../server/prisma/seed.ts)
