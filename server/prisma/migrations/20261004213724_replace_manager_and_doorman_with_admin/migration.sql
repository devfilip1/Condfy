-- Síndico e portaria saem; o papel de gestão passa a ser `admin` (administrador).
--
-- O Postgres não remove valor de enum, então o tipo é recriado. Nenhuma linha usava `manager` nem
-- `doorman` quando esta migration foi escrita — o USING abaixo não converte nada na prática, e
-- falharia de propósito se convertesse, em vez de escolher um cargo por conta própria.

-- O índice parcial referencia o literal 'manager': precisa cair antes da troca do tipo.
DROP INDEX "condominium_members_one_manager_key";

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('resident', 'admin');
ALTER TABLE "condominium_members"
  ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
DROP TYPE "Role_old";

-- Mesma regra de antes (no máximo um por condomínio), agora sobre o cargo renomeado.
CREATE UNIQUE INDEX "condominium_members_one_admin_key"
  ON "condominium_members"("condominium_id") WHERE (role = 'admin');
