-- AlterTable
ALTER TABLE "condominiums" ADD COLUMN     "image_url" TEXT;

-- CHECK que o Prisma não expressa (ADR 0004). A mesma regra de `common_areas_image_url_check`:
-- a foto é um endereço https, ou não existe.
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_image_url_check" CHECK ("image_url" IS NULL OR "image_url" LIKE 'https://%');
