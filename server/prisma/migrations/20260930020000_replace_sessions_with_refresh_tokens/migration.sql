-- Troca o modelo de sessão: em vez de uma tabela `sessions` dona do prazo e da revogação, a
-- sessão passa a ser a própria cadeia de credenciais de renovação (ADR 0007).
-- Cada credencial carrega o próprio prazo, renovado a cada rotação: quem usa o aplicativo
-- permanece conectado. Reúso revoga todas as credenciais do usuário.
--
-- As credenciais existentes não sobrevivem à troca de modelo: quem estava conectado entra de novo.

DROP TABLE "refresh_tokens";
DROP TABLE "sessions";

CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK que o Prisma não expressa: o prazo nunca nasce vencido.
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_expires_after_created" CHECK ("expires_at" > "created_at");
