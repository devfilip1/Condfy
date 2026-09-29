# Development

## Prerequisites

- **Node 22 or newer.** The server runs `.ts` files directly, which needs Node's native type
  stripping ([ADR 0003](decisions/0003-fastify-and-native-typescript.md)). Development happens on
  Node 24.
- **Docker Desktop**, for the PostgreSQL container.
- **A phone with Expo Go**, on the same Wi-Fi as the computer — or an Android emulator, or the
  web target.

## Running locally

Two terminals, server first.

```bash
# Terminal 1 — server
cd server
npm install
cp .env.example .env            # replace SENHA with the password in docker-compose.yml
docker compose up -d            # PostgreSQL on localhost:5432
npx prisma migrate dev          # creates the tables
npm run db:generate             # generates the Prisma Client into generated/
npm run dev                     # http://0.0.0.0:3333
```

```bash
# Terminal 2 — app
cd mobile
npm install
cp .env.example .env.local      # set EXPO_PUBLIC_API_URL (see below)
npx expo start --clear
```

`--clear` matters whenever `.env.local` changed: Metro caches the compiled environment.

### Environment variables

Never commit the real values; `.env` and `.env*.local` are ignored by git.

| Variable | Project | What it is |
|---|---|---|
| `DATABASE_URL` | `server/` | PostgreSQL connection string; the password is the one in `docker-compose.yml` |
| `PORT` | `server/` | API port, defaults to `3333` |
| `CORS_ORIGIN` | `server/` | Origin allowed for the web target, defaults to `http://localhost:8081` |
| `EXPO_PUBLIC_API_URL` | `mobile/` | Where the app looks for the API. It is bundled into the app — public by definition, so never put a secret in an `EXPO_PUBLIC_` variable |

`EXPO_PUBLIC_API_URL` depends on the target:

| Target | Value |
|---|---|
| Phone with Expo Go | `http://<your computer's Wi-Fi IP>:3333` — `ipconfig` on Windows |
| Android emulator | `http://10.0.2.2:3333` |
| Web | `http://localhost:3333` |

On a phone, `localhost` means the phone itself, which is the single most common reason the list
fails to load.

### Sample data

```bash
cd server
npm run db:seed
```

Creates two condominiums, units with and without a block, users with every role, a resident of two
units and a person who belongs to two condominiums with different roles
([seed.ts](../server/prisma/seed.ts)). It is idempotent: fixed ids, nothing duplicated, nothing
deleted, safe to run repeatedly. It never touches visitors. The output is counts only, never names
or e-mails. All sample accounts share one development password, defined at the top of the script.

## Verification

There are no automated tests ([ADR 0003](decisions/0003-fastify-and-native-typescript.md) explains
the related tooling minimalism; the testing decision itself was recorded per feature). These are
the gates to run before calling a task done:

| Project | Command | Checks |
|---|---|---|
| `server/` | `npm run typecheck` | Types, including the generated Prisma Client |
| `mobile/` | `npx tsc --noEmit` | Types |
| `mobile/` | `npm run lint` | expo-lint rules |

### Manual verification

The API can be exercised without the app, which is the fastest way to tell an app bug from a
server bug:

```bash
curl http://localhost:3333/visitantes

curl -X POST http://localhost:3333/visitantes \
  -H "Content-Type: application/json" \
  -d '{"nome":"Jane Smith","tipo":"visitante","dataPrevista":"2026-09-14","autorizadoPor":"Carlos"}'

curl -i -X DELETE http://localhost:3333/visitantes/<id>     # 204, twice in a row
```

In the app, the scenarios worth re-checking after touching the visitor module: list loads and is
sorted; registering closes the form and places the card in the right position; the form keeps what
was typed when the server rejects it; stopping the server shows the failure message and *Try
again* instead of the empty state; removing asks for confirmation and survives a restart.

Database state can be inspected directly:

```bash
docker exec condfy-db psql -U condfy -d condfy -c "SELECT count(*) FROM visitors;"
npx prisma studio      # from server/
```

## Conventions

- **Imports in the app use the `@/` alias**, never relative paths — the exception is `require` for
  assets. A feature imports another only through its `index.ts`.
- **Imports on the server end in `.ts`** (`../lib/prisma.ts`). Node resolves the real file; it
  does not rewrite `.js` to `.ts`.
- **No `enum`, `namespace` or parameter properties on the server.** `tsc` runs with
  `erasableSyntaxOnly`, because Node only strips types, it does not compile them.
- **`any` is forbidden** in both projects. External JSON enters as `unknown` and passes through a
  type guard.
- **The database is English, the API contract is Portuguese.** Only the resource service
  translates ([ADR 0006](decisions/0006-english-database-portuguese-contract.md)).
- **Never run `npm audit fix --force` in `server/`.** It downgrades Prisma across a major version
  and breaks the configuration. Use `npm audit --omit=dev` to see what actually ships.
- **Spec Kit artifacts are local only.** `.specify/`, `specs/` and `.claude/` are in `.gitignore`;
  the project constitution and the feature specs do not travel with the repository. Anything that
  matters to a future reader belongs in `docs/`.

## Common tasks

### Adding an endpoint to an existing resource

1. Add the rule to the service in `server/src/<resource>/<resource>.service.ts`; it must not touch
   `request` or `reply`.
2. Declare the route in the controller of that resource — routes live inside the controller.
3. If it accepts a body, validate it in the dto file, returning the same
   `{ erros: { campo: mensagem } }` shape.
4. Document it in [api.md](api.md) and, if it introduces a rule, in
   [business-rules.md](business-rules.md).

### Adding a screen

1. Create `mobile/features/<feature>/` with the screen, plus `components/`, `hooks/`, `services/`
   and `domain/` as needed, and an `index.ts` exporting the screen.
2. Add a route file under `mobile/app/` that only re-exports the feature.
3. Keep business rules out of components: they belong in `domain/`, orchestration in `hooks/`.

### Changing the schema

1. Edit [schema.prisma](../server/prisma/schema.prisma).
2. `npx prisma migrate dev --name <short_name>` from `server/`.
3. For constraints Prisma cannot express (`CHECK`, triggers, partial indexes with raw SQL), append
   the SQL to the generated migration file **before** applying it elsewhere, following the pattern
   in `20260929040409_create_users_condominiums`.
4. Never edit a migration that has already been applied outside your machine.
5. Update [data-model.md](data-model.md) in the same task.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| App shows *Couldn't load visitors* | The API is not running, or the phone cannot reach it | Start `npm run dev` in `server/`; open `http://<IP>:3333/visitantes` in the phone's browser to tell the two apart |
| It worked yesterday, not today | The computer's Wi-Fi IP changed | `ipconfig`, update `.env.local`, restart Metro with `--clear` |
| Windows firewall prompt on first run | Node listening on the network | Allow it on **private** networks, otherwise the phone cannot connect |
| `npm run dev` fails to import the Prisma Client | `generated/` is missing or stale | `npm run db:generate` |
| Type errors mentioning `./enums.js` | The generator lost `importFileExtension = "ts"` | Restore it in `schema.prisma` and regenerate |
| `prisma -v` shows a 6.x CLI | An `npm install` resolved against an old lockfile | `npm install -D prisma@^7.10.0`, then check again |
| Works on the phone, fails on web | CORS | Set `CORS_ORIGIN` to the Metro origin |
