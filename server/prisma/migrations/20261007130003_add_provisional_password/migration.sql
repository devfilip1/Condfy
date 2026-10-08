-- AlterTable
--
-- A password de uma conta criada pelo síndico é provisória até a pessoa trocá-la (feature 014).
-- Toda conta que já existe recebe `false`: só uma conta criada pelo síndico nasce provisória.
ALTER TABLE "users" ADD COLUMN     "password_is_provisional" BOOLEAN NOT NULL DEFAULT false;
