# Decisions

Architectural decisions someone could reasonably question or want to revert. Each one records the
forces at the time, the alternatives, and what it costs.

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-split-mobile-and-server.md) | Split the repository into `mobile/` and `server/` | Accepted | 2026-09 |
| [0002](0002-feature-based-structure.md) | Organize the app by feature instead of MVVM layers | Accepted | 2026-09 |
| [0003](0003-fastify-and-native-typescript.md) | Fastify plus Node's native TypeScript, no build step | Accepted | 2026-09 |
| [0004](0004-integrity-rules-in-the-database.md) | Enforce integrity rules in PostgreSQL | Accepted | 2026-09 |
| [0005](0005-scrypt-for-passwords.md) | Hash passwords with `scrypt` from Node's standard library | Accepted | 2026-09 |
| [0006](0006-english-database-portuguese-contract.md) | English database, Portuguese API contract | Superseded by 0008 | 2026-09 |
| [0007](0007-jwt-with-rotating-refresh-tokens.md) | Short-lived JWT plus an opaque rotating renewal credential | Accepted | 2026-09 |
| [0008](0008-english-everywhere.md) | English everywhere: code, contract and database | Accepted | 2026-09 |
| [0009](0009-visitors-belong-to-a-unit-and-a-membership.md) | A visit belongs to a unit and to a membership | Accepted | 2026-10 |

Decisions reconstructed from code carry the status `Reconstructed`. When a decision replaces
another, the old one becomes `Superseded by NNNN` and is kept.
