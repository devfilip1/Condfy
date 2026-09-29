# condfy

App de gestão de condomínio. Node, Fastify e Prisma no servidor; React Native e Expo no app.

```
condfy/
├── server/   API: Node + Fastify + Prisma + PostgreSQL
└── mobile/   App: Expo + Expo Router
```

Os dois são projetos independentes: cada um tem o próprio `package.json`, `tsconfig.json` e
`node_modules`. O único acordo entre eles é o contrato HTTP.

## Rodando

Requer Node 22+, Docker, o app Expo Go no celular e os dois aparelhos na mesma rede Wi-Fi.

```bash
# Servidor
cd server
npm install
cp .env.example .env          # troque SENHA pela senha do docker-compose.yml
docker compose up -d          # sobe o PostgreSQL
npx prisma migrate dev        # cria as tabelas
npm run dev                   # http://localhost:3333

# App (em outro terminal)
cd mobile
npm install
cp .env.example .env.local    # ajuste EXPO_PUBLIC_API_URL para o IP do seu PC (ipconfig)
npx expo start                # escaneie o QR code com o Expo Go
```

## Verificações

| projeto | comando |
|---|---|
| `server/` | `npm run typecheck` |
| `mobile/` | `npx tsc --noEmit` e `npm run lint` |
