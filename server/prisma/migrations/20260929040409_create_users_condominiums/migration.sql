-- CreateEnum
CREATE TYPE "Role" AS ENUM ('resident', 'manager', 'doorman');

-- CreateTable
CREATE TABLE "condominiums" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominiums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "block" VARCHAR(20),
    "number" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condominium_members" (
    "user_id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominium_members_pkey" PRIMARY KEY ("user_id","condominium_id")
);

-- CreateTable
CREATE TABLE "unit_residents" (
    "user_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_residents_pkey" PRIMARY KEY ("user_id","unit_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "units_id_condominium_id_key" ON "units"("id", "condominium_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_condominium_id_block_number_key" ON "units"("condominium_id", "block", "number");

-- CreateIndex
CREATE UNIQUE INDEX "units_number_without_block_key" ON "units"("condominium_id", "number") WHERE (block IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "condominium_members_condominium_id_idx" ON "condominium_members"("condominium_id");

-- CreateIndex
CREATE UNIQUE INDEX "condominium_members_one_manager_key" ON "condominium_members"("condominium_id") WHERE (role = 'manager');

-- CreateIndex
CREATE INDEX "unit_residents_unit_id_condominium_id_idx" ON "unit_residents"("unit_id", "condominium_id");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condominium_members" ADD CONSTRAINT "condominium_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condominium_members" ADD CONSTRAINT "condominium_members_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_residents" ADD CONSTRAINT "unit_residents_user_id_condominium_id_fkey" FOREIGN KEY ("user_id", "condominium_id") REFERENCES "condominium_members"("user_id", "condominium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_residents" ADD CONSTRAINT "unit_residents_unit_id_condominium_id_fkey" FOREIGN KEY ("unit_id", "condominium_id") REFERENCES "units"("id", "condominium_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs: o Prisma não expressa (research R-001, R-005)
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_name_check" CHECK ("name" = btrim("name") AND "name" <> '');
ALTER TABLE "units" ADD CONSTRAINT "units_number_check" CHECK ("number" = upper(btrim("number")) AND "number" <> '');
ALTER TABLE "units" ADD CONSTRAINT "units_block_check" CHECK ("block" IS NULL OR ("block" = upper(btrim("block")) AND "block" <> ''));
ALTER TABLE "users" ADD CONSTRAINT "users_name_check" CHECK ("name" = btrim("name") AND "name" <> '');
ALTER TABLE "users" ADD CONSTRAINT "users_email_check" CHECK ("email" = lower(btrim("email")) AND "email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Morador precisa de ao menos uma unidade no condomínio do vínculo (research R-010).
-- A regra cruza condominium_members e unit_residents, então não cabe numa CHECK. As triggers são
-- adiadas para o fim da transação: assim o vínculo e a primeira moradia podem ser criados juntos,
-- e apagar usuário ou vínculo (moradias somem em cascata) nunca é barrado.
CREATE FUNCTION "enforce_resident_has_unit"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_user_id TEXT;
  v_condominium_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'condominium_members' THEN
    v_user_id := NEW."user_id";
    v_condominium_id := NEW."condominium_id";
  ELSE
    v_user_id := OLD."user_id";
    v_condominium_id := OLD."condominium_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM "condominium_members" m
    WHERE m."user_id" = v_user_id
      AND m."condominium_id" = v_condominium_id
      AND m."role" = 'resident'
      AND NOT EXISTS (
        SELECT 1 FROM "unit_residents" r
        WHERE r."user_id" = m."user_id" AND r."condominium_id" = m."condominium_id"
      )
  ) THEN
    -- Sem dados pessoais na mensagem.
    RAISE EXCEPTION 'A resident must live in at least one unit of the condominium.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'condominium_members_resident_has_unit';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "condominium_members_resident_has_unit"
  AFTER INSERT OR UPDATE ON "condominium_members"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "enforce_resident_has_unit"();

CREATE CONSTRAINT TRIGGER "unit_residents_keep_resident_unit"
  AFTER DELETE OR UPDATE ON "unit_residents"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "enforce_resident_has_unit"();
