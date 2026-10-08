# 0010 · Permission rules live in the service, and a member who may not act gets 403

**Status:** Accepted · **Date:** 2026-10

## Context

Until the newsletter, no route in the project refused a request because of **who** was asking. Roles
had been stored per membership since [feature 003](../data-model.md#condominiummember) and read by
nothing; `business-rules.md` recorded that as a known gap, and the home screen hiding the Visitors
module from an administrator was explicitly noted as presentation, not permission.

Publishing a notice is the first operation that only one role may perform. That forces two decisions
at once, and both will be copied by every feature that follows:

1. **Where** the check lives — a Fastify hook, the controller, the service, or the database.
2. **Which status code** refuses, in a project whose every previous refusal answered `404` in order
   to hide what exists.

## Decision

**The check lives in the service**, beside the membership lookup that route already performs. The
controller translates the service's refusal into a status code and nothing more.

**The refusal splits in two**, and the line between them is membership:

| Caller | Answer |
|---|---|
| Not a member of that condominium | `404` — nothing is revealed |
| A member whose role is not `admin` | `403` — you may not do this |
| A member whose role is `admin` | proceeds |

## Why not the database

A composite foreign key can require that a `condominium_members` row **exists**; it cannot require
that the row's `role` column equals `'admin'`. The schema therefore guarantees *membership* and the
service guarantees *role* — a split worth remembering, because it is the first rule in the project
the schema cannot hold.

A constraint trigger could read the role on insert, and would be wrong for a subtler reason: the rule
belongs to the **moment of publishing**, not to the row's lifetime. An administrator who is replaced
should not retroactively invalidate the notices they published, which is exactly what a trigger
re-evaluated on a later write would imply.

## Why not a hook

A role is not a property of a person. It is a property of the pair *(person, condominium)*, so a
`preHandler` cannot know which role to check without the route's parameters and a database query —
at which point it is a service call wearing a hook's clothes. It would also run before the body was
validated, answering "you may not" to a request that was malformed anyway.

## Why 403 and not 404

Every previous refusal in this project hides existence: the same answer for a wrong password and an
unknown e-mail (RN-AUT-01), for an unknown unit and one in another condominium (ADR 0009), for an
unknown condominium and one the caller does not belong to. That reasoning exists to stop an outsider
enumerating what the system holds.

It does not apply to an insider. A resident of Residencial Brisas reads its notices every day;
answering "condominium not found" when she tries to publish would be a lie that helps nobody, teaches
her nothing, and makes the failure harder to diagnose. Consistency is not worth a wrong answer.

So membership is the boundary: hide existence from those outside it, explain the refusal to those
inside.

## Alternatives considered

- **A `requireAdmin` preHandler.** Reads well; needs the condominium id and a query anyway. Rejected
  above.
- **The check in the controller.** Puts a business rule in the HTTP layer, which the constitution
  forbids, and makes the rule unreachable from a script or a test that does not speak HTTP.
- **`404` for both refusals.** Consistent with the rest of the API and actively misleading for the
  resident case.
- **Enforcing it only in the app.** The screen already hides the action, and that is a courtesy. A
  hidden button is not a permission: the route is reachable without the screen, which is why the
  specification states the rule as something the system must refuse rather than something the app
  must not offer.

## Consequences

- Who may do what becomes a property of the service layer, callable from a script or a test without
  simulating a request.
- The API now has two refusal shapes, and the distinction must be deliberate in every future route:
  `403` is for someone the system knows and is turning down, `404` is for someone it is not willing
  to acknowledge.
- `docs/business-rules.md` can no longer say that no route refuses by role.
- The app may keep hiding actions that would be refused, and that remains presentation only.

**Evidence:** [notice.service.ts](../../server/src/condominiums/notice.service.ts),
[notice.controller.ts](../../server/src/condominiums/notice.controller.ts)

> **Amended in part by [0019](0019-what-a-person-published-points-at-the-person.md) (2026-10).** Since
> feature 014 the publisher of a notice points at the user, not at the membership, so the schema no
> longer guarantees membership for notices and found items: the service checks it too. The rest of
> this decision stands.
