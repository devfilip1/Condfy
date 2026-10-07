-- AlterTable
--
-- O código do comprovante de cada visita. O DEFAULT é VOLÁTIL de propósito: como `gen_random_uuid()`
-- não é uma constante, o Postgres o avalia UMA VEZ POR LINHA que já existe, e cada visita cadastrada
-- antes desta migration recebe o seu próprio código. Com um default constante seria o contrário —
-- todas as linhas com o mesmo valor —, e o índice único abaixo falharia.
ALTER TABLE "visitors" ADD COLUMN     "pass_code" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "visitors_pass_code_key" ON "visitors"("pass_code");
