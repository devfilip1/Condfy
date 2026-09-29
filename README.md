# condfy

Condominium management app. Residents register the visitors they expect from their phone, and the
people who run the building see the same list. The visitor module works end to end; condominiums,
units and user accounts exist in the database, waiting for the login feature.

**Stack:** Expo SDK 57 · React Native 0.86 · Fastify 5 · Prisma 7 · PostgreSQL 17 · TypeScript 6

```
condfy/
├── server/   API: Node + Fastify + Prisma + PostgreSQL
├── mobile/   App: Expo + Expo Router
└── docs/     Documentation
```

`server/` and `mobile/` are independent projects: each has its own `package.json`,
`tsconfig.json` and `node_modules`. The only contract between them is HTTP.

## Running

Requires Node 22+, Docker, the Expo Go app on a phone, and both devices on the same Wi-Fi.

```bash
# Server
cd server
npm install
cp .env.example .env          # replace SENHA with the password from docker-compose.yml
docker compose up -d          # starts PostgreSQL
npx prisma migrate dev        # creates the tables
npm run db:generate           # generates the Prisma Client
npm run dev                   # http://localhost:3333

# App (in another terminal)
cd mobile
npm install
cp .env.example .env.local    # point EXPO_PUBLIC_API_URL at your computer's IP (ipconfig)
npx expo start                # scan the QR code with Expo Go
```

Optional sample data: `npm run db:seed` in `server/`.
Details and troubleshooting in [docs/development.md](docs/development.md).

## Checks

| Project | Command |
|---|---|
| `server/` | `npm run typecheck` |
| `mobile/` | `npx tsc --noEmit` and `npm run lint` |

## Documentation

| Document | Answers |
|---|---|
| [Overview](docs/README.md) | Documentation map and the project in one screen |
| [Product](docs/product.md) | What the system does, for whom, glossary |
| [Business rules](docs/business-rules.md) | Every constraint and where it is enforced |
| [Architecture](docs/architecture.md) | How app, server and database fit together |
| [API](docs/api.md) | The HTTP contract |
| [Data model](docs/data-model.md) | Tables, relationships, database integrity |
| [Development](docs/development.md) | Running it, conventions, common tasks |
| [Decisions](docs/decisions/README.md) | Why it is built this way |
