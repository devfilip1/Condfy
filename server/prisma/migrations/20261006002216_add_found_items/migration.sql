-- CreateEnum
CREATE TYPE "FoundItemStatus" AS ENUM ('found', 'returned');

-- CreateTable
CREATE TABLE "found_items" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "posted_by_id" TEXT NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "place" VARCHAR(120) NOT NULL,
    "status" "FoundItemStatus" NOT NULL DEFAULT 'found',
    "posted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photo" BYTEA NOT NULL,
    "photo_content_type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "found_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "found_items_condominium_id_posted_at_id_idx" ON "found_items"("condominium_id", "posted_at" DESC, "id");

-- AddForeignKey
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_posted_by_id_condominium_id_fkey" FOREIGN KEY ("posted_by_id", "condominium_id") REFERENCES "condominium_members"("user_id", "condominium_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs que o Prisma não expressa (ADR 0004, mesmo padrão das migrations anteriores)

-- Descrição e local são rótulos de uma linha: guardados aparados e nunca vazios (FR-022).
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_description_check" CHECK ("description" = btrim("description") AND "description" <> '');
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_place_check" CHECK ("place" = btrim("place") AND "place" <> '');

-- A foto mora na linha (ADR 0012). O teto de 5 MB vale para qualquer escrita, não só a da rota
-- (FR-007a): 5 * 1024 * 1024.
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_photo_size_check" CHECK (octet_length("photo") BETWEEN 1 AND 5242880);

-- Só o RÓTULO é conferido aqui. Que os bytes sejam mesmo uma imagem desse tipo é conferido pelo
-- servidor antes de gravar, pela assinatura do arquivo — uma CHECK não lê formato de imagem.
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_photo_content_type_check" CHECK ("photo_content_type" IN ('image/jpeg', 'image/png', 'image/webp'));
