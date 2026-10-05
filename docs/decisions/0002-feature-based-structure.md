# 0002 · Organize the app by feature instead of MVVM layers

**Status:** Accepted · **Date:** 2026-09

## Context

The app was first organized in MVVM, with top-level folders by file type: `models/`,
`viewmodels/`, `services/`, `components/`, `data/`. The separation itself was idiomatic React — a
custom hook holding state, pure domain rules, a service doing I/O — but grouping by type made
every folder a drawer shared by all modules. The symptom was concrete: a generic date field in
`components/` imported ten calendar functions from `models/Visitante.ts`, because "pure rules had
to live in `models/`". With Reservations, Notices and Lost & Found planned, the drawers would only
get deeper.

## Decision

Group by functionality: `features/<name>/` holds that feature's `components/`, `hooks/`,
`services/`, `domain/`, its screen and an `index.ts` that is its public surface. `shared/` holds
what two or more features use. Route files in `app/` become one-line re-exports. Dependencies flow
`app/ → features/ → shared/`, and a feature imports another only through its `index.ts`.

The classic MVVM criticism — observable ViewModel classes and two-way binding fighting React — did
not apply here, since the "ViewModel" was already a hook. What changed was the folder layout and
the vocabulary, not the separation of concerns.

## Alternatives considered

- **Keep layer folders** — familiar, but scales badly past one module.
- **Feature-Sliced Design** — rigid layers and import rules; too much ceremony for a solo project.
- **Clean Architecture with use cases and repositories** — boilerplate disproportionate to the
  domain's complexity.

## Consequences

- A new module is a new folder, not files scattered across six drawers.
- Generic date logic moved to `shared/lib/calendar.ts`, so the date field no longer depends on
  the Visitor entity.
- `index.ts` files exist with a single export today; their value is the boundary they declare, not
  the code they hold.
- Promotion to `shared/` happens on the second use, which means some duplication is tolerated
  before an abstraction appears — the HTTP client currently lives inside the visitors feature for
  this reason.

**Evidence:** [mobile/features/](../../mobile/features), [mobile/shared/](../../mobile/shared),
[app/visitors.tsx](../../mobile/app/visitors.tsx)
