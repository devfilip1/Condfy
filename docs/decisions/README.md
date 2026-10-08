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
| [0010](0010-permission-rules-live-in-the-service.md) | Permission rules live in the service; 403 for a member, 404 for an outsider | Accepted · amended in part by 0019 | 2026-10 |
| [0011](0011-no-double-booking-is-a-unique-index.md) | No double booking is a unique index, not a check in the code | Accepted | 2026-10 |
| [0012](0012-files-live-in-the-database-and-are-served-by-signed-paths.md) | Files live in the database and are served by signed paths | Accepted | 2026-10 |
| [0013](0013-the-current-condominium-is-chosen-once-and-is-never-a-permission.md) | The current condominium is chosen once, gates the app, and is never a permission | Accepted | 2026-10 |
| [0014](0014-colours-come-from-context-and-styles-are-made-from-the-palette.md) | Colours come from context, and styles are made from the palette | Accepted | 2026-10 |
| [0015](0015-changing-the-account-asks-for-the-password-again.md) | Changing the account asks for the password again, and a wrong one is not a 401 | Accepted | 2026-10 |
| [0016](0016-the-visitor-pass-is-a-picture-made-on-the-device.md) | The visitor pass is a picture made on the device, and three libraries came with it | Accepted | 2026-10 |
| [0017](0017-the-sindico-returns-as-a-third-role.md) | The síndico returns as a third role, and "who is in charge" is asked in one place | Accepted | 2026-10 |
| [0018](0018-a-provisional-account-carries-a-restriction-in-its-token.md) | A provisional account carries a restriction in its token, and a first password needs no route | Accepted | 2026-10 |
| [0019](0019-what-a-person-published-points-at-the-person.md) | What a person published points at the person, not at their membership | Accepted | 2026-10 |
| [0020](0020-reading-a-pass-needs-the-camera-and-records-the-entry.md) | Reading a pass needs the camera, answers in four values of one field, and records the entry once | Accepted | 2026-10 |
| [0021](0021-a-join-request-is-a-row-that-an-answer-deletes.md) | A join request is a row that an answer deletes, and "pending" is not a membership | Accepted | 2026-10 |
| [0022](0022-the-home-screen-has-no-tab-bar-and-composes-the-latest-notice.md) | The home screen has no tab bar, draws modules by kind, and composes the latest notice from the newsletter feature | Accepted | 2026-10 |

Decisions reconstructed from code carry the status `Reconstructed`. When a decision replaces
another, the old one becomes `Superseded by NNNN` and is kept.
