-- AlterTable
ALTER TABLE "condominiums" ADD COLUMN     "address" VARCHAR(200);

-- CHECK que o Prisma não expressa (ADR 0004). O endereço é texto livre, mas nunca vazio nem com
-- espaço sobrando: ou não existe (condomínios anteriores à feature 013), ou está preenchido.
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_address_check" CHECK ("address" IS NULL OR ("address" = btrim("address") AND "address" <> ''));

-- CreateIndex
--
-- No máximo um síndico por condomínio. Índice único PARCIAL, gêmeo de
-- `condominium_members_one_admin_key`; os dois são independentes, então um condomínio pode ter um
-- administrador e um síndico.
CREATE UNIQUE INDEX "condominium_members_one_manager_key" ON "condominium_members"("condominium_id") WHERE (role = 'manager');
