-- Renomeia visitantes para inglês (constituição v3.0.0, III) SEM perder dados.
-- O SQL que o Prisma gera para esta mudança é DROP TABLE + CREATE TABLE, que apagaria os
-- visitantes; por isso esta migration foi escrita à mão, só com RENAME (research R-011).
-- Os nomes finais são os que o Prisma geraria do zero, confirmado por `prisma migrate diff`.

-- Enum
ALTER TYPE "TipoVisita" RENAME TO "VisitType";
ALTER TYPE "VisitType" RENAME VALUE 'visitante' TO 'visitor';
ALTER TYPE "VisitType" RENAME VALUE 'entrega' TO 'delivery';
ALTER TYPE "VisitType" RENAME VALUE 'prestador' TO 'service_provider';

-- Tabela e colunas
ALTER TABLE "visitantes" RENAME TO "visitors";
ALTER TABLE "visitors" RENAME COLUMN "nome" TO "name";
ALTER TABLE "visitors" RENAME COLUMN "tipo" TO "type";
ALTER TABLE "visitors" RENAME COLUMN "data_prevista" TO "expected_date";
ALTER TABLE "visitors" RENAME COLUMN "autorizado_por" TO "authorized_by";
ALTER TABLE "visitors" RENAME COLUMN "criado_em" TO "created_at";
ALTER TABLE "visitors" RENAME COLUMN "atualizado_em" TO "updated_at";

-- Chave primária e índice
ALTER TABLE "visitors" RENAME CONSTRAINT "visitantes_pkey" TO "visitors_pkey";
ALTER INDEX "visitantes_data_prevista_idx" RENAME TO "visitors_expected_date_idx";
