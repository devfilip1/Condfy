import { Prisma, type User } from "../../generated/prisma/client.ts";
import type { Role } from "../../generated/prisma/enums.ts";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  LOCKOUT_MINUTES,
  ATTEMPT_WINDOW_MINUTES,
  MAX_SIGNIN_ATTEMPTS,
  REFRESH_TOKEN_TTL_DAYS,
} from "../lib/config.ts";
import {
  signedPhotoPathOf,
  type MembershipCondominium,
} from "../condominiums/condominium.service.ts";
import {
  MESSAGE_CHOOSE_CONDOMINIUM,
  MESSAGE_CHOOSE_UNIT,
  type FormErrors,
  type SignUpInput,
} from "./auth.dto.ts";
import { hashPassword, verifyPassword } from "../lib/password.ts";
import { prisma } from "../lib/prisma.ts";
import { MANAGING_ROLES } from "../lib/roles.ts";
import { generateRefreshToken, hashRefreshToken } from "../lib/tokens.ts";

/**
 * Regras de conta e sessão.
 *
 * Não conhece HTTP: não recebe requisição, não escolhe status code e não assina o token por conta
 * própria — quem sabe assinar é o controller, que passa a função. Por isso este módulo pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * O banco é em inglês e o contrato JSON em português (constituição III): a tradução é aqui.
 *
 * Não existe tabela de sessão: a sessão é a própria cadeia de credentials de renovação. Cada
 * rotação emite uma credencial com prazo novo, então quem usa o aplicativo permanece conectado;
 * o que encerra uma sessão é signOut, ficar 30 dias sem abrir, ou o reúso de uma credencial já
 * trocada (ADR 0007).
 */

/**
 * Hash usado quando o e-mail não existe, para que a conferência custe o mesmo tempo de uma conta
 * real e o tempo de resposta não revele quais e-mails estão cadastrados (FR-003).
 */
const DUMMY_HASH = await hashPassword("conta-inexistente");

/**
 * Assina a credencial de accessToken. O controller fornece, usando o plugin do Fastify.
 *
 * `provisional` é `true` para a conta cuja password ainda é a que o síndico definiu: o token sai
 * com uma marca que `authenticate` recusa em toda rota menos duas (feature 014, ADR 0018). É a
 * única coisa que o token carrega além da identidade, e só serve para TIRAR acesso.
 */
export type SignAccessToken = (userId: string, provisional: boolean) => string;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface Credentials {
  accessToken: string;
  refreshToken: string;
  /** ISO 8601: quando `accessToken` expira. */
  expiresAt: string;
  /** ISO 8601: prazo da credencial de renovação, contado de novo a cada rotação. */
  refreshExpiresAt: string;
}

export interface Session {
  user: AuthUser;
  credentials: Credentials;
}

/** Motivos de recusa que o controller traduz em status code. */
export type FailureReason = "credentials" | "bloqueado" | "session";

export class AuthError extends Error {
  reason: FailureReason;
  /** Segundos até a próxima tentativa, quando `reason` é `bloqueado`. */
  retryAfterSeconds: number | undefined;

  constructor(reason: FailureReason, retryAfterSeconds?: number) {
    super(`Falha de autenticação (${reason})`);
    this.name = "AuthError";
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Recusa de cadastro com error por campo, que o formulário exibe sob cada um (FR-028). */
export class SignUpError extends Error {
  errors: FormErrors;

  constructor(errors: FormErrors) {
    super("Cadastro recusado");
    this.name = "SignUpError";
    this.errors = errors;
  }
}

/** Converte a row do banco para o contrato. Nunca inclui `passwordHash` (FR-013 da 003). */
export function toAuthUser(row: User): AuthUser {
  return { id: row.id, name: row.name, email: row.email };
}

/**
 * Emite um par de credentials para o usuário.
 *
 * Grava só o hash da credencial de renovação e devolve o value em text uma única vez — o banco
 * não permite recuperá-lo depois. O prazo é sempre contado a partir de now, e é isso que
 * mantém conectado quem usa o aplicativo.
 *
 * `provisional` vem de quem chama, que já tem a linha do usuário na mão — esta função não a lê.
 */
export async function issueCredentials(
  userId: string,
  provisional: boolean,
  signAccessToken: SignAccessToken
): Promise<Credentials> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: {
      userId: userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    accessToken: signAccessToken(userId, provisional),
    refreshToken,
    expiresAt: new Date(
      Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000
    ).toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Bloqueio de tentativas (FR-005). Conta por e-mail e por origin ao mesmo      */
/* tempo: só por e-mail alguém trava a conta alheia; só por origin, quem varia  */
/* de IP passa. Vive no banco para sobreviver a um reinício (research R-006).   */
/* -------------------------------------------------------------------------- */

const MINUTE = 60 * 1000;

export function signInKeys(email: string, origin: string): string[] {
  return [`email:${email}`, `ip:${origin}`];
}

export function signUpKey(origin: string): string {
  return `signup-ip:${origin}`;
}

/** Lança `AuthError("bloqueado")` quando alguma das keys está bloqueada. */
export async function checkLockout(keys: string[]): Promise<void> {
  const now = new Date();
  const rows = await prisma.loginAttempt.findMany({
    where: { key: { in: keys }, blockedUntil: { gt: now } },
    orderBy: { blockedUntil: "desc" },
  });

  const bloqueio = rows[0]?.blockedUntil;
  if (bloqueio) {
    const segundos = Math.ceil((bloqueio.getTime() - now.getTime()) / 1000);
    throw new AuthError("bloqueado", segundos);
  }
}

/**
 * Soma uma falha em cada key e bloqueia ao chegar ao limite.
 * Uma janela vencida sem bloqueio recomeça a count do zero.
 */
export async function recordFailure(keys: string[]): Promise<void> {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - ATTEMPT_WINDOW_MINUTES * MINUTE
  );

  for (const key of keys) {
    const current = await prisma.loginAttempt.findUnique({ where: { key } });
    const count =
      current && current.windowStartedAt > windowStart ? current.attempts + 1 : 1;
    const bloqueado =
      count >= MAX_SIGNIN_ATTEMPTS
        ? new Date(now.getTime() + LOCKOUT_MINUTES * MINUTE)
        : null;

    await prisma.loginAttempt.upsert({
      where: { key },
      create: {
        key,
        attempts: count,
        windowStartedAt: now,
        blockedUntil: bloqueado,
      },
      update: {
        attempts: count,
        windowStartedAt: count === 1 ? now : current?.windowStartedAt,
        blockedUntil: bloqueado,
      },
    });
  }
}

/**
 * Sucesso zera a count daquele e-mail (FR-005a).
 * A key da origin permanece: um acerto não apaga o histórico de quem estava varrendo e-mails.
 */
export async function clearFailures(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key: `email:${email}` } });
}

/* -------------------------------------------------------------------------- */
/* Entrar, refresh e signOut                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Confere e-mail e password e abre uma sessão.
 *
 * E-mail inexistente e password errada seguem o mesmo caminho, com o mesmo custo de tempo: os dois
 * chamam `verifyPassword` (o inexistente contra um hash descartável) para não vazar, pelo tempo
 * de resposta, quais e-mails existem (FR-003).
 */
export async function signIn(
  email: string,
  password: string,
  origin: string,
  signAccessToken: SignAccessToken
): Promise<Session> {
  const keys = signInKeys(email, origin);
  await checkLockout(keys);

  const user = await prisma.user.findUnique({ where: { email } });
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const passwordMatches = await verifyPassword(password, hash);

  if (!user || !passwordMatches) {
    await recordFailure(keys);
    throw new AuthError("credentials");
  }

  await clearFailures(email);

  return {
    user: toAuthUser(user),
    credentials: await issueCredentials(
      user.id,
      user.passwordIsProvisional,
      signAccessToken
    ),
  };
}

/**
 * Troca a credencial de renovação por um par novo, com prazo novo (FR-011, FR-014).
 *
 * A troca é atômica: o `updateMany` com `revokedAt: null` no filtro é um compare-and-swap no
 * banco — dois pedidos simultâneos com a mesma credencial disputam e só um ganha. Quem perde cai
 * em `count === 0`, o mesmo caminho de uma credencial já trocada, que é sinal de cópia indevida e
 * derruba TODAS as credentials do usuário, em todos os aparelhos (FR-012).
 */
export async function refresh(
  refreshToken: string,
  signAccessToken: SignAccessToken
): Promise<Credentials> {
  const current = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    // A marca de password provisória é relida a cada renovação, na consulta que já existia: o
    // token renovado de uma conta provisória continua restrito.
    include: { user: { select: { passwordIsProvisional: true } } },
  });

  if (!current || current.expiresAt <= new Date()) {
    throw new AuthError("session");
  }

  const { count } = await prisma.refreshToken.updateMany({
    where: { id: current.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (count === 0) {
    await revokeAllForUser(current.userId);
    throw new AuthError("session");
  }

  return issueCredentials(
    current.userId,
    current.user.passwordIsProvisional,
    signAccessToken
  );
}

/** Encerra todas as sessões do usuário, em todos os aparelhos. */
export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId: userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Encerra a sessão daquele aparelho (FR-017).
 *
 * Idempotente: credencial desconhecida, já revogada ou vencida também é sucesso — quem pediu
 * para signOut não precisa saber do estado interno, e signOut não pode falhar (FR-017a). Os outros
 * aparelhos continuam conectados (FR-018).
 */
export async function signOut(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Cria a conta JUNTO com o pedido de entrada num condomínio, e já abre uma sessão.
 *
 * **Cadastrar-se é pedir para entrar** (feature 016). A conta nasce sem vínculo — não é moradora
 * de lugar nenhum — e com um `JoinRequest` para a unidade que a pessoa disse ser a dela. Quem
 * cuida do condomínio aprova ou rejeita; até lá a sessão aberta aqui só alcança a tela de espera.
 *
 * As duas gravações são UMA transação: nunca uma conta sem pedido por este caminho, nunca um
 * pedido sem conta. Uma conta sem condomínio e sem pedido — a que pode criar um condomínio — não
 * nasce mais daqui: nasce de `scripts/createAccount.ts`.
 *
 * A unidade é procurada antes só para devolver erro de CAMPO em vez de deixar a FK composta
 * estourar como 500; a garantia de que ela é daquele condomínio continua sendo do banco. Unidade
 * inexistente e unidade de outro condomínio recebem a mesma mensagem.
 */
export async function signUp(
  data: SignUpInput,
  origin: string,
  signAccessToken: SignAccessToken
): Promise<Session> {
  const key = signUpKey(origin);
  await checkLockout([key]);

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existing) {
    // Conta o e-mail repetido como tentativa: é o que impede varrer e-mails pelo cadastro.
    await recordFailure([key]);
    throw new SignUpError({ email: "This e-mail is already in use." });
  }

  const unit = await prisma.unit.findFirst({
    where: { id: data.unitId, condominiumId: data.condominiumId },
    select: { id: true },
  });
  if (!unit) {
    const condominium = await prisma.condominium.findUnique({
      where: { id: data.condominiumId },
      select: { id: true },
    });
    throw new SignUpError(
      condominium
        ? { unitId: MESSAGE_CHOOSE_UNIT }
        : { condominiumId: MESSAGE_CHOOSE_CONDOMINIUM }
    );
  }

  const passwordHash = await hashPassword(data.password);

  let user: User;
  try {
    user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: { name: data.name, email: data.email, passwordHash: passwordHash },
      });
      await transaction.joinRequest.create({
        data: {
          userId: created.id,
          condominiumId: data.condominiumId,
          unitId: data.unitId,
        },
        select: { id: true },
      });
      return created;
    });
  } catch (error) {
    // Outro cadastro com o mesmo e-mail passou pela conferência lá em cima ao mesmo tempo: quem
    // decide é o índice único, e quem perde recebe a mesma recusa.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await recordFailure([key]);
      throw new SignUpError({ email: "This e-mail is already in use." });
    }
    throw error;
  }

  return {
    user: toAuthUser(user),
    // Quem se cadastra escolheu a própria password: nunca é provisória.
    credentials: await issueCredentials(user.id, false, signAccessToken),
  };
}

/* -------------------------------------------------------------------------- */
/* Perfil de quem está autenticado                                           */
/* -------------------------------------------------------------------------- */

/**
 * Unidade onde a pessoa mora. `block` é `null` em condomínio sem blocos; juntos, `block` e
 * `number` SÃO o apartamento — não existe outra coluna para isso (research R-005).
 */
export interface ProfileUnit {
  id: string;
  block: string | null;
  number: string;
}

/**
 * Vínculo com um condomínio.
 *
 * É uma LISTA no perfil, e `units` é uma lista dentro dela, porque a mesma pessoa pode pertencer a
 * mais de um condomínio com cargo diferente em cada um, e morar em mais de uma unidade do mesmo
 * condomínio. É também o motivo de o token não carregar condomínio nem unidade (RN-AUT-05).
 */
export interface ProfileMembership {
  /**
   * `imageUrl` é a foto do condomínio, ou `null`. Vai AQUI, e não numa rota própria, de propósito:
   * o perfil parte dos vínculos de quem pediu, então não tem como trazer nome ou foto de um
   * condomínio alheio (feature 009, research R-001).
   *
   * Desde a feature 013 a foto tem duas origens possíveis: `imageUrl`, um endereço https, nos
   * condomínios de exemplo; e `photoPath`, um caminho relativo e assinado, quando o síndico enviou
   * uma. No máximo um dos dois vem preenchido, e o caminho é assinado de novo a cada leitura.
   */
  condominium: MembershipCondominium;
  role: Role;
  /** Vazia para quem tem vínculo sem morar em unidade alguma: o administrador e o síndico. */
  units: ProfileUnit[];
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  /**
   * A password ainda é a que o síndico definiu. Enquanto for `true` o aplicativo só mostra a tela
   * de escolher a password — e o servidor recusa todo o resto de qualquer jeito (ADR 0018).
   */
  passwordIsProvisional: boolean;
  /**
   * O pedido de entrada desta pessoa, ENQUANTO estiver pendente; `null` em todos os outros casos.
   * Com ele preenchido `memberships` vem vazia, e o aplicativo mostra só a tela de espera. Some
   * quando o pedido é aprovado — e a pessoa passa a ter um vínculo de moradora — ou quando a conta
   * deixa de existir, por rejeição ou desistência (feature 016).
   */
  joinRequest: ProfileJoinRequest | null;
  memberships: ProfileMembership[];
}

export interface ProfileJoinRequest {
  condominium: { id: string; name: string };
  unit: { block: string | null; number: string };
  /** ISO 8601: quando foi pedido. Um instante, lido na hora local. */
  requestedAt: string;
}

/**
 * Perfil de quem está autenticado: quem é, e onde pertence.
 *
 * Existe para o aplicativo não precisar guardar nome e e-mail no aparelho, e para as telas saberem
 * em qual condomínio e unidade a pessoa pode agir — o seletor de unidade do formulário de visitante
 * sai daqui.
 *
 * Conta apagada com credencial ainda válida cai em `AuthError("session")`. Verificar o token não
 * consulta o banco (RN-AUT-06), mas esta rota consulta, então é aqui que aquela janela fecha.
 */
export async function getProfile(userId: string): Promise<Profile> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      passwordIsProvisional: true,
      joinRequest: {
        select: {
          createdAt: true,
          // Só o nome: nem a foto nem o endereço do condomínio saem para quem ainda não entrou.
          condominium: { select: { id: true, name: true } },
          unit: { select: { block: true, number: true } },
        },
      },
      memberships: {
        select: {
          role: true,
          // `photoContentType` diz se há foto enviada sem tocar nos bytes dela: `photo` NUNCA
          // entra neste select (ADR 0012).
          condominium: {
            select: { id: true, name: true, imageUrl: true, photoContentType: true },
          },
          residences: {
            select: {
              unit: { select: { id: true, block: true, number: true } },
            },
            orderBy: [{ unit: { block: "asc" } }, { unit: { number: "asc" } }],
          },
        },
        orderBy: { condominium: { name: "asc" } },
      },
    },
  });

  if (!row) {
    throw new AuthError("session");
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordIsProvisional: row.passwordIsProvisional,
    joinRequest: row.joinRequest
      ? {
          condominium: row.joinRequest.condominium,
          unit: row.joinRequest.unit,
          requestedAt: row.joinRequest.createdAt.toISOString(),
        }
      : null,
    memberships: row.memberships.map((membership) => ({
      condominium: {
        id: membership.condominium.id,
        name: membership.condominium.name,
        imageUrl: membership.condominium.imageUrl,
        photoPath: signedPhotoPathOf(membership.condominium),
      },
      role: membership.role,
      units: membership.residences.map((residence) => residence.unit),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Mudar a própria conta (feature 010)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Motivos de recusa das três operações sobre a PRÓPRIA conta, que o controller traduz.
 *
 * - `currentPassword` → 400 no campo. **Nunca 401**: neste projeto 401 quer dizer "sua sessão não
 *   vale mais", e o aplicativo reage renovando a sessão e repetindo o pedido — o que mandaria a
 *   password errada duas vezes e contaria duas vezes para o bloqueio (ADR 0015).
 * - `sameEmail`, `emailTaken`, `samePassword` → 400 no campo.
 * - `administrator` → 409. A pessoa administra um condomínio, e a conta de quem administra não é
 *   apagada (FR-038).
 * - `hasRecords` → 409. Não administra hoje, mas avisos ou achados que publicou continuam
 *   apontando para ela, e esses registros são do condomínio.
 * - `noRequest` → 404. Desistir do pedido de entrada, quando não há pedido: ele acabou de ser
 *   respondido.
 */
export type AccountFailure =
  | "currentPassword"
  | "sameEmail"
  | "emailTaken"
  | "samePassword"
  | "administrator"
  | "hasRecords"
  | "noRequest";

export class AccountError extends Error {
  reason: AccountFailure;

  constructor(reason: AccountFailure) {
    super(`Mudança de conta recusada (${reason})`);
    this.name = "AccountError";
    this.reason = reason;
  }
}

/**
 * Confere a password atual de quem pediu. É a porta das três operações: nenhuma delas acontece só
 * porque há uma sessão aberta — um aparelho desbloqueado na mão errada não basta (FR-020).
 *
 * O contador de tentativas é o MESMO da entrada, com as mesmas chaves, de propósito: cinco chutes
 * são cinco chutes, sejam digitados na tela de entrar ou aqui (FR-021).
 *
 * Conta que sumiu com a credencial ainda válida cai em `AuthError("session")`, como em `getProfile`.
 */
async function verifyCurrentPassword(
  userId: string,
  currentPassword: string,
  origin: string
): Promise<{ id: string; email: string; passwordHash: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) {
    throw new AuthError("session");
  }

  const keys = signInKeys(user.email, origin);
  await checkLockout(keys);

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    await recordFailure(keys);
    throw new AccountError("currentPassword");
  }

  await clearFailures(user.email);
  return user;
}

/**
 * Troca o e-mail da conta. As sessões não mudam: quem pediu e os outros aparelhos continuam
 * conectados (FR-015).
 *
 * **Não há leitura de "este e-mail está livre?" antes de gravar, de propósito.** Dois pedidos
 * simultâneos passariam pela leitura e os dois gravariam; quem decide é o índice único, e quem
 * perde recebe a violação — a mesma lição do horário de reserva (ADR 0011).
 */
export async function changeEmail(
  userId: string,
  data: { email: string; currentPassword: string },
  origin: string
): Promise<{ email: string }> {
  const user = await verifyCurrentPassword(userId, data.currentPassword, origin);

  if (data.email === user.email) {
    throw new AccountError("sameEmail");
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: data.email },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AccountError("emailTaken");
    }
    throw error;
  }

  // O endereço antigo não entra mais em lugar nenhum; um bloqueio pendurado nele só confundiria
  // quem viesse a usá-lo depois.
  await clearFailures(user.email);

  return { email: data.email };
}

/**
 * Troca a password, encerra TODAS as sessões da conta e abre uma nova para quem pediu.
 *
 * Encerrar tudo e emitir um par novo é mais simples e mais seguro que "encerrar tudo menos esta":
 * não é preciso saber qual credencial de renovação é a de quem pediu.
 *
 * **Um limite que precisa estar escrito:** os outros aparelhos deixam de conseguir renovar na hora,
 * mas cada um continua funcionando até a credencial de acesso dele vencer — no máximo 15 minutos —,
 * porque ela é conferida sem consultar o banco (RN-AUT-06).
 */
export async function changePassword(
  userId: string,
  data: { currentPassword: string; newPassword: string },
  origin: string,
  signAccessToken: SignAccessToken
): Promise<Credentials> {
  const user = await verifyCurrentPassword(userId, data.currentPassword, origin);

  // Trocar a password por ela mesma não protege nada.
  if (await verifyPassword(data.newPassword, user.passwordHash)) {
    throw new AccountError("samePassword");
  }

  // A marca de provisória cai NO MESMO `UPDATE` que grava o hash, e não num segundo: é assim que
  // a conta criada pelo síndico deixa de ser provisória, e não pode haver um instante com a
  // password nova e a marca velha — nem o contrário (feature 014, research R-005).
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(data.newPassword),
      passwordIsProvisional: false,
    },
    select: { id: true },
  });

  // APAGA as credenciais de renovação, em vez de marcá-las como revogadas com `revokeAllForUser`.
  // A diferença decide se quem trocou a password continua conectado: `refresh` trata o uso de uma
  // credencial REVOGADA como cópia indevida e derruba todas as sessões da conta (RN-AUT-04). Com
  // as antigas só revogadas, o primeiro aparelho antigo que tentasse renovar derrubaria também a
  // sessão nova, aberta logo abaixo — e a pessoa que acabou de trocar a password seria
  // desconectada. Apagadas, elas viram credencial desconhecida: o aparelho antigo é recusado e
  // nada mais acontece (FR-019).
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  // O par novo sai SEM a restrição: a password agora é de quem a escolheu.
  return issueCredentials(user.id, false, signAccessToken);
}

/**
 * Apaga a conta de quem pediu. É uma instrução só, então é tudo ou nada (FR-039): o banco leva
 * junto as sessões, os vínculos, as moradias, as visitas que ela autorizou e as reservas que fez.
 *
 * A ordem importa:
 *
 * 1. A password. Só quem provou ser dono da conta ouve qualquer coisa sobre o estado dela.
 * 2. Administra algum condomínio → recusado. Os avisos e os achados do condomínio guardam o autor,
 *    e ainda não existe como passar a administração adiante (FR-038).
 * 3. O `DELETE`. Se o banco recusar é porque avisos ou achados ainda apontam para ela com
 *    `Restrict` — o caso de quem JÁ FOI administradora. Desde a feature 014 eles apontam para a
 *    conta, e não para o vínculo (ADR 0019); a recusa é a mesma. Isso tem de chegar como
 *    explicação, não como erro 500.
 *
 * Depois disso, entrar com os dados da conta falha exatamente como para um e-mail que nunca
 * existiu: não há nada a fazer para isso, a linha não está mais lá (FR-035).
 */
export async function deleteAccount(
  userId: string,
  data: { currentPassword: string },
  origin: string
): Promise<void> {
  const user = await verifyCurrentPassword(userId, data.currentPassword, origin);

  const administered = await prisma.condominiumMember.findFirst({
    where: { userId: user.id, role: { in: MANAGING_ROLES } },
    select: { userId: true },
  });
  if (administered) {
    throw new AccountError("administrator");
  }

  try {
    await prisma.user.delete({ where: { id: user.id }, select: { id: true } });
  } catch (error) {
    // `P2003` é violação de chave estrangeira: algo ainda aponta para um vínculo desta pessoa e
    // não pode perdê-lo. Só avisos e achados têm essa regra.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new AccountError("hasRecords");
    }
    throw error;
  }

  await clearFailures(user.email);
}

/* -------------------------------------------------------------------------- */
/* Desistir do pedido de entrada (feature 016)                                */
/* -------------------------------------------------------------------------- */

/**
 * A pessoa desiste do próprio pedido de entrada: o pedido E a conta deixam de existir.
 *
 * **Não pede a password**, ao contrário de `deleteAccount` — e é uma exceção estreita ao ADR 0015.
 * Aquela regra existe para um aparelho desbloqueado na mão errada não tomar a conta; esta rota só
 * funciona enquanto o pedido está pendente, e uma conta pendente não guarda nada: nenhum
 * condomínio, nenhum dado, nada a tomar (ADR 0021).
 *
 * Começa apagando o pedido, e só segue se apagou — como toda resposta a um pedido. Se quem cuida do
 * condomínio o aprovou no mesmo instante, este `DELETE` não acha nada, a conta NÃO é apagada e a
 * pessoa continua moradora.
 *
 * A conta só é apagada se não tem vínculo nenhum. Hoje um pedido só vem com conta nova, então
 * sempre é o caso; a trava existe para o dia em que alguém que já mora num lugar puder pedir outro.
 */
export async function withdrawJoinRequest(userId: string): Promise<void> {
  const removedEmail = await prisma.$transaction(async (transaction) => {
    const { count } = await transaction.joinRequest.deleteMany({
      where: { userId: userId },
    });
    if (count === 0) {
      throw new AccountError("noRequest");
    }

    const memberships = await transaction.condominiumMember.count({
      where: { userId: userId },
    });
    if (memberships > 0) {
      return null;
    }

    const user = await transaction.user.delete({
      where: { id: userId },
      select: { email: true },
    });
    return user.email;
  });

  if (removedEmail !== null) {
    await clearFailures(removedEmail);
  }
}
