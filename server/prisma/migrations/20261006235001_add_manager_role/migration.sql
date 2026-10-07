-- AlterEnum
--
-- O síndico volta como um cargo próprio (ADR 0017). Esta instrução fica SOZINHA neste arquivo de
-- propósito: o Postgres deixa acrescentar um valor a um enum dentro de uma transação, mas não deixa
-- USAR o valor novo antes de ela terminar. O índice parcial `WHERE role = 'manager'` usa, e por
-- isso está na migration seguinte. Juntar as duas falha com "unsafe use of new value".
ALTER TYPE "Role" ADD VALUE 'manager';
