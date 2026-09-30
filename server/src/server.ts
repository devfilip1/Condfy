import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";

import { JWT_SECRET } from "./lib/config.ts";
import { prisma } from "./lib/prisma.ts";
import authController from "./auth/auth.controller.ts";
import { authenticate } from "./auth/authenticate.ts";
import visitorController from "./visitors/visitor.controller.ts";

// Os serializers padrão registram método, URL, status e tempo; nunca o body (FR-017).
const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:8081",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await app.register(jwt, { secret: JWT_SECRET });

await app.register(authController);

// Visitantes passam a exigir sessão (FR-023). O módulo de visitors não sabe que isso existe.
await app.register(
  async (instancia) => {
    instancia.addHook("preHandler", authenticate);
    await instancia.register(visitorController, { prefix: "/visitors" });
  },
  { name: "rotas-protegidas" }
);

app.setErrorHandler((error, request, reply) => {
  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number(error.statusCode)
      : 500;

  // Erros do próprio Fastify abaixo de 500 (ex.: JSON inválido → 400) seguem no formato dele.
  if (statusCode < 500) {
    return reply.send(error);
  }

  request.log.error(error);
  return reply.code(500).send({ message: "Internal server error." });
});

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

try {
  await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3333) });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
