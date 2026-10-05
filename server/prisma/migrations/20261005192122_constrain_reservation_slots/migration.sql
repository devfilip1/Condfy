-- Duas garantias estruturais para `reservations`, que a feature 005 deixou de fora por não ter
-- ainda como gravar nenhuma linha.

-- 1. Nada de reserva dupla. A grade é fixa e toda reserva se alinha a ela, então duas reservas do
--    mesmo horário carregam os MESMOS três valores: a recusa vira chave duplicada, decidida pelo
--    banco sob concorrência, e não por um "confere antes de gravar" que dois pedidos passariam
--    (research R-001).
CREATE UNIQUE INDEX "reservations_common_area_id_date_start_minute_key"
  ON "reservations"("common_area_id", "date", "start_minute");

-- 2. Toda reserva na grade. O Prisma não expressa CHECK (ADR 0004), e a regra precisa valer para a
--    seed, para scripts e para um INSERT à mão — não só para quem passa pelo dto (research R-002).
--    420 = 07:00 … 1260 = 21:00, sempre duas horas.
--    A `reservations_minutes_check` existente (end > start) fica: virou implicada, mas diz outra
--    coisa, e remover uma para economizar DDL só tornaria uma mudança futura da grade mais perigosa.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_slot_grid_check"
  CHECK (
    "start_minute" IN (420, 540, 660, 780, 900, 1020, 1140, 1260)
    AND "end_minute" = "start_minute" + 120
  );
