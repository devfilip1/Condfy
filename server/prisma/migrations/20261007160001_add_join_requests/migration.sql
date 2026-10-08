-- CreateTable
--
-- Pedido de entrada de uma pessoa num condomínio, como moradora de uma unidade (feature 016).
-- NÃO tem coluna de situação: a linha existir é o "pendente", e qualquer resposta — aprovar,
-- rejeitar, desistir — a apaga (ADR 0021).
CREATE TABLE "join_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
--
-- Uma pessoa tem no máximo um pedido.
CREATE UNIQUE INDEX "join_requests_user_id_key" ON "join_requests"("user_id");

-- CreateIndex
CREATE INDEX "join_requests_condominium_id_created_at_id_idx" ON "join_requests"("condominium_id", "created_at", "id");

-- AddForeignKey
--
-- O pedido sai junto com a conta: rejeitar e desistir apagam a conta, e a linha vai com ela.
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
--
-- Composta, como a de uma visita: a unidade pedida é do MESMO condomínio do pedido.
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_unit_id_condominium_id_fkey" FOREIGN KEY ("unit_id", "condominium_id") REFERENCES "units"("id", "condominium_id") ON DELETE RESTRICT ON UPDATE CASCADE;
