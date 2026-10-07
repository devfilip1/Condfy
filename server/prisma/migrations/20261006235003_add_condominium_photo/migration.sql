-- AlterTable
ALTER TABLE "condominiums" ADD COLUMN     "photo" BYTEA,
ADD COLUMN     "photo_content_type" VARCHAR(20);

-- CHECK que o Prisma não expressa (ADR 0004). A foto e o tipo dela existem JUNTOS ou não existem;
-- o tipo é um dos três que o servidor sabe detectar; e a foto tem no máximo 5 MB — a mesma regra
-- que a API confere, valendo também para quem escrever sem passar por ela.
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_photo_check" CHECK (
  ("photo" IS NULL AND "photo_content_type" IS NULL)
  OR (
    "photo" IS NOT NULL
    AND "photo_content_type" IN ('image/jpeg', 'image/png', 'image/webp')
    AND octet_length("photo") <= 5242880
  )
);
