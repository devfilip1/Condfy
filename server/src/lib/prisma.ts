import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client.ts";

/**
 * Instância única do Prisma Client para toda a API (constituição, seção Backend).
 *
 * O Prisma 7 não traz motor de consultas embutido: a conexão com o PostgreSQL passa pelo
 * driver adapter `PrismaPg`, que usa o pacote `pg` (research R-002).
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não definida em server/.env");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
