-- CreateEnum
CREATE TYPE "TipoVisita" AS ENUM ('visitante', 'entrega', 'prestador');

-- CreateTable
CREATE TABLE "visitantes" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "tipo" "TipoVisita" NOT NULL,
    "data_prevista" DATE NOT NULL,
    "autorizado_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitantes_data_prevista_idx" ON "visitantes"("data_prevista");
