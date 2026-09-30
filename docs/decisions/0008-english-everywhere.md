# 0008 · English everywhere: code, contract and database

**Status:** Accepted · **Date:** 2026-09 · **Supersedes:** [0006](0006-english-database-portuguese-contract.md)

## Context

The project used to speak two languages on purpose. The database was English
([ADR 0006](0006-english-database-portuguese-contract.md)); the code and the JSON contract were
Portuguese, because the constitution required the condominium vocabulary to appear in Portuguese
(Principle III). The resource service translated between the two.

That boundary had a cost that only became obvious once authentication arrived: a second resource
meant a second mapping table, and a reader following a request had to cross the language line in
every file — `entrar` calling `prisma.user`, `dataPrevista` becoming `expected_date`, `renovacao`
becoming `refresh_tokens`. The author, comparing with another project of his own written entirely
in English, found the mixture harder to read than either language alone.

## Decision

One vocabulary: **English**, for identifiers, files, routes, the JSON contract and the database.

- `Visitante` → `Visitor`, `dataPrevista` → `expectedDate`, `autorizadoPor` → `authorizedBy`.
- `entrar` / `cadastrar` / `renovar` / `sair` → `signIn` / `signUp` / `refresh` / `signOut`.
- Routes: `/visitantes` → `/visitors`, `/sessoes` → `/sessions`, `/sessoes/renovacao` →
  `/sessions/refresh`, `/contas` → `/accounts`.
- Error bodies: `{ erros }` → `{ errors }`, `{ mensagem }` → `{ message }`.
- Enum values on the wire are the database's own: `visitor`, `delivery`, `service_provider`.

Comments and documentation prose stay in Portuguese — they explain *why*, and the author reads
them. What is now English is everything a compiler sees.

The domain terms residents actually use — condomínio, síndico, portaria, visitante — remain in the
glossary of [product.md](../product.md), mapped to their English names in code.

## Alternatives considered

- **Keep the boundary (ADR 0006).** Preserves the domain language where the business lives. It
  costs a mapping table per resource and a mental context switch on every read.
- **Portuguese everywhere, including the database.** One vocabulary too, and closer to the
  business, but it fights every library, example and convention in the ecosystem — which is why
  ADR 0006 moved the database to English in the first place.

## Consequences

- The translation tables in the visitor service disappeared; the service now only converts the
  date between `DATE` and `"YYYY-MM-DD"`.
- The JSON contract changed shape, so app and server had to move together. Anything holding old
  credentials or calling `/visitantes` breaks — acceptable while the only client is this app.
- The constitution's Principle III had to be amended (v4.0.0): the domain vocabulary is no longer
  required to be Portuguese in code.
- A future reader sees one language in the code and Portuguese only in comments, where it carries
  explanation rather than identity.

**Evidence:** [visitor.service.ts](../../server/src/visitors/visitor.service.ts),
[auth.service.ts](../../server/src/auth/auth.service.ts),
[visitor.ts](../../mobile/features/visitors/domain/visitor.ts),
[api.md](../api.md)
