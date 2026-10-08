# 0015 · Changing the account asks for the password again, and a wrong one is not a 401

**Status:** Accepted · **Date:** 2026-10

## Context

Until feature 010 an account could be created and signed in to, and nothing else. Settings added
three operations on the caller's own account: change the e-mail, change the password, delete the
account. Each is something a person holding an unlocked phone could do to somebody else's account
if a session were enough.

Three things had to be decided, and the next sensitive route will face the same three.

## Decision

**All three ask for the current password again**, in the body, and are refused without it.

**None takes an account id.** `PATCH /me/email`, `PATCH /me/password` and `DELETE /me` act on the
account in the token. There is no id to tamper with.

**A wrong current password answers `400` on the field:**

```http
400 { "errors": { "currentPassword": "Current password is incorrect." } }
```

**Wrong passwords count toward the sign-in lockout**, with the same keys.

**Changing the password ends every session of the account and opens one** for the device that
asked, by **deleting** the account's renewal credentials and issuing a fresh pair.

**Deleting is refused for an administrator**, and for anyone a condominium's notices or found items
still point at.

## Why not 401

`401` is the obvious status for "wrong password", and it is wrong in this API. Here `401` means
*your session is no longer valid*, and the app is built on that: on a `401` the HTTP client renews
the session and repeats the request, and if that fails, signs the person out.

A mistyped password in a form would therefore trigger a pointless renewal, **send the wrong
password a second time** — counting twice against the lockout — and risk being shown as an expired
session. The person *is* authenticated. What failed is one field of a form, and the project already
has a shape for that which the form knows how to place under the field.

## Why the old renewal credentials are deleted, not revoked

The first implementation marked them revoked, as signing out everywhere does. It was wrong, and a
check against the running API caught it.

Renewing with a **revoked** credential is treated as a sign that it was copied, and ends every
session of the account (RN-AUT-04). So after a password change, the first *other* device to try
renewing — with a credential that had just been revoked on purpose — would end the new session too.
The person who had just changed their password would be signed out a few minutes later by their own
tablet.

Deleted credentials are simply unknown: the old device is refused and nothing else happens.

## Why deletion is refused for an administrator

Notices and found items belong to the condominium and record who published them; the foreign keys
that say so are `Restrict` on purpose (features 006 and 008). Deleting their author would either
fail at the database or, if the keys were loosened, orphan the condominium's own records.

There is no way in the app to hand a condominium to another administrator yet. Until there is, an
administrator cannot close their account through the app. That is a known limit, not an oversight.

The password is checked **before** the administrator rule, so the answer about the account's state
is only given to someone who proved they own it. A former administrator who published something and
is now a resident is refused by the database itself; the service translates that into the same kind
of explanation instead of a `500`.

## Consequences

- **Other devices are signed out within 15 minutes, not instantly.** They cannot renew from the
  moment the password changes, but each keeps the short-lived access it already holds until it
  expires — access tokens are verified without consulting the database (RN-AUT-06).
- **The app must store the credentials a password change returns.** Forgetting to is silent for a
  few minutes and then signs the person out.
- **Failures in the sign-in form and in Settings add up** toward the same lockout. Five guesses are
  five guesses wherever they are typed.
- **`DELETE /me` carries a body.** Unusual, and deliberate: the password must never travel in a URL,
  where it would be logged.
- **E-mail uniqueness is decided by the index**, not by a lookup before the write — the same reason
  as [ADR 0011](0011-no-double-booking-is-a-unique-index.md). The refusal does not say *why* the
  address cannot be used.
- **The e-mail changes at once, with no confirmation message**, because the system sends no e-mail.
  The current password is what protects the change.
- **The validation of the three bodies is mirrored** between
  [account.dto.ts](../../server/src/auth/account.dto.ts) and
  [account.ts](../../mobile/features/settings/domain/account.ts), message text included.

**Evidence:** [auth.service.ts](../../server/src/auth/auth.service.ts),
[auth.controller.ts](../../server/src/auth/auth.controller.ts),
[useAuth.tsx](../../mobile/features/auth/hooks/useAuth.tsx)

> **One exception, recorded in [0021](0021-a-join-request-is-a-row-that-an-answer-deletes.md) (2026-10).**
> Withdrawing a request to join — `DELETE /me/join-request` — removes the account without asking
> for the password. It works only while the request is pending, when the account holds nothing.
> `DELETE /me` is unchanged.
