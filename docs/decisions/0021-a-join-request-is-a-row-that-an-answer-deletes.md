# 0021 · A join request is a row that an answer deletes, and "pending" is not a membership

**Status:** Accepted · **Date:** 2026-10

## Context

Until feature 016 no resident could enter a condominium from the app. The feature makes signing up
the way in: a person says which condominium and which apartment they live in, and whoever is in
charge of that condominium confirms it.

That leaves a state the system never had — somebody who has an account, has said where they live,
and is not yet let in — and four questions:

- where does that state live, when every permission in the system is answered by reading a
  membership?
- two people can answer the same request at the same moment, and the person can withdraw it at
  that same moment. What makes the outcome one?
- the request must be refused everything "by any route" until it is answered. Where is that
  enforced?
- the product owner decided that sign-up is for residents only. Then how does anybody ever get an
  account that can create a condominium?

## Decision

**A request is a row in a table of its own, `join_requests`, with no status.** One per person, by a
unique index; the apartment tied to the condominium by a composite foreign key. The row existing
*is* "pending". It is not a `resident` membership with a flag, and not a value of the role enum.

**Every answer begins by deleting that row, and continues only if it deleted one.** Approving then
creates the membership and the residency; rejecting and withdrawing then delete the account. The
delete is the referee: of two answers that arrive together, one removes a row and the other
removes none and is told the request no longer exists.

**A pending account is an account with no membership — and nothing was added to enforce that.**
Every route that takes a condominium already reads the caller's membership from the database, and
already answers a stranger `404`. The one thing an account with no membership can do is create a
condominium, and that now also refuses an account that has a request. Whether a person is waiting
travels in the profile (`joinRequest`), and the app's root layout gates on it.

**The lists a stranger chooses from are public, under `/directory`**, registered outside the
session group and away from `/condominiums`. Each query names its columns.

**An account that can create a condominium is made by a script**, `npm run account:create`. The API
has no route for it.

**Withdrawing asks for no password.**

## Alternatives considered

| Option | Why not |
|---|---|
| A `resident` membership with `pending: true` | Every permission check in seven services reads memberships. Each would have to exclude the pending ones, and one forgotten is a stranger inside the building. It would also need the "a resident lives in a unit" trigger to learn about pending residents |
| A status column — `pending`, `approved`, `rejected` | Nobody asked for a history, and every list would have to remember to filter. Rejection deletes the account anyway, so a `rejected` row would point at nothing |
| Read "is it still pending?", then act | Two approvals both read "yes". The delete cannot be passed twice |
| A claim in the access token, as for the provisional password ([0018](0018-a-provisional-account-carries-a-restriction-in-its-token.md)) | That claim is lifted by the person's own action, which hands them a new token on the spot. This one would be lifted by *somebody else's* action — the approval — leaving the approved person locked out until their token expired, up to 15 minutes |
| A second sign-up route, for people who will create a condominium | The door the owner chose to close |
| Asking for the password to withdraw, as [0015](0015-changing-the-account-asks-for-the-password-again.md) says for every change to an account | That rule stops an unlocked phone from taking an account over. An account that is only waiting has nothing to take |
| Keeping the account when a request is rejected | It would be an account that belongs to nowhere — exactly the one that is offered to create a condominium |

## Consequences

- **One requirement is met less strictly than it is written.** The spec says a pending account can
  do nothing "by any route" but see its request, withdraw it and sign out. Three routes about the
  person's *own account* — changing the e-mail, changing the password, deleting it — stay reachable
  by somebody who calls the API directly. None touches a condominium. The app offers none of them.
- **There is no history.** Once answered, a request is gone; who approved whom is not kept, and the
  loser of a race cannot be told whether the request was approved, rejected or withdrawn — only
  that it no longer exists. The app shows that as a note, not as a failure.
- **A new building enters the app only with help from outside it.** Somebody has to run the script
  for its síndico. This is the owner's decision, and the first thing to revisit if the product is
  to be self-service.
- **The names and addresses of the condominiums using the app are public**, and so are their block
  codes and apartment numbers. Nothing about people is.
- **Approval is the first writer of a resident in the application.** It writes the membership and
  the residency in one transaction because the database checks, at commit, that a resident lives
  somewhere.
- **A rejection or a withdrawal deletes an account without the person's password.** Both are
  guarded: the account is deleted only when it has no membership anywhere.
- **Nobody is notified.** The person learns the answer when the app re-reads the profile — on
  opening, on returning to the front, or by touching "Check again".

**Evidence:** migration `20261007160001_add_join_requests`,
[joinRequest.service.ts](../../server/src/condominiums/joinRequest.service.ts),
[auth.service.ts](../../server/src/auth/auth.service.ts) (`signUp`, `getProfile`,
`withdrawJoinRequest`),
[directory.service.ts](../../server/src/condominiums/directory.service.ts),
[condominium.service.ts](../../server/src/condominiums/condominium.service.ts),
[createAccount.ts](../../server/scripts/createAccount.ts),
[app/_layout.tsx](../../mobile/app/_layout.tsx)
