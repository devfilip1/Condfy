import type { User } from "../../generated/prisma/client.ts";
import type { Role } from "../../generated/prisma/enums.ts";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  LOCKOUT_MINUTES,
  ATTEMPT_WINDOW_MINUTES,
  MAX_SIGNIN_ATTEMPTS,
  REFRESH_TOKEN_TTL_DAYS,
} from "../lib/config.ts";
import { hashPassword, verifyPassword } from "../lib/password.ts";
import { prisma } from "../lib/prisma.ts";
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

/** Assina a credencial de accessToken. O controller fornece, usando o plugin do Fastify. */
export type SignAccessToken = (userId: string) => string;

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
  errors: { name?: string; email?: string; password?: string };

  constructor(errors: { name?: string; email?: string; password?: string }) {
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
 */
export async function issueCredentials(
  userId: string,
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
    accessToken: signAccessToken(userId),
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
    credentials: await issueCredentials(user.id, signAccessToken),
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

  return issueCredentials(current.userId, signAccessToken);
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
 * Cria a conta e já abre uma sessão (FR-026, FR-030).
 *
 * A conta nasce SEM vínculo com condomínio, sem cargo e sem unidade (FR-027): ligar a pessoa a um
 * condomínio é assunto de outra feature. Um `resident` sem unidade seria recusado pelo próprio
 * banco (trigger da feature 003), e é por isso que nenhum vínculo é criado aqui.
 */
export async function signUp(
  data: { name: string; email: string; password: string },
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

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
    },
  });

  return {
    user: toAuthUser(user),
    credentials: await issueCredentials(user.id, signAccessToken),
  };
}

/* -------------------------------------------------------------------------- */
/* Perfil de quem está autenticado                                            */
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
  condominium: { id: string; name: string };
  role: Role;
  /** Vazia para quem tem vínculo sem morar em unidade alguma: síndico e portaria. */
  units: ProfileUnit[];
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  memberships: ProfileMembership[];
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
      memberships: {
        select: {
          role: true,
          condominium: { select: { id: true, name: true } },
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
    memberships: row.memberships.map((membership) => ({
      condominium: membership.condominium,
      role: membership.role,
      units: membership.residences.map((residence) => residence.unit),
    })),
  };
}
