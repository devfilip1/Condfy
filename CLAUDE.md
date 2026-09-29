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

- **The database is English, the API contract is Portuguese.** Only the resource service
  translates. Never rename a JSON field to match a column.
- **Validation is duplicated on purpose** between `mobile/features/visitors/domain/visitante.ts`
  and `server/src/visitors/visitante.dto.ts`, message text included. Change both together.
- **Server imports end in `.ts`** and `enum`, `namespace` and parameter properties are rejected —
  Node strips types, it does not compile them.
- **App imports use the `@/` alias**; a feature imports another only through its `index.ts`.
- **Prisma and `DATABASE_URL` must never appear in `mobile/`.**
- **Dates are calendar days.** Convert at the server boundary in UTC; never read a `DATE` in local
  time.
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

## Keeping the docs current

- Changed a business rule, a route, an entity or an environment variable → update the matching
  file in `docs/` in the same task.
- New architectural decision (library, database, pattern) → add an ADR in `docs/decisions/`; mark
  the superseded one, never rewrite it.
- Touched `docs/` → update the `Last updated` line at the end of `docs/README.md`.
