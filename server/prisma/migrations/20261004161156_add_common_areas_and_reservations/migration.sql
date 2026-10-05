-- CreateTable
CREATE TABLE "common_areas" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "usage_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "common_area_id" TEXT NOT NULL,
    "reserved_by_id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "common_areas_condominium_id_is_available_idx" ON "common_areas"("condominium_id", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "common_areas_condominium_id_name_key" ON "common_areas"("condominium_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "common_areas_id_condominium_id_key" ON "common_areas"("id", "condominium_id");

-- CreateIndex
CREATE INDEX "reservations_common_area_id_date_idx" ON "reservations"("common_area_id", "date");

-- AddForeignKey
ALTER TABLE "common_areas" ADD CONSTRAINT "common_areas_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_common_area_id_condominium_id_fkey" FOREIGN KEY ("common_area_id", "condominium_id") REFERENCES "common_areas"("id", "condominium_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_reserved_by_id_condominium_id_fkey" FOREIGN KEY ("reserved_by_id", "condominium_id") REFERENCES "condominium_members"("user_id", "condominium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECKs que o Prisma não expressa (ADR 0004, mesmo padrão de create_users_condominiums)
ALTER TABLE "common_areas" ADD CONSTRAINT "common_areas_name_check" CHECK ("name" = btrim("name") AND "name" <> '');
ALTER TABLE "common_areas" ADD CONSTRAINT "common_areas_usage_fee_check" CHECK ("usage_fee" >= 0);
-- https apenas: o iOS bloqueia http por padrão (ATS), e a falha apareceria como foto quebrada
-- sem explicação nenhuma (research R-007).
ALTER TABLE "common_areas" ADD CONSTRAINT "common_areas_image_url_check" CHECK ("image_url" IS NULL OR "image_url" LIKE 'https://%');

-- Torna um horário inválido IMPOSSÍVEL de gravar: termina depois de começar, nunca cruza a
-- meia-noite, nunca tem duração zero (FR-017). 1440 = 24h, fim exclusivo.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_minutes_check" CHECK (
  "start_minute" >= 0 AND "start_minute" < 1440
  AND "end_minute" > "start_minute" AND "end_minute" <= 1440
);
