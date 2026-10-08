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
  And for signing up (`auth/domain/session.ts` ↔ `auth/auth.dto.ts`) — five fields since feature
  016. On the app `validateSignUp(name, email, password)` **keeps three arguments**: the roles
  module calls it; the sign-up form uses `validateResidentSignUp`, which composes it.
  And for creating a condominium (`condominiums/domain/newCondominium.ts` ↔
  `condominiums/condominium.dto.ts`) and a place to book
  (`reservations/domain/newCommonArea.ts` ↔ `condominiums/commonArea.dto.ts`).
  And for bringing somebody in with a role (`staff/domain/staff.ts` ↔ `condominiums/staff.dto.ts`),
  whose name, e-mail and password are sign-up's rules, reused and not rewritten.
- **A role is never compared with `"admin"` to decide a permission.** Who is in charge of a
  condominium is the administrator **or the síndico** (`manager`), and that question is asked by
  `managesCondominium` — `server/src/lib/roles.ts` and `mobile/features/auth/domain/session.ts`
  (ADR 0017). Only the display name and the role label tell the two apart.
- **A new enum value and its first use go in separate migrations.** Postgres refuses to use a value
  in the transaction that added it. Migrations are written by hand and applied with
  `npx prisma migrate deploy`; `migrate dev` will not run without an interactive terminal.
- **The uploaded photo of a condominium is a column too, and no query may select it** except
  `readCondominiumPhoto`. Its route is outside the session group like the one of a found item. In
  the app, the picture of a condominium always goes through `condominiumPhotoUri`. The same holds
  for a place to book: `readCommonAreaPhoto`, and `commonAreaPhotoUri` in the app.
- **Signing up always carries a condominium and a unit, and creates a join request with the
  account.** No route creates an account that belongs to nowhere: that one comes only from
  `npm run account:create` in `server/`. The seed and `POST …/staff` create users without a
  request, and must keep doing so.
- **Every answer to a join request deletes it first and checks the count** — approve, reject and
  withdraw alike (ADR 0021). Never read "is it still pending?" and then act. Approving creates the
  membership and the residency in the same transaction, or the database rolls the resident back.
- **"Pending" is a row in `join_requests`, never a membership.** A pending account has no
  membership, which is why no permission check needed changing — do not model it as a role or a
  flag on one.
- **The directory (`/directory/…`) is public and registered outside the session group.** Every
  query in `directory.service.ts` names its columns and joins nothing about people. Do not add to
  it anything that depends on who is asking, and do not move it under `/condominiums`.
- **Only an account with no membership at all creates a condominium, and a síndico has one.** The
  count in `createCondominium` refuses any existing role; the partial unique index
  `condominium_members_one_condominium_per_manager_key` is what holds two simultaneous requests.
  The refusal is a `409`. Do not offer creation anywhere but the home of an account with no
  condominium.
- **Two permissions are the síndico's alone** and ask for `role === "manager"` instead of
  `managesCondominium`: creating a place to book, and everything in the roles module
  (`staff.service.ts`) — the administrator is refused in both.
- **The doorman is not in charge, and differs from a resident in three directions** — each a named
  question in `server/src/lib/roles.ts`, never a comparison with `"doorman"` in a service:
  `seesEveryVisit` (yes), `actsInCondominium` (no — registering or removing a visitor, getting a
  pass code, booking a place) and `readsLostAndFound` (no). Reservations is on the doorman's home
  **to consult**: `canBook` in the two reservation hooks hides everything that writes. A route open to *any* member that writes
  must ask `actsInCondominium`. The one rule that names the role is "only a doorman checks a pass"
  (`passCheck.service.ts`) — the síndico and the administrator are refused there.
- **A doorman never receives a pass code**, not even for a visit they authorized as administrator
  before their role changed: `toVisitor` and `removeVisitor` both ask `actsInCondominium`.
- **Every answer of a pass check is a `200`** — valid, not yet, expired and not recognised are four
  values of `outcome`. An error status means "could not be checked". A code that is not a UUID is
  "not recognised", never a `400`: `pass_code` is a `uuid` column and Postgres errors on anything
  else, so the form is checked before the query.
- **A visit's entry is written by a conditional `UPDATE`** (`where enteredAt: null`), and its row
  count is what says "this check was the first". Never read it and then write it.
- **An account with a provisional password is answered `403`, never `401`** — a `401` makes the app
  renew and repeat, and the renewed token is restricted too. Only `GET /me` and `PATCH /me/password`
  use `authenticateAllowingProvisional`; do not add a third (ADR 0018). Nothing may set
  `passwordIsProvisional` back to `true` on a live account.
- **Whoever published a notice or a found item may no longer belong to the condominium.** Both
  point at the user, not at the membership (ADR 0019): never assume the author has a role there.
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
- **Three app libraries have one importer each** (ADR 0016): `qrcode-generator` only in
  `mobile/shared/lib/qr.ts`; `react-native-view-shot` and `expo-sharing` only in
  `mobile/features/visitors/services/passSharing.ts`. Add app dependencies with `npx expo install`.
- **`expo-camera` has two importers, both in `mobile/features/passCheck/`** (ADR 0020):
  `components/PassScanner.tsx` shows the camera and `services/cameraPermission.ts` asks for it. The
  camera's callback fires many times a second — `usePassCheck` guards it with a ref, not with state.
- **The two camera plugins in `mobile/app.json` carry the same sentence.** iOS shows one camera
  reason per app; `expo-image-picker` and `expo-camera` both set it, and the last one listed wins.
- **The prefix of a pass's QR code lives in one file**, `mobile/features/visitors/domain/visitor.ts`:
  `passQrValue` writes it and `passCodeOf` reads it. The reader reaches it through the feature's
  `index.ts`.
- **The latest-notice card on the home screen is always drawn with the dark palette**, through a
  nested `ThemeProvider scheme="dark"` — the mirror of the pass below. Its `makeStyles` runs in an
  inner component, inside that provider; called in the outer one, the card turns light with the app.
- **`features/newsletter` exports a hook and a card besides its screens** (`useLatestNotice`,
  `LatestNoticeCard`), and the home screen composes them. The latest notice is the head of the
  board's own list — do not give it a query of its own.
- **A module declares its `kind`** in `mobile/features/home/data/modules.ts`: `everyday` is a grid
  card, `administration` a full-width row below the notice card. No component lists module names.
- **There is no tab bar and no `(tabs)` group** (ADR 0022); the home screen is `app/index.tsx`.
  Signing out is a row of Settings. `mobile/assets/images/` holds the one bundled image.
- **The visitor pass is always drawn with the light palette**, through a nested
  `ThemeProvider scheme="light"` — never through a colour constant. Its code (`passCode`) is sent
  only to whoever authorized the visit; never add it to a response for anybody else.
- **Server imports end in `.ts`** and `enum`, `namespace` and parameter properties are rejected —
  Node strips types, it does not compile them.
- **App imports use the `@/` alias**; a feature imports another only through its `index.ts`.
- **Prisma and `DATABASE_URL` must never appear in `mobile/`.**
- **Identity always comes from the token** (`request.authUser`, set by `authenticate.ts`), never
  from the request body. `request.user` is the raw payload from `@fastify/jwt` — a different thing.
- **`JWT_SECRET` is required** for the server to start; it lives in `server/.env`.
- **Dates are calendar days.** Convert at the server boundary in UTC; never read a `DATE` in local
  time. The two exceptions are a found item's `postedAt` and a visit's `enteredAt`: each is an
  **instant**, travels as full ISO 8601 and is read in local time (`toDisplayDateTime`). Never mix
  the two kinds of function — a visit has one of each, `expectedDate` and `enteredAt`.
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
