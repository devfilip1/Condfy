import { Prisma } from "../generated/prisma/client.ts";
import { validateAccountFields } from "../src/auth/auth.dto.ts";
import { hashPassword } from "../src/lib/password.ts";
import { prisma } from "../src/lib/prisma.ts";

/**
 * Cria uma conta que NÃO pertence a condomínio nenhum — a conta de quem vai criar um condomínio e
 * se tornar o síndico dele.
 *
 * **Desde a feature 016 este é o único jeito de uma conta assim passar a existir.** O cadastro do
 * aplicativo é só para moradores: sempre pede o condomínio e a unidade, e cria a conta com um
 * pedido de entrada. A API não tem rota que crie uma conta sem condomínio — por decisão do dono do
 * produto, o síndico de um prédio novo é cadastrado por fora do aplicativo. É por aqui.
 *
 * Uso, dentro de `server/`:
 *
 *     ACCOUNT_PASSWORD='…' npm run account:create -- "Nome da Pessoa" e-mail@exemplo.com
 *
 * A password vem do AMBIENTE, e não dos argumentos, para não ficar no histórico do terminal. As
 * três regras são as mesmas do cadastro. Nada do que é impresso contém o nome ou o e-mail: dado
 * pessoal não vai para log, e a saída de um script acaba em log.
 */

const [name, email] = process.argv.slice(2);
const password = process.env.ACCOUNT_PASSWORD ?? "";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!name || !email) {
  fail(
    'Usage: ACCOUNT_PASSWORD=… npm run account:create -- "<name>" <e-mail>'
  );
}

const { data, errors } = validateAccountFields({ name, email, password });
const problems = Object.entries(errors);
if (problems.length > 0) {
  // O campo e a regra, nunca o valor digitado.
  fail(problems.map(([field, message]) => `${field}: ${message}`).join("\n"));
}

try {
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
    },
    select: { id: true },
  });
  console.log(
    "Account created. It belongs to no condominium: signing in offers to create one."
  );
} catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    console.error("email: This e-mail is already in use.");
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await prisma.$disconnect();
}
