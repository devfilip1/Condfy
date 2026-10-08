-- AlterEnum
--
-- O porteiro volta como o quarto cargo (feature 014). Esta instrução fica SOZINHA neste arquivo de
-- propósito: o Postgres deixa acrescentar um valor a um enum dentro de uma transação, mas não deixa
-- USAR o valor novo antes de ela terminar. Nada nesta feature usa `'doorman'` numa migration, mas
-- quem um dia criar um índice ou uma CHECK sobre ele acrescenta um arquivo, em vez de editar este.
ALTER TYPE "Role" ADD VALUE 'doorman';
