import { crc32, deflateSync } from "node:zlib";

import type { FoundItemStatus, Role, VisitType } from "../generated/prisma/enums.ts";
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
const AURORA = id("0003");

// Três condomínios: é isso que torna o isolamento entre clientes verificável só trocando de login.
//
// Cada um tem a SUA foto, e as três são diferentes de propósito: é ela que distingue os cards na
// escolha de condomínio e que aparece no banner da home (feature 009).
const CONDOMINIUMS = [
  {
    id: BRISAS,
    name: "Residencial Brisas",
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=70",
  },
  {
    id: PALMEIRAS,
    name: "Vila das Palmeiras",
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=70",
  },
  {
    id: AURORA,
    name: "Residencial Aurora",
    imageUrl: "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800&q=70",
  },
];

// Bloco e número já em maiúsculas: o banco recusa outra forma (research R-005).
const BRISAS_A101 = id("0101");
const BRISAS_A102 = id("0102");
const BRISAS_B101 = id("0103");
const PALMEIRAS_1 = id("0104");
const PALMEIRAS_2 = id("0105");
const AURORA_T1_201 = id("0106");
const AURORA_T1_202 = id("0107");

const UNITS = [
  { id: BRISAS_A101, condominiumId: BRISAS, block: "A", number: "101" },
  { id: BRISAS_A102, condominiumId: BRISAS, block: "A", number: "102" },
  { id: BRISAS_B101, condominiumId: BRISAS, block: "B", number: "101" },
  { id: PALMEIRAS_1, condominiumId: PALMEIRAS, block: null, number: "1" },
  { id: PALMEIRAS_2, condominiumId: PALMEIRAS, block: null, number: "2" },
  { id: AURORA_T1_201, condominiumId: AURORA, block: "T1", number: "201" },
  { id: AURORA_T1_202, condominiumId: AURORA, block: "T1", number: "202" },
];

// Só para desenvolvimento: todas as contas de exemplo usam esta password (contrato da carga).
const SAMPLE_PASSWORD = "condfy123";

const ANA = id("0201");
const BRUNO = id("0202");
const CARLA = id("0203");
const DANIEL = id("0204");

// Três moradores, um por condomínio, mais um administrador. E-mails no domínio reservado .test,
// que nunca existe na internet, então nenhum endereço real é alcançado por engano.
const USERS = [
  { id: ANA, name: "Ana Souza", email: "ana@condfy.test" },
  { id: BRUNO, name: "Bruno Lima", email: "bruno@condfy.test" },
  { id: CARLA, name: "Carla Mendes", email: "carla@condfy.test" },
  { id: DANIEL, name: "Daniel Castro", email: "daniel@condfy.test" },
];

interface SampleMembership {
  userId: string;
  condominiumId: string;
  role: Role;
  unitIds: string[];
}

/**
 * Um vínculo por morador, em condomínios diferentes, mais o administrador — que tem DOIS.
 *
 * Bruno e Carla pertencem a um condomínio só, então nunca veem a tela de escolha: trocar de login
 * troca o condomínio inteiro, que é o jeito mais direto de ver o isolamento entre clientes
 * funcionando.
 *
 * Ana mora nos TRÊS, para a tela de escolha poder ser testada com três cards, todos de moradora —
 * nenhum leva rótulo de cargo. No Palmeiras ela divide a unidade com o Bruno, o que o modelo
 * permite: moradia é pessoa × unidade.
 *
 * Daniel é a conta com dois vínculos, de propósito, para a escolha de condomínio poder ser vista
 * (feature 009, research R-010): ele ADMINISTRA o Brisas e MORA no Palmeiras. Os dois cards dele
 * são as duas formas que um card pode ter — cargo sem unidade, e unidade sem cargo.
 *
 * O administrador NÃO tem unidade — `unitIds` vazio. A trigger adiada
 * `condominium_members_resident_has_unit` só exige moradia de quem é `resident`, então o vínculo de
 * gestão existe sem apartamento nenhum (research R-010).
 */
const MEMBERSHIPS: SampleMembership[] = [
  { userId: ANA, condominiumId: BRISAS, role: "resident", unitIds: [BRISAS_A101] },
  { userId: ANA, condominiumId: PALMEIRAS, role: "resident", unitIds: [PALMEIRAS_1] },
  { userId: ANA, condominiumId: AURORA, role: "resident", unitIds: [AURORA_T1_202] },
  { userId: BRUNO, condominiumId: PALMEIRAS, role: "resident", unitIds: [PALMEIRAS_1] },
  { userId: CARLA, condominiumId: AURORA, role: "resident", unitIds: [AURORA_T1_201] },
  { userId: DANIEL, condominiumId: BRISAS, role: "admin", unitIds: [] },
  { userId: DANIEL, condominiumId: PALMEIRAS, role: "resident", unitIds: [PALMEIRAS_2] },
];

const RESIDENCE_COUNT = MEMBERSHIPS.reduce((total, membership) => total + membership.unitIds.length, 0);

interface SampleVisitor {
  id: string;
  name: string;
  type: VisitType;
  /** Dia de calendário `YYYY-MM-DD`. O seed grava à meia-noite UTC (research R-007). */
  expectedDate: string;
  unitId: string;
  condominiumId: string;
  /** Precisa ter vínculo em `condominiumId`, senão a FK composta recusa (research R-002). */
  authorizedById: string;
}

// Cobre os três tipos de visita e dá visitante a cada uma das três contas, em condomínios
// diferentes: assim a tela de Visitantes também mostra o isolamento ao trocar de login.
const VISITORS: SampleVisitor[] = [
  {
    id: id("0301"),
    name: "Rafael Nogueira",
    type: "visitor",
    expectedDate: "2026-10-20",
    unitId: BRISAS_A101,
    condominiumId: BRISAS,
    authorizedById: ANA,
  },
  {
    id: id("0302"),
    name: "Mercado Boa Compra",
    type: "delivery",
    expectedDate: "2026-10-21",
    unitId: BRISAS_A101,
    condominiumId: BRISAS,
    authorizedById: ANA,
  },
  {
    id: id("0303"),
    name: "Encanador Jorge",
    type: "service_provider",
    expectedDate: "2026-10-22",
    unitId: PALMEIRAS_1,
    condominiumId: PALMEIRAS,
    authorizedById: BRUNO,
  },
  {
    id: id("0304"),
    name: "Luiza Prado",
    type: "visitor",
    expectedDate: "2026-10-23",
    unitId: AURORA_T1_201,
    condominiumId: AURORA,
    authorizedById: CARLA,
  },
];

interface SampleCommonArea {
  id: string;
  condominiumId: string;
  name: string;
  /** Texto para não perder exatidão: o Prisma aceita e grava como DECIMAL(10,2). */
  usageFee: string;
  /** `null` exercita o placeholder da tela. O banco exige https (CHECK da migration). */
  imageUrl: string | null;
}

// Cinco locais: três no Brisas, dois no Palmeiras, para a isolação por condomínio ser testável
// sem mexer no banco à mão. Pelo menos um de graça, um com taxa real e um sem foto.
const COMMON_AREAS: SampleCommonArea[] = [
  {
    id: id("0401"),
    condominiumId: BRISAS,
    name: "Quiosque Quadra",
    usageFee: "0.00",
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=70",
  },
  {
    id: id("0402"),
    condominiumId: BRISAS,
    name: "Salão de Festas",
    usageFee: "150.00",
    imageUrl:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=70",
  },
  {
    id: id("0403"),
    condominiumId: BRISAS,
    name: "Churrasqueira",
    usageFee: "80.00",
    // Sem foto de propósito: é o caso que exercita o placeholder (FR-002b).
    imageUrl: null,
  },
  {
    id: id("0404"),
    condominiumId: PALMEIRAS,
    name: "Quadra Poliesportiva",
    usageFee: "0.00",
    imageUrl:
      "https://images.unsplash.com/photo-1505666287802-931dc83948e9?w=400&q=70",
  },
  {
    id: id("0405"),
    condominiumId: PALMEIRAS,
    name: "Espaço Gourmet",
    usageFee: "120.00",
    imageUrl:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&q=70",
  },
  {
    id: id("0406"),
    condominiumId: AURORA,
    name: "Salão de Festas",
    // Mesmo nome que o do Brisas de propósito: condomínios diferentes podem repetir nome, e a
    // unicidade é por condomínio (research R-006).
    usageFee: "200.00",
    imageUrl:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=70",
  },
  {
    id: id("0407"),
    condominiumId: AURORA,
    name: "Academia",
    usageFee: "0.00",
    imageUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=70",
  },
  {
    id: id("0408"),
    condominiumId: AURORA,
    name: "Piscina",
    usageFee: "50.00",
    // Sem foto: garante que o placeholder apareça no Aurora também.
    imageUrl: null,
  },
];

// Nenhuma reserva é carregada: nada nesta feature cria ou remove uma, então uma linha sem caminho
// de ida nem de volta pela interface seria uma armadilha nos dados de exemplo.

interface SampleNotice {
  id: string;
  condominiumId: string;
  publishedById: string;
  title: string;
  /** Guardado como veio: as quebras de linha separam parágrafos e precisam sobreviver (FR-002). */
  body: string;
  /** Dia de calendário `YYYY-MM-DD`. */
  date: string;
}

// Quatro avisos, todos no Brisas e publicados pelo administrador, escolhidos para que os casos de
// borda da lista apareçam logo na primeira execução: um longo com parágrafos (o corte de duas
// linhas), um curto (uma linha só, sem espaço reservado), e um com URL comprida (não pode alargar
// a linha). Os outros dois condomínios ficam SEM aviso nenhum, para o estado vazio ser alcançável
// só trocando de login.
const NOTICES: SampleNotice[] = [
  {
    id: id("0501"),
    condominiumId: BRISAS,
    publishedById: DANIEL,
    title: "Manutenção da caixa d'água",
    body:
      "A limpeza da caixa d'água acontece na próxima terça-feira, das 8h às 14h.\n\n" +
      "O fornecimento fica suspenso durante todo o período. Recomendamos armazenar água " +
      "suficiente para o dia na noite anterior.\n\n" +
      "Após a religação, a água pode sair turva por alguns minutos. É normal: deixe correr até " +
      "clarear antes de consumir.",
    date: "2026-10-03",
  },
  {
    id: id("0502"),
    condominiumId: BRISAS,
    publishedById: DANIEL,
    title: "Portão social com fechamento lento",
    // Curto de propósito: ocupa uma linha, e a linha não reserva espaço para a segunda (FR-009).
    body: "O portão social está com o fechamento lento. Aguarde fechar antes de sair.",
    date: "2026-10-01",
  },
  {
    id: id("0503"),
    condominiumId: BRISAS,
    publishedById: DANIEL,
    title: "Prestação de contas de setembro",
    // A URL comprida é o caso que não pode alargar a linha da lista.
    body:
      "A prestação de contas de setembro já está disponível para consulta no portal da " +
      "administradora:\n\n" +
      "https://portal.exemplo.com.br/condominios/residencial-brisas/prestacao-de-contas/2026/09\n\n" +
      "Dúvidas podem ser enviadas até o dia 20.",
    date: "2026-09-28",
  },
  {
    id: id("0504"),
    condominiumId: BRISAS,
    publishedById: DANIEL,
    title: "Festa junina do condomínio",
    body:
      "A festa acontece no dia 12, a partir das 18h, no salão de festas.\n\n" +
      "Cada apartamento pode levar um prato. As inscrições ficam na portaria.",
    date: "2026-09-20",
  },
];

interface SampleFoundItem {
  id: string;
  condominiumId: string;
  postedById: string;
  description: string;
  place: string;
  status: FoundItemStatus;
  /** Instante ISO 8601. Fixo, para a ordem da lista ser a mesma em toda execução. */
  postedAt: string;
  /** Cor da foto de exemplo, `[r, g, b]`. */
  color: [number, number, number];
}

// Três itens, todos no Brisas e postados pelo administrador: dois à espera do dono e um já
// devolvido, em três dias diferentes para a ordem ficar visível. Os outros condomínios ficam SEM
// item nenhum, para o estado vazio ser alcançável só trocando de login.
//
// As fotos são retângulos de cor lisa GERADOS aqui, e não arquivos: nenhuma imagem livre para
// redistribuir foi fornecida, e baixar uma de fora faria a carga depender de rede (feature 008,
// research R-014). A lista funciona igual; só não parece uma prateleira. Trocar por fotos de
// verdade é pôr os arquivos em `prisma/seed-assets/` e ler de lá.
const FOUND_ITEMS: SampleFoundItem[] = [
  {
    id: id("0601"),
    condominiumId: BRISAS,
    postedById: DANIEL,
    description: "Molho de chaves com chaveiro azul",
    place: "Borda da piscina, perto das espreguiçadeiras",
    status: "found",
    postedAt: "2026-10-04T21:30:00.000Z",
    color: [59, 111, 160],
  },
  {
    id: id("0602"),
    condominiumId: BRISAS,
    postedById: DANIEL,
    description: "Guarda-chuva preto, cabo de madeira",
    place: "Elevador social do bloco A",
    status: "found",
    postedAt: "2026-10-02T12:15:00.000Z",
    color: [70, 70, 78],
  },
  {
    id: id("0603"),
    condominiumId: BRISAS,
    postedById: DANIEL,
    description: "Óculos de grau com armação tartaruga",
    place: "Salão de festas",
    status: "returned",
    postedAt: "2026-09-29T18:40:00.000Z",
    color: [150, 104, 62],
  },
];

/** Um bloco PNG: tamanho, tipo, dados e o CRC do tipo com os dados. */
function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

/** Um PNG válido de cor lisa, 480×270, RGB de 8 bits. Alguns poucos kilobytes. */
function flatColorPng([red, green, blue]: [number, number, number]): Uint8Array<ArrayBuffer> {
  const width = 480;
  const height = 270;

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por canal
  header[9] = 2; // RGB, sem alfa
  // Compressão, filtro e entrelaçamento ficam em zero, que é o único valor definido para os três.

  // Cada linha começa com o byte do filtro (0, nenhum) e segue com os pixels.
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 3] = red;
    row[2 + x * 3] = green;
    row[3 + x * 3] = blue;
  }
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));

  const file = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  // Cópia para um `Uint8Array` de buffer próprio, que é o que a coluna `Bytes` do Prisma aceita:
  // um `Buffer` pode ser uma janela sobre memória compartilhada, e o tipo não deixa passar.
  return new Uint8Array(file);
}

async function loadCondominiums(): Promise<void> {
  for (const condominium of CONDOMINIUMS) {
    await prisma.condominium.upsert({ where: { id: condominium.id }, create: condominium, update: {} });
    // O `update: {}` acima nunca toca numa linha que já existe, então um banco carregado antes da
    // foto existir ficaria sem ela para sempre. Isto COMPLETA a linha — só onde a foto é nula — e
    // não sobrescreve nada: uma foto trocada à mão continua trocada.
    await prisma.condominium.updateMany({
      where: { id: condominium.id, imageUrl: null },
      data: { imageUrl: condominium.imageUrl },
    });
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

async function loadVisitors(): Promise<void> {
  for (const { expectedDate, ...visitor } of VISITORS) {
    await prisma.visitor.upsert({
      where: { id: visitor.id },
      create: {
        ...visitor,
        // Meia-noite UTC para a coluna DATE guardar exatamente o dia (research R-007).
        expectedDate: new Date(`${expectedDate}T00:00:00.000Z`),
      },
      update: {},
    });
  }
}

async function loadCommonAreas(): Promise<void> {
  for (const area of COMMON_AREAS) {
    await prisma.commonArea.upsert({
      where: { id: area.id },
      create: area,
      update: {},
    });
  }
}

async function loadNotices(): Promise<void> {
  for (const { date, ...notice } of NOTICES) {
    await prisma.notice.upsert({
      where: { id: notice.id },
      create: {
        ...notice,
        // Meia-noite UTC para a coluna DATE guardar exatamente o dia (research R-007).
        date: new Date(`${date}T00:00:00.000Z`),
      },
      update: {},
    });
  }
}

async function loadFoundItems(): Promise<void> {
  for (const { color, postedAt, ...item } of FOUND_ITEMS) {
    await prisma.foundItem.upsert({
      where: { id: item.id },
      create: {
        ...item,
        // Um instante, e não um dia: ao contrário das outras datas da carga, este vai inteiro.
        postedAt: new Date(postedAt),
        photo: flatColorPng(color),
        photoContentType: "image/png",
      },
      update: {},
      // Sem isto o upsert devolveria a linha inteira, foto incluída, só para ser jogada fora.
      select: { id: true },
    });
  }
}

async function main(): Promise<void> {
  await loadCondominiums();
  await loadUnits();
  await loadUsers();
  await loadMemberships();
  // Depois dos vínculos: cada visita aponta para um vínculo e para uma unidade.
  await loadVisitors();
  // Depende só do condomínio.
  await loadCommonAreas();
  // Depende do vínculo do administrador.
  await loadNotices();
  // Também depende do vínculo do administrador.
  await loadFoundItems();

  console.log(
    `Example data loaded: ${CONDOMINIUMS.length} condominiums, ${UNITS.length} units, ` +
      `${USERS.length} users, ${MEMBERSHIPS.length} memberships, ${RESIDENCE_COUNT} residences, ` +
      `${VISITORS.length} visitors, ${COMMON_AREAS.length} common areas, ` +
      `${NOTICES.length} notices, ${FOUND_ITEMS.length} found items.`,
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
