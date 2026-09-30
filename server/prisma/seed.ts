import type { Role } from "../generated/prisma/enums.ts";
import { hashPassword } from "../src/lib/password.ts";
import { prisma } from "../src/lib/prisma.ts";

/**
 * Carga de data de exemplo para desenvolvimento e testes (contrato: specs/003, seed-command.md).
 *
 * Idempotente: cada registro tem id fixo e só é criado se ainda não existir, então rodar de novo
 * não duplica, não falha e não altera nada (research R-008). Nunca apaga registros.
 * A saída mostra só contagens, nunca nomes ou e-mails (FR-016).
 */

const id = (suffix: string): string => `00000000-0000-4000-8000-00000000${suffix}`;

const BRISAS = id("0001");
const PALMEIRAS = id("0002");

const CONDOMINIUMS = [
  { id: BRISAS, name: "Residencial Brisas" },
  { id: PALMEIRAS, name: "Vila das Palmeiras" },
];

// Bloco e número já em maiúsculas: o banco recusa outra forma (research R-005).
const BRISAS_A101 = id("0101");
const BRISAS_A102 = id("0102");
const BRISAS_B101 = id("0103");
const PALMEIRAS_1 = id("0104");
const PALMEIRAS_2 = id("0105");

const UNITS = [
  { id: BRISAS_A101, condominiumId: BRISAS, block: "A", number: "101" },
  { id: BRISAS_A102, condominiumId: BRISAS, block: "A", number: "102" },
  { id: BRISAS_B101, condominiumId: BRISAS, block: "B", number: "101" },
  { id: PALMEIRAS_1, condominiumId: PALMEIRAS, block: null, number: "1" },
  { id: PALMEIRAS_2, condominiumId: PALMEIRAS, block: null, number: "2" },
];

// Só para desenvolvimento: todas as contas de exemplo usam esta password (contrato da carga).
const SAMPLE_PASSWORD = "condfy123";

const ANA = id("0201");
const BRUNO = id("0202");
const CARLA = id("0203");
const DIEGO = id("0204");
const EVA = id("0205");
const FELIPE = id("0206");

// E-mails no domínio reservado .test, que nunca existe na internet.
const USERS = [
  { id: ANA, name: "Ana Souza", email: "ana@condfy.test" },
  { id: BRUNO, name: "Bruno Lima", email: "bruno@condfy.test" },
  { id: CARLA, name: "Carla Mendes", email: "carla@condfy.test" },
  { id: DIEGO, name: "Diego Rocha", email: "diego@condfy.test" },
  { id: EVA, name: "Eva Martins", email: "eva@condfy.test" },
  { id: FELIPE, name: "Felipe Alves", email: "felipe@condfy.test" },
];

interface SampleMembership {
  userId: string;
  condominiumId: string;
  role: Role;
  unitIds: string[];
}

// Cobre FR-028: os três cargos, morador de duas unidades (Bruno), pessoa em dois condomínios com
// cargos diferentes (Carla), síndico com e sem unidade e unidades com dois moradores.
const MEMBERSHIPS: SampleMembership[] = [
  { userId: ANA, condominiumId: BRISAS, role: "resident", unitIds: [BRISAS_A101] },
  { userId: BRUNO, condominiumId: BRISAS, role: "resident", unitIds: [BRISAS_A101, BRISAS_A102] },
  { userId: CARLA, condominiumId: BRISAS, role: "manager", unitIds: [] },
  { userId: DIEGO, condominiumId: BRISAS, role: "doorman", unitIds: [] },
  { userId: CARLA, condominiumId: PALMEIRAS, role: "resident", unitIds: [PALMEIRAS_2] },
  { userId: EVA, condominiumId: PALMEIRAS, role: "manager", unitIds: [PALMEIRAS_1] },
  { userId: FELIPE, condominiumId: PALMEIRAS, role: "resident", unitIds: [PALMEIRAS_2] },
];

const RESIDENCE_COUNT = MEMBERSHIPS.reduce((total, membership) => total + membership.unitIds.length, 0);

async function loadCondominiums(): Promise<void> {
  for (const condominium of CONDOMINIUMS) {
    await prisma.condominium.upsert({ where: { id: condominium.id }, create: condominium, update: {} });
  }
}

async function loadUnits(): Promise<void> {
  for (const unit of UNITS) {
    await prisma.unit.upsert({ where: { id: unit.id }, create: unit, update: {} });
  }
}

async function loadUsers(): Promise<void> {
  for (const user of USERS) {
    // Consulta antes de criar para não gastar um scrypt por conta a cada execução nem trocar
    // o hash de quem já existe (FR-029).
    const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (existing) continue;

    await prisma.user.create({ data: { ...user, passwordHash: await hashPassword(SAMPLE_PASSWORD) } });
  }
}

async function loadMemberships(): Promise<void> {
  for (const { userId, condominiumId, role, unitIds } of MEMBERSHIPS) {
    const existing = await prisma.condominiumMember.findUnique({
      where: { userId_condominiumId: { userId, condominiumId } },
      select: { userId: true },
    });
    if (existing) {
      // Recria só as moradias que faltarem; as que existem ficam como estão.
      await prisma.unitResident.createMany({
        data: unitIds.map((unitId) => ({ userId, condominiumId, unitId })),
        skipDuplicates: true,
      });
      continue;
    }

    // Vínculo e moradias numa única escrita aninhada (uma transação): a trigger adiada de
    // "morador tem unidade" só confere no fim, quando as moradias já existem (research R-010).
    await prisma.condominiumMember.create({
      data: {
        userId,
        condominiumId,
        role,
        residences: { create: unitIds.map((unitId) => ({ unitId })) },
      },
    });
  }
}

async function main(): Promise<void> {
  await loadCondominiums();
  await loadUnits();
  await loadUsers();
  await loadMemberships();

  console.log(
    `Example data loaded: ${CONDOMINIUMS.length} condominiums, ${UNITS.length} units, ` +
      `${USERS.length} users, ${MEMBERSHIPS.length} memberships, ${RESIDENCE_COUNT} residences.`,
  );
}

if (process.env.NODE_ENV === "production") {
  console.error("Example data must not be loaded in production.");
  process.exit(1);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown error while loading example data.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
