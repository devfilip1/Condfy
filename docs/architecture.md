# Architecture

## Stack

| Layer | Technology | Version | Note |
|---|---|---|---|
| App | Expo SDK / React Native | 57 / 0.86.3 | Android, iOS and web from one codebase |
| App routing | expo-router | 57.0.21 | File-based routes, typed routes enabled |
| App language | TypeScript | ~6.0.3 | `strict`, `any` forbidden by the project constitution |
| Server | Fastify | 5.12 | Built-in JSON parsing, typing and pino logger |
| Server runtime | Node | 22+ (24.18 in development) | Runs `.ts` natively, no build step, no `tsx` |
| ORM | Prisma | 7.10 | Client generated into `server/generated/prisma` |
| DB driver | `@prisma/adapter-pg` + `pg` | 7.10 / 8.23 | Prisma 7 requires a driver adapter |
| Database | PostgreSQL | 17 | Container `condfy-db` via `docker-compose` |

Versions come from [mobile/package.json](../mobile/package.json),
[server/package.json](../server/package.json) and
[server/docker-compose.yml](../server/docker-compose.yml).

## Component view

```mermaid
flowchart TB
    subgraph mobile["mobile/ — Expo app"]
        route["app/ routes<br/>thin re-exports"]
        screen["features/visitors/VisitorsScreen"]
        hook["hooks/useVisitors<br/>state + orchestration"]
        svc["services/visitorService<br/>+ http.ts"]
        dom["domain/visitor.ts<br/>pure rules"]
        route --> screen --> hook --> svc
        screen --> dom
        hook --> dom
        svc --> dom
    end
    subgraph server["server/ — Fastify API"]
        ctl["visitors/visitor.controller<br/>routes + HTTP"]
        dto["visitors/visitor.dto<br/>validation"]
        ssvc["visitors/visitor.service<br/>rules + date conversion"]
        pc["lib/prisma.ts<br/>single client"]
        pw["lib/password.ts<br/>scrypt"]
        ctl --> dto
        ctl --> ssvc --> pc
    end
    db[("PostgreSQL<br/>constraints + triggers")]
    seed["prisma/seed.ts"]
    svc -- "HTTP + JSON (Portuguese)" --> ctl
    pc --> db
    seed --> pc
    seed --> pw
```

Everything above the HTTP arrow runs on the resident's phone; everything below runs on the
developer's machine today, and on a server later. Nothing crosses that line except JSON.

## Code organization

```
mobile/
├── app/            expo-router routes: one file per URL, each re-exporting a feature screen
├── features/       one folder per functionality (visitors, home), each self-contained
└── shared/         components, lib and constants used by two or more features

server/
├── prisma/         schema, migrations and the development seed
├── generated/      Prisma Client output — generated, not versioned
└── src/
    ├── lib/        cross-cutting server pieces: prisma client, password hashing
    └── visitors/   one folder per resource: controller, service, dto
```

A feature in `mobile/features/<name>/` holds `components/`, `hooks/`, `services/`, `domain/`, the
screen and an `index.ts` that is its public surface. Dependencies flow one way —
`app/ → features/ → shared/` — and one feature imports another only through its `index.ts`
([ADR 0002](decisions/0002-feature-based-structure.md)).

On the server each resource follows controller → service → Prisma. The controller declares its own
routes and is the only layer that knows HTTP; the service never receives a request object, so the
same function serves routes, scripts and future tests. There is no repository layer: Prisma
already is one.

## Front-end

**Navigation.** [expo-router](https://docs.expo.dev/router/introduction/) maps files in
[mobile/app/](../mobile/app) to routes. `_layout.tsx` at the root declares a `Stack`;
[app/(tabs)/_layout.tsx](../mobile/app/%28tabs%29/_layout.tsx) declares the bottom `Tabs` with
Home and About. Route files are one line — [app/visitors.tsx](../mobile/app/visitors.tsx)
re-exports `@/features/visitors` — so screens live with their feature and the route file only
declares that the URL exists. There is no route guard: every screen is reachable by anyone.

**Global state.** One context: `AuthProvider` in `features/auth`, holding the session as
`loading`, `anonymous` or `authenticated`. While it is `loading` no screen decides
anything, which is what stops the sign-in screen from flashing for someone who is already signed
in. The root layout redirects between the `(auth)` group and the rest based on that state. Apart
from it, each screen still gets its state from its feature hook — the visitor list lives in
[useVisitors.ts](../mobile/features/visitors/hooks/useVisitors.ts). That hook models the
remote list as three exclusive states — `loading`, `erro`, `pronto` — plus independent flags
for a submission in flight (`enviando`, `erroEnvio`) and a removal in flight (`removendo`,
`erroRemocao`). When login arrives it will need shared state; that is the moment to reconsider
([ADR 0003](decisions/0003-fastify-and-native-typescript.md) discusses the related server choice).

**Talking to the API.** [http.ts](../mobile/features/auth/services/http.ts) is a small
`fetch` wrapper that now belongs to the auth feature: it prepends `EXPO_PUBLIC_API_URL`,
attaches the access token, serializes JSON, aborts after 10 seconds, and on a `401` renews once
and repeats the request — with a single shared renewal, so concurrent calls never rotate twice and
kill the session. Failures become a typed `HttpError` with four kinds: `network` (no answer or
timeout), `validation` (`400` carrying field errors), `session` (a `401` renewal could not
fix) and `server` (anything else). It produces no
user-facing text. [visitorService.ts](../mobile/features/visitors/services/visitorService.ts)
turns responses into domain objects, narrowing `unknown` through the type guards in
[domain/visitor.ts](../mobile/features/visitors/domain/visitor.ts). The hook decides the
message the resident reads. The client lives inside the feature because `shared/lib/` is reserved
for pure functions and `services/` is the only layer allowed to do I/O; it moves to `shared/` when
a second feature needs HTTP.

**Shared components.** [ConfirmDialog](../mobile/shared/components/ConfirmDialog.tsx) is a modal
built by hand instead of `Alert.alert`, because `Alert` does nothing on web and a removal would
then happen without confirmation. [DateField](../mobile/shared/components/DateField.tsx) is a
calendar input that holds no date logic of its own — every calculation comes from
[shared/lib/calendar.ts](../mobile/shared/lib/calendar.ts). Colors come from
[shared/constants/Colors.ts](../mobile/shared/constants/Colors.ts); there is no global stylesheet.

## Main flow: registering a visitor

```mermaid
sequenceDiagram
    participant S as VisitorsScreen
    participant H as useVisitors
    participant Svc as visitorService
    participant C as controller
    participant Sv as service
    participant DB as PostgreSQL

    S->>H: adicionarVisitante(entrada)
    H->>H: validarNovoVisitante — invalid stops here, no network
    H->>Svc: POST /visitors
    Svc->>C: HTTP request
    C->>C: validarNovoVisitante (server copy)
    alt invalid
        C-->>Svc: 400 { erros: { campo: mensagem } }
        Svc-->>H: ErroHttp("validacao")
        H-->>S: errors under each field, form stays open
    else valid
        C->>Sv: criarVisitante(dados)
        Sv->>DB: insert (date as midnight UTC)
        DB-->>Sv: row
        Sv-->>C: Visitor (contract shape)
        C-->>Svc: 201 + visitor
        Svc-->>H: Visitante
        H-->>S: inserted in the list, re-sorted, form closes
    end
```

The app does not reload the list after creating: it inserts the record the server returned and
re-sorts locally. Reloading would mean a second request that could fail after a successful save,
leaving the resident without the visitor they just registered.

## Cross-cutting concerns

- **Authentication:** e-mail and password, exchanged for a 15-minute JWT and a rotating renewal
  credential. The visitor routes require the token; a `preHandler` verifies it and puts the user
  id on the request, which is the only source of identity. See
  [Authentication and sessions](business-rules.md#authentication-and-sessions).
- **Authorization:** none yet. Roles exist in the database but nothing reads them: being signed in
  grants everything.
- **Validation:** duplicated on purpose between app and server, with identical messages, so the
  server's rejection lands under the right form field without any translation layer.
- **Error handling (server):** [server.ts](../server/src/server.ts) lets Fastify's own errors
  below `500` through (malformed JSON becomes `400`) and turns anything else into
  `500 { mensagem: "Internal server error." }`, logging the cause without the body.
- **Error handling (app):** all failures become one of the three `HttpError` kinds and then a
  message; the list never silently empties.
- **Logging:** Fastify's pino logger with default serializers — method, URL, status, duration.
  No request body, no personal data ([RN-USR-04](business-rules.md#rn-usr-04--personal-data-never-reaches-the-logs)).
- **CORS:** `@fastify/cors` allows `CORS_ORIGIN` (default `http://localhost:8081`, the Metro dev
  server). Only the web target is affected; Android and iOS do not send an `Origin`.
- **Timeouts:** 10 seconds per request, enforced by the app.
- **Themes:** the app must stay readable in light and dark mode (`userInterfaceStyle: automatic`).
- **i18n:** none. Interface text is English, domain vocabulary is Portuguese, both hardcoded.

## Decisions

| # | Decision |
|---|---|
| [0001](decisions/0001-split-mobile-and-server.md) | Split the repository into `mobile/` and `server/`, with HTTP as the only contract |
| [0002](decisions/0002-feature-based-structure.md) | Organize the app by feature instead of MVVM layers |
| [0003](decisions/0003-fastify-and-native-typescript.md) | Fastify plus Node's native TypeScript, with no build step |
| [0004](decisions/0004-integrity-rules-in-the-database.md) | Enforce integrity rules in PostgreSQL, not only in application code |
| [0005](decisions/0005-scrypt-for-passwords.md) | Hash passwords with `scrypt` from Node's standard library |
| [0006](decisions/0006-english-database-portuguese-contract.md) | English database, Portuguese API contract, translated in one place |
| [0007](decisions/0007-jwt-with-rotating-refresh-tokens.md) | Short-lived JWT plus an opaque rotating renewal credential |

## Risks and technical debt

- **Open sign-up with global visitors.** Authentication now exists, but anyone who reaches the
  server can create an account and then see every visitor of every condominium. Sign-up needs
  approval or invites before this is published, and credentials travel in clear text without
  HTTPS.
- **Visitors live outside the condominium model.** See
  [gaps](business-rules.md#inconsistencies-and-gaps-found). Any future "visitors of my
  condominium" query requires a migration and a decision about existing rows.
- **Duplicated validation drifts silently.** Nothing fails if
  [visitor.dto.ts](../server/src/visitors/visitor.dto.ts) and
  [domain/visitor.ts](../mobile/features/visitors/domain/visitor.ts) disagree; the app would
  simply show a server message that does not match its own rule.
- **No automated tests.** Every regression is caught by hand. The riskiest area is the date
  conversion, where an error is invisible until someone in another timezone looks at a card.
- **Generated Prisma client is a hard dependency of the build.** `server/generated/` is not
  versioned, so a fresh clone must run `npm run db:generate` before `npm run typecheck` or
  `npm run dev` will work.
- **The project constitution and the Spec Kit artifacts are not versioned.** `.specify/`,
  `specs/` and `.claude/` are in `.gitignore`, so the rules and the feature history that shaped
  this codebase exist only on the author's machine. This `docs/` folder is the only documentation
  that travels with the repository.
