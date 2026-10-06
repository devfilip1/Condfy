# 0013 · The current condominium is chosen once, gates the app, and is never a permission

**Status:** Accepted · **Date:** 2026-10

## Context

A person can belong to more than one condominium, with a different role in each. The data has
allowed it from the start, and the API has always taken the condominium in the path of each
request and checked the caller's membership there.

The app handled it quietly. Since feature 006 it has kept a "selected condominium" in the auth
context: it picked the first one, remembered the last on the device indefinitely, and let two
modules — Reservations and Lost & Found — change it through a strip at the top of their screens.
The home screen ignored it altogether: one fixed picture for every building, and a header listing
the person's units from all of them.

So the first thing the whole app needs to know — which building am I in — was decided by nobody,
shown nowhere, and changeable from inside two unrelated screens.

## Decision

**The person chooses, once, at sign-in.** Someone with two or more condominiums is shown a chooser
after signing in and before anything else. Someone with one never sees it.

**Nothing renders until the answer is known.** The auth context derives a gate:

```ts
type CondominiumGate = "resolving" | "choose" | "failed" | "open";
```

and the root layout — the one place every route passes through — obeys it: no route while
`resolving`, only `/choose-condominium` while `choose` or `failed`.

**The choice lives on the device and lasts as long as the session.** It is cleared when credentials
are typed and when the session ends, kept when the app is reopened with a stored session, and
validated against the profile every time it is read.

**It is never a permission.** No route receives a "current condominium" — not in a header, not in
the token, not stored on the server. Every route still takes its condominium in the path and checks
membership, whatever the app has selected.

**There is one place to switch: the home screen.** The per-module strips are gone, and the shared
picker component with them.

## Why the gate is in the root layout

The requirement is that the home screen and every module are unreachable before the choice, by
navigation **and by direct link**. A check inside the home screen covers the first and misses the
second: `/reservations` typed into a browser never passes through home. The root layout already
plays this role for signing in.

`resolving` rendering nothing is the important part. The app used to draw the home screen while the
profile loaded; with a chooser that would flash the home of someone about to be asked.

## Alternatives considered

- **A guard in each screen.** Five places to forget, and the sixth module would forget.
- **The chooser as a modal over the home screen.** The home screen would be mounted, and loading,
  underneath.
- **Ask on every launch.** Taxes the commonest action to serve the rarest. Rejected in
  clarification.
- **Keep remembering the choice across sign-outs.** Then the chooser would be skipped at the very
  moment it is supposed to appear, and a second person on a shared device would inherit a building.
- **Send the selection to the server as context.** It would turn a convenience into something the
  server has to trust or re-check, for no gain: the condominium is already in every path.
- **Keep the strips and add the chooser.** Two places to change one thing, and two screens able to
  disagree about which building is current.

## Consequences

- **A new module must not bring a picker back.** It reads `selectedCondominiumId` or
  `currentMembership` from `@/features/auth`, and that is all.
- **The home screen follows the current membership**: the banner is that condominium's photo, the
  header shows the units there, and modules are filtered by the role there — not by the union of
  the person's roles everywhere.
- **A failed profile load sends everyone to the chooser's error state**, including people who would
  have had a single condominium. Without the profile the app cannot know whether to ask.
- **The choice is cleared at sign-in as well as at sign-out.** Clearing at sign-out alone would
  almost do it; a sign-out that could not reach storage would leave a building behind.
- **The condominium's photo travels in `GET /me`**, not in a route of its own. The profile is built
  from the caller's own memberships, so it cannot carry a condominium that is not theirs.
- **`GET /visitors` is still not scoped by condominium.** The visitors screen now filters by the
  current one, which makes it agree with the rest of the app and protects nothing. Closing that gap
  is a permission change and belongs to its own feature
  ([business-rules.md](../business-rules.md#inconsistencies-and-gaps-found)).

**Evidence:** [useAuth.tsx](../../mobile/features/auth/hooks/useAuth.tsx),
[app/_layout.tsx](../../mobile/app/_layout.tsx),
[useCondominiumChoice.ts](../../mobile/features/condominiums/hooks/useCondominiumChoice.ts),
[selectedCondominium.ts](../../mobile/features/auth/services/selectedCondominium.ts)
