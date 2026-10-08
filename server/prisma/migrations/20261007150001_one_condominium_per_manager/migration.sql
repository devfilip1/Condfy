-- CreateIndex
--
-- Um síndico tem UM condomínio só (decisão do dono do produto, 2026-10-07). Índice único PARCIAL
-- sobre a pessoa, gêmeo de `condominium_members_one_manager_key`, que é sobre o condomínio: aquele
-- diz "um condomínio tem no máximo um síndico", este diz "uma pessoa é síndica de no máximo um".
--
-- É o banco que garante, e não uma conferência antes de gravar: dois pedidos de criação da mesma
-- conta, ao mesmo tempo, passariam os dois pela conferência (ADR 0011). O valor `manager` já
-- existia no enum, então não há a restrição de usar um valor recém-criado.
CREATE UNIQUE INDEX "condominium_members_one_condominium_per_manager_key" ON "condominium_members"("user_id") WHERE (role = 'manager');
