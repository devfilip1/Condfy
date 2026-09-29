import cors from "@fastify/cors";
import Fastify from "fastify";

import { prisma } from "./lib/prisma.ts";
import visitanteController from "./visitors/visitante.controller.ts";

// Os serializers padrão registram método, URL, status e tempo; nunca o body (FR-017).
const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:8081",
  methods: ["GET", "POST", "DELETE"],
});

await app.register(visitanteController, { prefix: "/visitantes" });

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
  return reply.code(500).send({ mensagem: "Internal server error." });
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
