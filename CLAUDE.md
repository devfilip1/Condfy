# condfy

Condominium management app: Expo front end, Fastify + Prisma + PostgreSQL back end. Full
documentation in [docs/](docs/README.md).

## Structure

- `server/` — API. Per resource: controller (declares its own routes, HTTP only) → service (rules,
  no `request`/`reply`) → Prisma. No repository layer.
- `mobile/` — Expo app, organized by feature. `app/ → features/ → shared/`, one way only.
- `docs/` — the documentation. `.specify/`, `specs/` and `.claude/` are git-ignored.

## Commands

```bash
cd server && npm run dev          # API on :3333 (needs docker compose up -d)
cd server && npm run typecheck    # gate — run before calling a task done
cd server && npm run db:seed      # sample data (idempotent)
cd server && npx prisma migrate dev --name <name>

cd mobile && npx expo start
cd mobile && npx tsc --noEmit && npm run lint   # gates
```

## Rules the code does not show

- **Everything is named in English** — code, routes, JSON contract and database. Portuguese stays
  in comments and in the glossary of `docs/product.md` (ADR 0008).

- **The database is English, the API contract is Portuguese.** Only the resource service
  translates. Never rename a JSON field to match a column.
- **Validation is duplicated on purpose** between `mobile/features/visitors/domain/visitor.ts`
  and `server/src/visitors/visitor.dto.ts`, message text included. Change both together. The same
  holds for notices (`newsletter/domain/notice.ts` ↔ `condominiums/notice.dto.ts`) and found items
  (`lostAndFound/domain/foundItem.ts` ↔ `condominiums/foundItem.dto.ts`).
  And for the account forms (`settings/domain/account.ts` ↔ `auth/account.dto.ts`).
- **Colours never come from a constant.** Every component gets its styles from `makeStyles` and any
  loose colour from `useTheme()` (`@/shared/theme`); every `<Text>` and every icon has a colour from
  the palette. There is no `Colors` export, on purpose — do not add one back to quiet the typecheck
  (ADR 0014). `tsc` catches an unconverted file; it does **not** catch colourless text.
- **A wrong current password answers `400` on the field, never `401`.** A `401` makes the app renew
  the session and send the request again (ADR 0015).
- **Ending an account's sessions after a password change means deleting its refresh tokens, not
  revoking them.** A revoked token that is used again signs out every device, the new one included.
- **A found item's photo is a column, and no list may select it.** Every query in
  `foundItem.service.ts` names its columns; only `readFoundItemPhoto` reads `photo` (ADR 0012).
- **The found-item photo route is outside the session group on purpose.** An `<img>` tag cannot
  send a token; its permission is the signed path. Moving it inside breaks the web silently.
- **The slot grid is duplicated on purpose** between `mobile/features/reservations/domain/slot.ts`
  and `server/src/condominiums/slot.ts` — the same eight start minutes. Change both together, and
  the `reservations_slot_grid_check` CHECK with them (ADR 0011).
- **Server imports end in `.ts`** and `enum`, `namespace` and parameter properties are rejected —
  Node strips types, it does not compile them.
- **App imports use the `@/` alias**; a feature imports another only through its `index.ts`.
- **Prisma and `DATABASE_URL` must never appear in `mobile/`.**
- **Identity always comes from the token** (`request.authUser`, set by `authenticate.ts`), never
  from the request body. `request.user` is the raw payload from `@fastify/jwt` — a different thing.
- **`JWT_SECRET` is required** for the server to start; it lives in `server/.env`.
- **Dates are calendar days.** Convert at the server boundary in UTC; never read a `DATE` in local
  time. The one exception is a found item's `postedAt`: it is an **instant**, travels as full
  ISO 8601 and is read in local time (`toDisplayDateTime`). Never mix the two kinds of function.
- **Never `npm audit fix --force` in `server/`** — it downgrades Prisma across a major version.
- **No personal data in logs** (names, e-mails).
- **A fresh clone needs `npm run db:generate`** before typecheck or dev will work.

## Where to read before changing things

| Changing | Read |
|---|---|
| A rule or a validation | [docs/business-rules.md](docs/business-rules.md) |
| Screens, navigation, app state | [Front-end](docs/architecture.md#front-end) |
| Routes or the JSON contract | [docs/api.md](docs/api.md) |
| Schema, constraints, migrations | [docs/data-model.md](docs/data-model.md) |
| How to run or verify anything | [docs/development.md](docs/development.md) |
| Why something is built this way | [docs/decisions/README.md](docs/decisions/README.md) |

## Commit messages

Conventional Commits, in English like everything else, and **always** one of these types:

```
feat:     a new capability someone can use
fix:      a defect corrected
refactor: the behaviour is the same, the shape is not
docs:     only documentation
chore:    tooling, dependencies, ignore files — nothing a user sees
```

- **The scope is optional and says which project**: `feat(server):`, `fix(mobile):`. Leave it out
  when the change spans both.
- **The subject is a sentence in the imperative**, lower case, no full stop, under ~72 characters:
  `feat(server): publish and read notices, with the first role-gated route`.
- **The body says why, not what** — the diff already says what. Worth a body: a decision with a
  rejected alternative, a trap the next person would fall into, a trade-off accepted on purpose.
  A one-line change rarely needs one.
- **One logical change per commit.** A feature, its documentation and an unrelated fix are three
  commits, even when they were written in one sitting.

## Keeping the docs current

- Changed a business rule, a route, an entity or an environment variable → update the matching
  file in `docs/` in the same task.
- New architectural decision (library, database, pattern) → add an ADR in `docs/decisions/`; mark
  the superseded one, never rewrite it.
- Touched `docs/` → update the `Last updated` line at the end of `docs/README.md`.
