-- AlterTable
--
-- Quando o visitante entrou: o instante da primeira conferência válida do comprovante (feature
-- 015). Sem valor padrão de propósito — toda visita que já existe fica com NULL, porque ninguém
-- foi conferido ainda, e uma visita nova nasce sem entrada.
ALTER TABLE "visitors" ADD COLUMN     "entered_at" TIMESTAMPTZ(3);
