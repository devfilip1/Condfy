-- O que uma pessoa publicou passa a apontar para a PESSOA, e não para o vínculo dela com o
-- condomínio (feature 014, ADR 0019).
--
-- As duas FKs compostas recusavam apagar o vínculo de quem tivesse publicado um aviso ou postado
-- um item. Isso protegia o mural numa troca de administrador que não existia; agora o síndico
-- remove pessoas, e o aviso tem de ficar. Nenhuma linha muda: `published_by_id` e `posted_by_id`
-- já são ids de usuário.
--
-- O `RESTRICT` continua, agora sobre a conta: quem publicou não apaga a própria conta.

-- DropForeignKey
ALTER TABLE "notices" DROP CONSTRAINT "notices_published_by_id_condominium_id_fkey";

-- DropForeignKey
ALTER TABLE "found_items" DROP CONSTRAINT "found_items_posted_by_id_condominium_id_fkey";

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
