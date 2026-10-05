-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "published_by_id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notices_condominium_id_date_id_idx" ON "notices"("condominium_id", "date" DESC, "id");

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_published_by_id_condominium_id_fkey" FOREIGN KEY ("published_by_id", "condominium_id") REFERENCES "condominium_members"("user_id", "condominium_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs que o Prisma não expressa (ADR 0004, mesmo padrão das migrations anteriores)
ALTER TABLE "notices" ADD CONSTRAINT "notices_title_check" CHECK ("title" = btrim("title") AND "title" <> '');

-- O corpo NÃO exige ser igual à própria forma aparada, ao contrário de todo outro texto do projeto.
-- Aparar comeria a linha em branco que separa dois parágrafos, e preservá-la é requisito (FR-002).
-- O teste só garante que não é SÓ espaço em branco, e põe teto no tamanho (research R-003).
ALTER TABLE "notices" ADD CONSTRAINT "notices_body_check" CHECK (btrim("body") <> '' AND length("body") <= 5000);
