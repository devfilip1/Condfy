# 0017 · The síndico returns as a third role, and "who is in charge" is asked in one place

**Status:** Accepted · **Date:** 2026-10

## Context

The role enum began with a `manager` (síndico) and a `doorman`. Feature 007 removed both and left
one role above resident, `admin`, saying the administrator had taken the síndico's place. From then
on every permission in the system was written as "is the administrator": twelve comparisons across
seven server files, and one flag in the app's session read by four features.

Feature 013 lets a person **create** a condominium from the app, and the product owner was explicit
that whoever does so is its síndico — a role of its own, not the administrator under another name.
The screens that follow are the síndico's.

So the system has three roles again, written for two.

## Decision

**`manager` is a third value of the `Role` enum**, and the creator of a condominium is given it.
A condominium has at most one síndico, by a partial unique index twin to the administrator's, and
may have an administrator as well — a different person, since a membership carries exactly one role.

**"Who is in charge of this condominium" is answered by one function on each side**:

- server: `managesCondominium(role)` in [roles.ts](../../server/src/lib/roles.ts)
- app: `managesCondominium(role)` in [session.ts](../../mobile/features/auth/domain/session.ts),
  and the session flag `managesSelectedCondominium`, renamed from `isAdminOfSelectedCondominium`

Every rule that said "only the administrator" calls it. **A role is never compared with `"admin"`
to decide a permission.**

**The síndico appears by role, not by name**, as the administrator does: `"Manager"`, in the home
header, as who authorized a visitor and as who published a notice.

**The two migrations are separate**: Postgres lets a transaction add an enum value and refuses to
let that transaction use it, so the value is added alone and the index that mentions it comes next.

## Alternatives considered

| Option | Why not |
|---|---|
| The síndico is the administrator, renamed | Rejected by the product owner: they are different roles. It would also have left nothing to tell them apart by when their powers diverge |
| A boolean `is_manager` beside the role | Two columns that can disagree — an administrator who is also flagged as síndico, or neither |
| A `condominium_managers` table | A second place to ask who runs a condominium, when every check already reads the membership |
| Rewriting each check as `role === "admin" \|\| role === "manager"` | Twelve places to keep in step on the day one rule becomes the síndico's alone. The function is the one place that will change |
| Keeping the name `isAdminOfSelectedCondominium` and returning true for a síndico | A name that lies in four features |

## Consequences

- **The síndico can do what the administrator can, plus what is the síndico's alone.** The first
  such rule arrived right after this decision: **creating a place to book**
  ([RN-RSV-14](../business-rules.md#rn-rsv-14--only-the-síndico-creates-a-place-and-every-field-is-required)).
  It does not call `managesCondominium` — it asks for the role by name, on both sides — and that is
  the shape of every rule that will be the síndico's only.
- **Nothing in the app creates an administrator.** The ones that exist came from sample data.
  Appointing one is expected to be a screen of the síndico's.
- **"Manager" is an assumption**, not a decision of the owner: the English word the role had before.
  It lives in one constant on each side — `displayName.ts` and `HeaderHome.tsx` — plus the role
  label of the chooser and the sentence of the visitor pass.
- **A síndico cannot delete their account** while they are one, for the reason an administrator
  cannot: the condominium would be left with nobody in charge.
- **Two places still tell the roles apart on purpose**, with a `switch` instead of the function:
  the display name and the role label. There each role has its own word.
- **Many comments still say "o administrador"** where the code now means either role. The function
  name is the truth; the comments were not all rewritten.
- This supersedes the sentence in `docs/product.md` and in the schema that said `admin` had replaced
  `manager`. [ADR 0010](0010-permission-rules-live-in-the-service.md) is unchanged: permission rules
  still live in the service — they now pass through one function there.
