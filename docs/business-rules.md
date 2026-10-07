# Business rules

Every rule the system enforces today, where it is enforced, and what the user sees when it is
broken. Rules are grouped by domain and carry an identifier so commits and issues can cite them.

Two enforcement layers matter here:

- **App** (`mobile/`) validates to give a friendly error without spending the network.
- **Server** (`server/`) validates because it cannot trust its caller, and the **database**
  enforces what can be expressed as a constraint — see
  [ADR 0004](decisions/0004-integrity-rules-in-the-database.md).

---

## Visitors

The visitor form and its validation messages are in English, like the rest of the interface.

### RN-VIS-01 · A visitor needs a name of at most 60 characters

Surrounding spaces are trimmed before validating and before storing, so a name made only of
spaces counts as empty.

- **Where:** app — [visitor.ts](../mobile/features/visitors/domain/visitor.ts),
  `validateNewVisitor`; server — [visitor.dto.ts](../server/src/visitors/visitor.dto.ts);
  database — column `name VARCHAR(60)` in [schema.prisma](../server/prisma/schema.prisma)
- **Message:** `Name is required.` / `Name must be at most 60 characters.`

### RN-VIS-02 · The visit type is one of three fixed values

`visitor` (a person), `delivery` or `service_provider`. The app shows them as *Visitor*,
*Delivery* and *Service*. Contract and database use the same three values.

- **Where:** app — `TIPOS_VISITA` in
  [visitor.ts](../mobile/features/visitors/domain/visitor.ts); database — enum `VisitType`
  in [schema.prisma](../server/prisma/schema.prisma), which rejects any other value at insert time
- **Message:** `Select a visit type.`

### RN-VIS-03 · The expected date is a real calendar day

The date is a day, never a moment: no time, no timezone. `2026-02-31` is rejected because February
never has 31 days. Dates in the past are accepted — the system does not expire or clean up
visitors.

- **Where:** app — `ehDataISOValida` in [calendar.ts](../mobile/shared/lib/calendar.ts);
  server — its own copy in [visitor.dto.ts](../server/src/visitors/visitor.dto.ts);
  database — column `expected_date DATE`
- **Message:** `Expected date is required.` / `Enter a real date as DD/MM/YYYY.`

### RN-VIS-04 · The date the resident sees is the date that was registered

A visitor expected on the 14th shows the 14th on any device, in any timezone. The server converts
at the boundary: `"2026-09-14"` becomes midnight UTC on the way in, and the date is read back in
UTC on the way out.

- **Where:** [visitor.service.ts](../server/src/visitors/visitor.service.ts), `toVisitor`
  and `createVisitor`
- **Why it matters:** reading a `DATE` in local time is the classic off-by-one-day bug.

### RN-VIS-05 · The authorizing resident is required

Free text today; it is not linked to a user account.

- **Where:** app and server validation, as in RN-VIS-01
- **Message:** `Authorizing resident is required.`

### RN-VIS-06 · The list is ordered by expected date, nearest first

Ties are broken by creation order, then by id, so the order never shuffles between two loads. The
server sorts; the app re-sorts only when it inserts a newly created visitor into the list it
already has.

- **Where:** server — `listVisitors` in
  [visitor.service.ts](../server/src/visitors/visitor.service.ts); app —
  `sortByExpectedDate` in [visitor.ts](../mobile/features/visitors/domain/visitor.ts)

### RN-VIS-07 · Removing a visitor twice is not an error

Deleting a visitor that no longer exists (already removed on another device) returns the same
success as deleting an existing one, and the app just refreshes its list.

- **Where:** server — `removeVisitor` uses `deleteMany` in
  [visitor.service.ts](../server/src/visitors/visitor.service.ts); the route answers `204`
  either way ([visitor.controller.ts](../server/src/visitors/visitor.controller.ts))

### RN-VIS-08 · Visitors cannot be edited

There is no update route and no edit screen, by product decision. Fixing a wrong record means
removing it and registering it again.

- **Where:** absence of `PUT`/`PATCH` in
  [visitor.controller.ts](../server/src/visitors/visitor.controller.ts)

### RN-VIS-09 · A visitor only appears after the server confirms it

The app never shows an optimistic card. While the request is in flight the confirm button is
disabled, which also prevents a double tap from creating two visitors.

- **Where:** `addVisitor` in
  [useVisitors.ts](../mobile/features/visitors/hooks/useVisitors.ts) (the `submittingRef` guard)

### RN-VIS-10 · A failed load never looks like an empty list

If the list cannot be fetched, the screen shows a failure message and a *Try again* button. The
"no visitors yet" message is reserved for a successful, genuinely empty response.

- **Where:** `lista` state in [useVisitors.ts](../mobile/features/visitors/hooks/useVisitors.ts);
  rendering in [VisitorsScreen.tsx](../mobile/features/visitors/VisitorsScreen.tsx)
- **Message:** `Couldn't load visitors. Check your connection and try again.`

### RN-VIS-11 · Only the administrator sees other people's visitors, and nobody removes a visitor they did not authorize

What a person sees in the visitor list depends on their role in that condominium:

- the **administrator** sees every visit of the condominium, to any unit and authorized by anyone;
- a **resident** sees only the visits they authorized themselves — not those of a neighbour, and
  not those of somebody they live with.

Every card says **who authorized** the visit and **for which unit**, with the block and the number.
On the administrator's list that is what tells one visit from another.

**Seeing is not removing.** A visit is removed only by whoever authorized it. The administrator
sees everybody's and can delete only their own; on the others the card has no remove control at
all. A removal aimed at somebody else's visit deletes nothing and answers as if the visit were
already gone (RN-VIS-07), so it reveals nothing.

The screen does not work this out by comparing people: each visit arrives saying whether the
person looking may remove it.

The role is per condominium. Somebody who administers one building and lives in another sees
everything in the first and only their own in the second.

- **Where:** `visibleTo`, `toVisitor` (`canRemove`) and `removeVisitor` in
  [visitor.service.ts](../server/src/visitors/visitor.service.ts);
  [VisitorCard.tsx](../mobile/features/visitors/components/VisitorCard.tsx)

### RN-VIS-12 · The administrator authorizes visitors too, for any unit

The administrator has the Visitors module and registers a visitor like a resident does, except for
the unit: a resident chooses among the units they live in, the administrator among **all** the units
of the condominium. The visit is recorded as authorized by the administrator, so it is theirs to
remove — and the residents of that unit do **not** see it, since a resident sees only what they
authorized themselves (RN-VIS-11).

The list of units is given only to the administrator; a resident asking for it is refused (`403`).

- **Where:** `listUnits` in [unit.service.ts](../server/src/condominiums/unit.service.ts),
  `useVisitors` in [useVisitors.ts](../mobile/features/visitors/hooks/useVisitors.ts), and
  [modules.ts](../mobile/features/home/data/modules.ts)

### RN-VIS-13 · Every visit has a pass with a code of its own, and only who authorized it gets the code

Each registered visit has one **pass**, from the moment it is registered until it is removed, and
one **code** that belongs to it alone. Two visits never share a code — not even two visits of the
same person on the same day.

The code is generated by the **database**, not by the API, so it holds for every writer. It never
changes: the pass opened or shared any number of times carries the same code. It cannot be worked
out from the visitor's name, the date or another code, and it is removed with the visit — there is
no separate "revoke".

The code is sent **only to whoever authorized the visit**. The administrator sees every visit of
the condominium and receives the code of none but their own, so they cannot open somebody else's
pass. It is the same line that decides who may remove a visit (RN-VIS-11), and the screen does not
compare people to draw it: a card opens a pass when a code arrived with it.

What a scan returns is `condfy:pass:` followed by the code. No name, no date, nothing personal.

- **Where:** `pass_code` in the
  [migration](../server/prisma/migrations/20261006231458_add_visitor_pass_code/migration.sql),
  `toVisitor` in [visitor.service.ts](../server/src/visitors/visitor.service.ts), and `passQrValue`
  in [visitor.ts](../mobile/features/visitors/domain/visitor.ts)

### RN-VIS-14 · The pass opens on registering, is shared as a picture, and is valid for the day of the visit

When a visitor is registered the pass opens by itself; a failed registration opens nothing. It
opens again from the visitor's card.

The pass is a square that says, in this order: a greeting to the visitor by name; who authorizes
their entry and to which condominium — a resident by name, the administrator as "Administrator"
(RN-MEM-04); the day it is valid; the QR code; and the Condfy mark. It shows no unit: a picture
that gets forwarded should not say where somebody lives.

Under the square there is a **Share** button, which hands the pass to the device's own sharing
options as **one picture of the whole pass and nothing else**. The picture is always the same light
design, whatever appearance the app is in. The app sends it nowhere by itself. Where a device cannot
share a picture, the picture is saved instead and the person is told.

A pass is valid for the **expected day of the visit** and no other. Once that day has passed, the
pass says it is no longer valid and cannot be shared.

**Nobody reads a code inside the app yet.** At the gate the pass is checked by eye; a reader is a
later feature, and it will find the code already stored with each visit.

- **Where:** [VisitorPass.tsx](../mobile/features/visitors/components/VisitorPass.tsx),
  [VisitorPassModal.tsx](../mobile/features/visitors/components/VisitorPassModal.tsx),
  [passSharing.ts](../mobile/features/visitors/services/passSharing.ts), `isPassExpired` in
  [visitor.ts](../mobile/features/visitors/domain/visitor.ts);
  [ADR 0016](decisions/0016-the-visitor-pass-is-a-picture-made-on-the-device.md)

---

## Condominiums, units and people

None of these rules is reachable from the app yet: they are enforced on whatever writes to the
database, including the seed script. Most live in the migration rather than in TypeScript.

### RN-CON-01 · A condominium needs a non-empty, trimmed name

Two condominiums may share the same name; they are told apart by id.

- **Where:** `CHECK condominiums_name_check` in
  [create_users_condominiums migration](../server/prisma/migrations/20260929040409_create_users_condominiums/migration.sql)

### RN-CON-03 · Anybody signed in creates a condominium and becomes its síndico

A signed-in person creates a condominium from the app with four things: its **name** (up to 100
characters), its **address** (free text, up to 200), its **blocks** and, optionally, a **photo**.
Whoever creates it becomes its **síndico** (RN-MEM-05). There is no approval and nothing checks that
the person really runs that building; two condominiums may share a name (RN-CON-01).

The offer appears on the home screen of an account that belongs to no condominium, as a button the
person can leave alone, and on the condominium chooser for somebody who already belongs to one.
After creating, the person is taken straight into the new condominium.

Creation is **all or nothing**: the condominium, every unit of every block and the membership of the
síndico are written together or not at all. A new condominium starts with one member — its síndico.
Nothing lets a resident join one from the app yet.

Nothing about a condominium can be changed afterwards yet.

- **Where:** `createCondominium` in
  [condominium.service.ts](../server/src/condominiums/condominium.service.ts), and
  [useCreateCondominium.ts](../mobile/features/condominiums/hooks/useCreateCondominium.ts)

### RN-CON-04 · A condominium is created with at least one block, each with a code of one or two letters

The síndico adds as many blocks as they want, up to 50, and at least one. Each block has a **code**
of one or two letters from A to Z, stored in upper case whatever was typed — digits, accents and
symbols are refused — and unique inside the condominium. Each block also has a **number of units**,
from 1 to 500, and a condominium has at most 2000 units in all.

The units of a block are created numbered from 1: block "A" of 40 units has A-1 to A-40. A building
without blocks is registered as one block.

**The two-letter rule is in the validation, not in the database** — the opposite of the habit of
this project. Condominiums that existed before have blocks called `T1` and units with no block,
and they keep working; a CHECK would refuse them. The rule is about what the form creates.

- **Where:** `validateNewCondominium` in
  [condominium.dto.ts](../server/src/condominiums/condominium.dto.ts) and in
  [newCondominium.ts](../mobile/features/condominiums/domain/newCondominium.ts) — mirrored, change
  both together

### RN-CON-05 · The photo of a condominium is optional, uploaded from the device, and its size is advice

The form takes a photo from the camera or the gallery and states the recommended size, 1200 × 675
pixels (16:9), which fits the home banner. That is advice: a photo of another size is accepted and
cropped to fit. Without a photo the condominium shows the placeholder.

The photo must be a JPEG, PNG or WebP of at most 5 MB; the server decides the type from the bytes.
It is stored in the database and served through a path signed for 24 hours, outside the session
group — the mechanism of found items
([ADR 0012](decisions/0012-files-live-in-the-database-and-are-served-by-signed-paths.md)). **No
query selects the bytes of the photo** except the route that serves them.

A condominium now gets its picture from an uploaded photo or, in the sample data, from an `https`
address; one function in the app turns the two into one address.

- **Where:** `readCondominiumPhoto` and `signedPhotoPathOf` in
  [condominium.service.ts](../server/src/condominiums/condominium.service.ts),
  [condominiumPhoto.controller.ts](../server/src/condominiums/condominiumPhoto.controller.ts), and
  [condominiumPhoto.ts](../mobile/features/auth/services/condominiumPhoto.ts)

### RN-CON-02 · A condominium with units or members cannot be deleted

Foreign keys from `units` and `condominium_members` use `ON DELETE RESTRICT`.

- **Where:** same migration, foreign key section

### RN-UNI-01 · A unit is unique within its condominium

Block plus number must not repeat in the same condominium, and units without a block must not
repeat the number either. The same "A 101" may exist in another condominium.

- **Where:** unique indexes `units_condominium_id_block_number_key` and the partial index
  `units_number_without_block_key` (`WHERE block IS NULL`) in the migration
- **Why two indexes:** in SQL, `NULL` never equals `NULL`, so a plain unique index would allow
  unlimited unit "12" rows with no block ([ADR 0004](decisions/0004-integrity-rules-in-the-database.md))

### RN-UNI-02 · Block and number are stored uppercase and trimmed

`a 101` and `A 101` are the same unit. Instead of comparing case-insensitively, the database
refuses to store anything that is not already normalized, so uniqueness is exact.

- **Where:** `CHECK units_number_check` and `units_block_check` in the migration
- **Consequence:** whoever writes must normalize first — the database rejects, it does not fix.

### RN-UNI-03 · A unit with residents cannot be deleted

- **Where:** `unit_residents` foreign key with `ON DELETE RESTRICT`

### RN-USR-01 · One account per e-mail, stored lowercase and trimmed

E-mails are unique across the whole system, not per condominium, and must look like an e-mail
(`local@domain.tld`).

- **Where:** `users_email_key` unique index and `CHECK users_email_check` (lowercase, trimmed,
  format) in the migration

### RN-USR-02 · The password is never stored in a readable or reversible form

Only a `scrypt` derivation is stored, in the format `scrypt$N$r$p$salt$hash`, which records the
parameters used so they can be hardened later without invalidating existing passwords. A wrong
format never verifies.

- **Where:** [password.ts](../server/src/lib/password.ts), `hashPassword` and `verifyPassword`
- **See also:** [ADR 0005](decisions/0005-scrypt-for-passwords.md)

### RN-USR-03 · Deleting a user deletes everything about them

Memberships and residency rows cascade; the e-mail becomes available again. There is no
"deactivated" state.

- **Where:** `ON DELETE CASCADE` on `condominium_members.user_id` and on the membership foreign
  key of `unit_residents`

### RN-USR-04 · Personal data never reaches the logs

Names and e-mails must not be written to server logs or app logs. The Fastify logger records
method, URL, status and duration, never the request body; the seed prints counts only.

- **Where:** [server.ts](../server/src/server.ts) (default serializers) and
  [seed.ts](../server/prisma/seed.ts)

### RN-MEM-01 · One membership per user and condominium, carrying exactly one role

The primary key is the pair (user, condominium), so a second membership in the same condominium is
impossible by construction.

- **Where:** `@@id([userId, condominiumId])` in [schema.prisma](../server/prisma/schema.prisma)

### RN-MEM-02 · At most one administrator and at most one síndico per condominium

A second `admin` membership is rejected, and so is a second `manager`. The two limits are
independent: a condominium may have one administrator **and** one síndico, who are different people
because a membership carries one role. Having neither is allowed. Whether a management company may
have several administrators is open.

- **Where:** partial unique indexes `condominium_members_one_admin_key` (`WHERE role = 'admin'`)
  and `condominium_members_one_manager_key` (`WHERE role = 'manager'`)

### RN-MEM-03 · Removing a membership removes that person's residency in that condominium

- **Where:** `unit_residents` references the membership, not the user directly, with
  `ON DELETE CASCADE`

### RN-MEM-04 · The administrator goes by "Administrator" in the condominium they administer

Wherever a person's name is shown inside a condominium they administer, it reads **Administrator**
instead of their own name: at the top of their home screen, as who authorized a visitor, and as who
published a notice. Residents never see the administrator's personal name there.

It follows the role, which is per condominium and per moment:

- the same person shows their own name in a condominium where they are a resident;
- it is the role **now** that counts, not the one at the time — a notice published by somebody who
  is no longer the administrator shows that person's name.

Two places keep the real name on purpose: the person's own Settings, which show their account as it
is, and the sign-in data. The profile route is not changed; the home screen swaps what it shows.

- **Where:** `displayNameOf` in [displayName.ts](../server/src/lib/displayName.ts), used by
  [visitor.service.ts](../server/src/visitors/visitor.service.ts) and
  [notice.service.ts](../server/src/condominiums/notice.service.ts); and
  [HeaderHome.tsx](../mobile/features/home/components/HeaderHome.tsx), which carries the same text

### RN-MEM-05 · The síndico is a role of its own, and is in charge like the administrator

There are three roles: resident, administrator and **síndico** (`manager`). The síndico is whoever
created the condominium, lives in no unit of it, and is **not** the administrator under another
name ([ADR 0017](decisions/0017-the-sindico-returns-as-a-third-role.md)).

**Every rule in this document that says "only the administrator" means "the administrator or the
síndico".** The question "who is in charge of this condominium" is asked in one place on each side,
and a role is never compared with `admin` to decide a permission.

What the síndico can do that the administrator cannot has not been defined yet: for now, exactly
the same. The roles are kept apart so that they can diverge.

The síndico goes by **"Manager"** inside their condominium, the way the administrator goes by
"Administrator" (RN-MEM-04), and cannot delete their account while they are one.

- **Where:** `managesCondominium` in [roles.ts](../server/src/lib/roles.ts) and in
  [session.ts](../mobile/features/auth/domain/session.ts); `displayNameOf` in
  [displayName.ts](../server/src/lib/displayName.ts)

### RN-RES-01 · A resident only lives in units of a condominium they belong to

Residency points at the membership and at the unit through two composite foreign keys that share
the same `condominium_id`, so a mismatch cannot be inserted.

- **Where:** `unit_residents_user_id_condominium_id_fkey` and
  `unit_residents_unit_id_condominium_id_fkey` in the migration; model `UnitResident` in
  [schema.prisma](../server/prisma/schema.prisma)

### RN-RES-02 · Every resident lives in at least one unit

Checked at the end of each transaction, not at each statement, so a membership and its first
residency can be created together. A transaction that ends with a resident without a unit is
rolled back. Managers and doormen may live in a unit but are not required to.

- **Where:** function `enforce_resident_has_unit` and the two
  `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` in the migration
- **Message (database):** `A resident must live in at least one unit of the condominium.`

---

## Authentication and sessions

### RN-AUT-01 · Signing in never reveals which e-mails exist

A wrong password and an unknown e-mail get the same message and the same response time — the
server hashes a throwaway password when the account does not exist, so the delay matches.

- **Where:** `signIn` in [auth.service.ts](../server/src/auth/auth.service.ts)
- **Message:** `E-mail or password is incorrect.`
- **Known exception:** signing up must say when an e-mail is already in use (RN-AUT-08), which
  does expose existence. Closing that would require e-mail confirmation, deliberately out of scope.

### RN-AUT-02 · Five failures block sign-in for 15 minutes

Counted on two axes at once — the e-mail and the request origin — and whichever hits the limit
first blocks. During the block, even the correct password is refused, so the block never confirms
a guess. A successful sign-in clears the e-mail counter; the origin counter stays.

- **Where:** `checkLockout`, `recordFailure` and `clearFailures` in
  [auth.service.ts](../server/src/auth/auth.service.ts); table `login_attempts`
- **Message:** `Too many attempts. Try again in a few minutes.` with `Retry-After`
- **Why both axes:** only by e-mail, anyone could lock someone else's account on purpose; only by
  origin, an attacker who changes IP walks through.

### RN-AUT-03 · Using the app keeps you signed in; 30 days away ends it

The access credential lasts 15 minutes and is renewed silently. Each renewal issues a renewal
credential with a **new** 30-day deadline, so opening the app at least once a month means never
typing the password again. Thirty days without opening it, and the credential expires.

- **Where:** `issueCredentials` and `refresh` in
  [auth.service.ts](../server/src/auth/auth.service.ts); `refresh_tokens.expires_at`

### RN-AUT-04 · Reusing a renewal credential signs the person out everywhere

Each renewal revokes the credential it replaces. Presenting an already-revoked one means someone
holds a copy, so **every** renewal credential of that user is revoked — every device. The person
signs in again, and the thief's copy is worthless.

The swap is atomic: the update filters on `revoked_at IS NULL`, so two simultaneous renewals with
the same credential race in the database and exactly one wins. The loser takes the reuse path.

- **Where:** `refresh` and `revokeAllForUser` in
  [auth.service.ts](../server/src/auth/auth.service.ts)
- **Cost accepted:** a lost response followed by a retry looks exactly like a copy, and signs the
  person out of every device. The app renews once at a time, which avoids causing it itself.

### RN-AUT-05 · The access token carries identity and nothing else

`sub`, `iat`, `exp` — and nothing else. No role, no condominium, no unit: a token never goes stale
because something changed elsewhere, and the API never has to trust a claim about permissions.
Confirmed on 2026-10-02 by decoding a token returned by `POST /sessions`.

There is no `iss` and no `aud` either, on purpose. One API signs and verifies with one secret, so an
issuer claim would only be checked against itself; it starts paying off when a second service or a
second environment shares the key. Worth knowing before changing this: adding `{ issuer: … }` to the
verify options without also signing it would reject every token already issued.

Why identity and nothing else, concretely: a person can belong to **more than one** condominium with
a different role in each, and can live in more than one unit of the same condominium — the example
data covers both cases on purpose. So there is no single condominium or unit that could go in a
token. And a permission baked into one could not be withdrawn before it expired, since verifying a
token never touches the database (RN-AUT-06 caps that window at 15 minutes). Endpoints that need a
condominium read it from the resource or from the path, and check the membership against the
database each time ([ADR 0009](decisions/0009-visitors-belong-to-a-unit-and-a-membership.md)).

- **Where:** `signAccessToken` in [auth.controller.ts](../server/src/auth/auth.controller.ts), using
  the plugin registered in [server.ts](../server/src/server.ts)

### RN-AUT-06 · A deleted account keeps access for at most 15 minutes

Verifying the token does not touch the database, so the access credential stays valid until it
expires. Renewal is refused immediately, which caps the window at one cycle.

- **Where:** [authenticate.ts](../server/src/auth/authenticate.ts); the cascade from
  `users` to `refresh_tokens`

### RN-AUT-07 · Signing out works without a network

The app erases the credentials from the device first, then tells the server. If that call fails,
it is forgotten: the orphan credential dies by expiry or on the first reuse attempt (RN-AUT-04).

- **Where:** `signOut` in [useAuth.tsx](../mobile/features/auth/hooks/useAuth.tsx) and in
  [auth.service.ts](../server/src/auth/auth.service.ts)

### RN-AUT-08 · An account is created without a condominium

Sign-up asks for name, e-mail and password, and signs the person in. It creates no membership, no
role and no residency: linking a person to a condominium is a later feature. A `resident`
membership without a unit would be refused by the database anyway
([RN-RES-02](#rn-res-02--every-resident-lives-in-at-least-one-unit)).

- **Where:** `signUp` in [auth.service.ts](../server/src/auth/auth.service.ts)
- **Messages:** `This e-mail is already in use.` · `Enter a valid e-mail.` ·
  `Password must be at least 8 characters.`
- **Risk accepted:** sign-up is open and visitors are still global, so anyone who reaches the
  server can create an account and see every visitor. Acceptable only on a development network;
  before publishing, sign-up needs approval by an admin or an invite.

---

## Entity lifecycles

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Registered: POST /visitors
    Registered --> [*]: DELETE /visitors/:id
    note right of Registered
        No editing (RN-VIS-08)
        Past dates stay listed
    end note
```

Condominiums, units, users, memberships and residency have no state machine: they exist or they
do not. What is restricted is *deletion* (RN-CON-02, RN-UNI-03) and *cascade* (RN-USR-03,
RN-MEM-03).

---

## Common areas and reservations

### RN-RSV-01 · A place is closed by switching it off, never by deleting it — and it stays in sight

`is_available = false` makes a common area unbookable and keeps the row, its name and its
reservations. A condominium closes the party room for renovation and brings it back untouched. The
database refuses to delete a place that has reservations (`Restrict`), so switching off is the only
path that does not lose history.

A place that is switched off **stays in the catalogue**, drawn muted and with the word
"Unavailable" — never told apart by colour alone. A resident who touches it gets a pop-up saying it
is unavailable right now instead of the booking screen; the administrator gets the screen, because
that is where it is switched back on (RN-RSV-11). The empty state is left for a condominium with no
place registered at all.

Until the administrator's controls existed a switched-off place simply vanished, and a resident
found nothing where the pool had been the day before, with no word on why.

- **Where:** `listCommonAreas` in [commonArea.service.ts](../server/src/condominiums/commonArea.service.ts),
  [CommonAreaCard.tsx](../mobile/features/reservations/components/CommonAreaCard.tsx) and
  [ReservationsScreen.tsx](../mobile/features/reservations/ReservationsScreen.tsx)

### RN-RSV-02 · You only ever see the catalogue of a condominium you belong to

The endpoint checks the caller's membership before reading anything, and answers `404` for an unknown
condominium, a condominium the caller does not belong to, and an id that is not a uuid — all with the
same body, so the API never reveals which condominiums exist.

A person who belongs to more than one condominium chooses which one they are looking at; the choice
is remembered on the device and re-validated against their memberships on every open. It is a
convenience, never a permission: what they may see is decided by the server, every time.

- **Where:** `listCommonAreas` and `useCommonAreas` in
  [useCommonAreas.ts](../mobile/features/reservations/hooks/useCommonAreas.ts)

### RN-RSV-03 · A reservation is a time slot inside one day, and has no state

A reservation stores a date, a start and an end, as minutes after midnight. Four rules are enforced
by the database rather than by code: it ends after it starts, it never crosses midnight, it is never
zero-length, and it can only exist for a place in a condominium the person belongs to.

It carries **no status**. The row's existence is the booking, and cancelling deletes it. The
consequence, accepted deliberately: the system cannot say who booked a place and gave it up —
a cancelled booking leaves no trace at all (RN-RSV-08).

- **Where:** `reservations_minutes_check` in
  [the migration](../server/prisma/migrations/20261004161156_add_common_areas_and_reservations/migration.sql)

### RN-RSV-04 · A reservation is one of eight fixed slots, never a typed time

The day is divided into eight two-hour slots, the same for every place and every day: 07:00–09:00,
09:00–11:00, 11:00–13:00, 13:00–15:00, 15:00–17:00, 17:00–19:00, 19:00–21:00, 21:00–23:00. A
resident picks one; nobody types or drags a time, and nothing outside the grid can be stored.

The rule is in the **database**, not only in the request validator, so it also holds for the seed,
for a script and for a row inserted by hand. It is stated three times on purpose, and two of those
are not the same kind of statement: the two `slot.ts` modules decide what to **offer**, the CHECK
decides what may **exist**.

- **Where:** `reservations_slot_grid_check` in the migration,
  [server/src/condominiums/slot.ts](../server/src/condominiums/slot.ts) and
  [mobile/features/reservations/domain/slot.ts](../mobile/features/reservations/domain/slot.ts)

### RN-RSV-05 · Two people cannot hold the same slot, and the database is what decides

Exactly one of two simultaneous attempts at the same slot succeeds. The other is refused with a
`409` saying the time was just taken, and the list refreshes without it.

The guarantee is a **unique index** on `(common_area_id, date, start_minute)`, not a "is it free?"
read before the insert — two requests can both pass such a read and both write. This is the first
rule in the project where concurrency can produce a wrong answer, and the reasoning is recorded in
[ADR 0011](decisions/0011-no-double-booking-is-a-unique-index.md).

- **Where:** the unique index in the migration, and the `P2002` translation in
  [reservation.service.ts](../server/src/condominiums/reservation.service.ts)

### RN-RSV-06 · Bookings reach 60 days ahead, and the server is what enforces it

A resident may book from today up to 60 days ahead, counted in whole days, so a booking made at
23:00 reaches the same last day as one made at 07:00. The calendar does not offer a day outside the
window, and the API refuses one anyway — a screen that hides something is a courtesy, not a rule.

Unlike the grid, this one **cannot** live in the database: a CHECK may only call immutable
functions, and "today" is not one. It is the first rule in the project where that distinction
matters.

- **Where:** `validateNewReservation` in
  [reservation.dto.ts](../server/src/condominiums/reservation.dto.ts)

### RN-RSV-07 · Only what is free is offered, and only the server decides what that means

A slot held by somebody else is **absent** from the times offered — not greyed out, not labelled. A
slot of today whose start time has passed is absent too.

Under the times offered, the booking screen lists the **bookings of the day**: every time of that
place already reserved on the chosen day, by anyone, including one of today that has already
started. It shows the time and nothing else. Nothing anywhere says who holds a slot — not to the
administrator either. For a resident the list is information only; for the administrator each
reservation of another person in it is a button that cancels it (RN-RSV-13).

The server computes this, on its own clock, because its clock is the one that will accept or refuse
the booking. If the device decided, a wrong clock would offer a slot the server then refuses, and
the resident would read that as a broken app.

- **Where:** `listAvailability` in
  [reservation.service.ts](../server/src/condominiums/reservation.service.ts), and
  [DayBookings.tsx](../mobile/features/reservations/components/DayBookings.tsx)

### RN-RSV-08 · The person who booked and the administrator may cancel; nobody else

Cancelling releases the slot for everyone and **deletes** the record — there is no history, no
reason and nothing to consult afterwards, because the reservation carries no state (RN-RSV-03).
A slot whose time has already started cannot be cancelled: it frees nothing and would erase the
only record that the place was used.

A member who may not cancel that reservation is told so (`403`); somebody outside the condominium
gets the same `404` every other route gives. This is the second use of
[ADR 0010](decisions/0010-permission-rules-live-in-the-service.md), and the permission check comes
**before** the already-started check, so somebody who may not cancel does not learn whether the slot
has begun.

Unlike `DELETE /visitors/:id`, this route is **not idempotent**: deleting a reservation that is
already gone answers `404`. Telling a stranger "already deleted" would leak that the id existed.

- **Where:** `cancelReservation` in
  [reservation.service.ts](../server/src/condominiums/reservation.service.ts)

### RN-RSV-09 · Picking a time does not book it; a confirmation does

Touching a free time on the booking screen only **selects** it — one at a time, and touching it
again clears the choice. The booking is made by the button at the end of the screen, which stays
disabled until a time is selected and asks for confirmation naming the place, the day and the time
before anything is sent. Changing the day, or any reload of the month, clears the selection: the
chosen time has either just become a reservation or just been taken by somebody else.

A time the person already holds is not selectable. Touching it is still the way to cancel it
(RN-RSV-08), and it looks different from a free time for that reason. A time held by somebody else
is never among the times offered, for the administrator either (RN-RSV-13).

- **Where:** `selectSlot` and `book` in
  [useBooking.ts](../mobile/features/reservations/hooks/useBooking.ts), and
  [BookingScreen.tsx](../mobile/features/reservations/BookingScreen.tsx)

### RN-RSV-10 · "My bookings" lists only your own, and only what has not ended

Under the catalogue, a resident sees the reservations **they** made in the condominium on screen:
place, day and time, soonest first. A reservation leaves the list when its slot ends — not when it
starts — and one made for a place that was later switched off still appears, because the
commitment still exists (RN-RSV-01).

Each card carries a cancel button, which asks for confirmation and then follows RN-RSV-08 exactly
— it is the same `DELETE`, reached from a second place. A refusal is shown inside the confirmation
and the list is read again, since a refusal other than a network failure means the list was stale.

The administrator sees only their own here as well. The list answers "what did I book", so it
never needs to say a name. It is read again every time the screen regains focus, since the booking
itself happens one screen ahead; and it failing does not take the catalogue down with it.

- **Where:** `listOwnReservations` in
  [reservation.service.ts](../server/src/condominiums/reservation.service.ts), and
  [useOwnReservations.ts](../mobile/features/reservations/hooks/useOwnReservations.ts)

### RN-RSV-11 · Only the administrator switches a place, and an unavailable place takes no booking from anyone

The administrator of a condominium makes a place unavailable, and available again, with a switch at
the top of that place's booking screen. Nobody else sees the switch, and the API refuses the change
from anyone else: **403** for a member, the usual **404** for somebody outside the condominium. The
`403` is decided before the place is looked up
([ADR 0010](decisions/0010-permission-rules-live-in-the-service.md)).

Switching off **touches no reservation**. Existing bookings stay, stay in their owners' "My
bookings" (RN-RSV-10) and stay cancellable. What stops is new bookings — for everyone, the
administrator included: "unavailable" has one meaning, and the administrator's only difference is
being able to open the screen and switch the place back.

The switch asks for no confirmation: it destroys nothing and the same touch undoes it. It also never
moves before the server answers — it shows the saved state, so a failed change leaves it where it
was without anything having to put it back.

One race is accepted: a booking already on its way when the place is switched off may still land.
It shows under the bookings of the day and the administrator can cancel it; closing that window
would mean locking the place for every booking.

- **Where:** `setCommonAreaAvailability` in
  [commonArea.service.ts](../server/src/condominiums/commonArea.service.ts), `bookSlot` in
  [reservation.service.ts](../server/src/condominiums/reservation.service.ts), and
  [AdminSwitch.tsx](../mobile/features/reservations/components/AdminSwitch.tsx)

### RN-RSV-12 · The whole day is taken all at once or not at all

With a day chosen, the administrator has a second switch, above the times offered, that reserves
every time of that day that has not started. Turning it off cancels the administrator's own
reservations of that day that have not started. Both ask for confirmation.

If **another person** holds a time of that day that has not started, the action is refused and
nothing is reserved; the administrator cancels those reservations first (RN-RSV-13). There is never
a partial result — also when somebody books a time at the very moment the administrator confirms.

A day taken whole is **ordinary reservations** in the administrator's name. There is no "blocked
day" record, no reason stored, and the switch reads its position from who holds what: it is on when
the administrator holds every time of the day still ahead. Turning it off never touches another
person's reservation, nor a time that has already started.

What guarantees "all or nothing" is not a check: the times are written by a single statement, and
the unique index of [ADR 0011](decisions/0011-no-double-booking-is-a-unique-index.md) makes the
database discard all of it if any one time was taken meanwhile.

- **Where:** `takeWholeDay` and `releaseWholeDay` in
  [reservation.service.ts](../server/src/condominiums/reservation.service.ts)

### RN-RSV-13 · One reservation, one place to cancel it

A person cancels **their own** reservation from the times offered, where it shows as theirs. The
administrator cancels **another person's** from the bookings of the day, where it is a button — and
only there. The same reservation is never cancellable from two places on the screen.

The screen does not decide any of this by comparing people or roles. The server sends a reservation
id on exactly what the person looking may cancel, in the list they cancel it from, and the screen
draws a button where an id arrived. A resident's bookings of the day carry no id at all.

The permission itself did not change (RN-RSV-08): the person who booked and the administrator may
cancel, nobody else, and never a time that has started. Nobody is notified of a cancellation — the
app has no notifications — and no trace of it remains.

- **Where:** `listAvailability` in
  [reservation.service.ts](../server/src/condominiums/reservation.service.ts), and
  [DayBookings.tsx](../mobile/features/reservations/components/DayBookings.tsx)

### RN-RSV-14 · Only the síndico creates a place, and every field is required

The síndico of a condominium creates the places that can be booked, from the Reservations screen.
Three things are asked and **all three are required**: the **name** (up to 60 characters, unique in
the condominium), the **usage fee** in reais — zero means free, but the field must be filled in —
and a **photo**, taken or chosen on the device (JPEG, PNG or WebP, up to 5 MB; the recommended size
is 1200 × 675).

It is the first rule that belongs to the **síndico alone**: the administrator switches a place off
and on (RN-RSV-11) but does not create one, and gets a `403`. A resident does too
([ADR 0017](decisions/0017-the-sindico-returns-as-a-third-role.md)).

A place is created **available** and appears in the catalogue at once, in alphabetical order. Two
places of the same condominium cannot share a name; the refusal appears under the name field, and
the database is what decides it. A fee may be typed with a comma or a dot.

The photo is stored and served like the photo of a condominium (RN-CON-05), and no query selects
its bytes except the route that serves them. Nothing about a place can be changed afterwards except
its availability: no renaming, no new fee, no new photo, no deleting.

- **Where:** `createCommonArea` in
  [commonArea.service.ts](../server/src/condominiums/commonArea.service.ts);
  `validateNewCommonArea` in [commonArea.dto.ts](../server/src/condominiums/commonArea.dto.ts) and
  in [newCommonArea.ts](../mobile/features/reservations/domain/newCommonArea.ts) — mirrored, change
  both together; [CommonAreaFormModal.tsx](../mobile/features/reservations/components/CommonAreaFormModal.tsx)

## Newsletter

### RN-NWS-01 · The board is read by everyone in the condominium

Every member sees the same notices, whatever their role, and nobody sees the notices of a
condominium they do not belong to. Newest first, with the id breaking ties so the order is stable
between visits.

The list carries the full text of every notice; the two-line preview is a rendering limit, not a
transport one, which is why opening a notice costs no request.

- **Where:** `listNotices` in [notice.service.ts](../server/src/condominiums/notice.service.ts)

### RN-NWS-02 · Only the administrator publishes, and the API is what enforces it

A notice may be published only by the `admin` of that condominium. The app hides the action from
everyone else, and that is a courtesy: the rule is enforced where the request arrives, so a resident
who reaches the operation by other means is still refused.

The refusal differs by membership on purpose. A member who is not the administrator gets **403** —
she reads this board daily, and pretending the condominium does not exist would be a lie. Someone
who is not a member at all gets the same **404** the read route gives, so existence stays hidden
from outsiders ([ADR 0010](decisions/0010-permission-rules-live-in-the-service.md)).

Each notice shows **who published it**, in the list and on its own screen. Since only the
administrator publishes, that reads "Published by Administrator" (RN-MEM-04) — and it turns into
the person's own name if they stop being the administrator. Until 2026-10-06 the publisher was
recorded and never shown.

- **Where:** `publishNotice` in [notice.service.ts](../server/src/condominiums/notice.service.ts)

### RN-NWS-03 · Paragraph breaks survive, and the body is the one text that is not trimmed

A notice body keeps its line breaks from the form through to the detail screen, because a wall of
run-together text is not an acceptable rendering of an announcement. That is why the body is the
only text column in the project not required to equal its trimmed form — trimming would eat the
blank line between two paragraphs. It still cannot be only whitespace, and it cannot exceed 5000
characters.

The list flattens those breaks for the preview only, so the two lines are two lines of content
rather than one line and an ellipsis.

- **Where:** `notices_body_check` in the migration, and `previewOf` in
  [notice.ts](../mobile/features/newsletter/domain/notice.ts)

## Account and appearance

### RN-ACC-01 · Every change to your own account asks for the current password again

Changing the e-mail, changing the password and deleting the account each require the current
password. A session alone is not enough — an unlocked phone in the wrong hands must not be able to
take an account over. Whose account it is comes from the session; no request names an account.

A wrong password is refused with a message under the field, and it counts toward the same lockout
that protects signing in: five wrong passwords in fifteen minutes, wherever they were typed, block
further attempts for fifteen minutes.

- **Where:** `verifyCurrentPassword` in [auth.service.ts](../server/src/auth/auth.service.ts);
  [ADR 0015](decisions/0015-changing-the-account-asks-for-the-password-again.md)

### RN-ACC-02 · An e-mail belongs to one account, and changing it takes effect at once

The new address passes the same rules as at sign-up and is compared ignoring case and surrounding
spaces. One that belongs to another account is refused, without saying why. Changing to the address
you already have is refused too. There is no confirmation message — the system sends no e-mail — and
the person stays signed in everywhere.

- **Where:** `changeEmail` in [auth.service.ts](../server/src/auth/auth.service.ts) and the unique
  index on `users.email`

### RN-ACC-03 · Changing the password signs out every other device

The new password must be at least 8 characters and differ from the current one. Afterwards the
device that made the change stays signed in and every other device is signed out — within 15
minutes, the time the short-lived access they already hold takes to expire.

- **Where:** `changePassword` in [auth.service.ts](../server/src/auth/auth.service.ts)

### RN-ACC-04 · Deleting an account is permanent, and removes what belonged to the person

After a warning, the current password and an explicit confirmation, the account is deleted at once
and for good: its sessions on every device, its memberships, the visitors it authorized and the
reservations it made, whose slots become free. Signing in afterwards fails exactly as for an account
that never existed, and the address can be used for a new, unrelated account.

- **Where:** `deleteAccount` in [auth.service.ts](../server/src/auth/auth.service.ts) and the
  cascading foreign keys

### RN-ACC-05 · An administrator's account cannot be deleted

Notices and found items belong to the condominium and record who published them. So the account of
someone who administers a condominium cannot be deleted — and neither can the account of a former
administrator while such records still point at them. The app says so before asking for a password;
the system refuses regardless.

There is no way yet to hand a condominium to another administrator, so in practice an administrator
cannot close their account through the app. Known and accepted.

- **Where:** `deleteAccount` in [auth.service.ts](../server/src/auth/auth.service.ts);
  `useDeleteAccount` in [useAccountForms.ts](../mobile/features/settings/hooks/useAccountForms.ts)

### RN-APP-01 · The appearance is chosen per device and survives signing out

A person chooses a light or a dark appearance in Settings and the whole app changes at once. The
choice belongs to the device, not to the account: it applies to the sign-in screen and is kept when
someone signs out. Until a choice is made the app follows the device's own setting.

- **Where:** [useAppearance.tsx](../mobile/features/settings/hooks/useAppearance.tsx);
  [ADR 0014](decisions/0014-colours-come-from-context-and-styles-are-made-from-the-palette.md)

### RN-APP-02 · Signing out asks first

Signing out lives in the bottom bar, beside Home, and asks for confirmation. Settings took its old
place at the top of the home screen.

- **Where:** [app/(tabs)/_layout.tsx](../mobile/app/%28tabs%29/_layout.tsx)

## Choosing a condominium

### RN-CHO-01 · Someone with more than one condominium chooses one at sign-in, before anything else

After signing in, a person who belongs to two or more condominiums is shown a chooser before the
home screen. Until they pick, the home screen and every module are unreachable — by navigation and
by direct link alike. A person with exactly one condominium never sees the chooser and goes straight
in; a person with none goes to the home screen as before.

- **Where:** `condominiumGate` in [useAuth.tsx](../mobile/features/auth/hooks/useAuth.tsx), obeyed
  by [app/_layout.tsx](../mobile/app/_layout.tsx)

### RN-CHO-02 · The choice lasts as long as the session

Reopening the app while still signed in returns to the condominium the person was in. Signing out
forgets it, and so does signing in — so the next sign-in on that device, by anyone, starts from
RN-CHO-01. A remembered condominium the person no longer belongs to is discarded.

- **Where:** `applySession`, `endSession` and the selection effect in
  [useAuth.tsx](../mobile/features/auth/hooks/useAuth.tsx)

### RN-CHO-03 · A card shows the role only when it is not resident, and the unit only when there is one

Each condominium is a card with its photo, its name and the unit or units where the person lives
there. The role appears **only when it is not resident** — today, "Administrator". A resident's
card carries no role label of any kind, and a membership without a unit carries no unit line: both
are absent, not empty.

- **Where:** `roleLabel` and `unitsLine` in
  [membership.ts](../mobile/features/condominiums/domain/membership.ts)

### RN-CHO-04 · One choice for the whole app, switched only from the home screen

The home screen and every module show the chosen condominium: the banner is its photo and name, the
header shows the units there, and the modules offered follow the role there. A person with two or
more condominiums can reopen the chooser from the home screen; nobody else is offered it. No module
has a control of its own to change condominium.

- **Where:** `currentMembership` in [useAuth.tsx](../mobile/features/auth/hooks/useAuth.tsx),
  [HomeScreen.tsx](../mobile/features/home/HomeScreen.tsx)

### RN-CHO-05 · The choice is a convenience and never a permission

Which condominium the app has selected decides what it asks for, not what it is allowed to get.
Every request names its condominium and is refused unless the caller belongs to it, whatever the
device holds ([ADR 0013](decisions/0013-the-current-condominium-is-chosen-once-and-is-never-a-permission.md)).

- **Where:** the membership check at the top of every service under
  [server/src/condominiums/](../server/src/condominiums)

## Lost & found

### RN-LAF-01 · The shelf is read by everyone in the condominium

Every member sees what was found in their condominium, whatever their role, and nobody sees the
items of a condominium they do not belong to. Newest first, with the id breaking ties. Each item
shows its photo, what it is, where it was found in smaller text, when it was posted and its status.

Tapping an item opens its photo alone and uncropped, for anyone who can see the shelf. Tapping
again, anywhere, closes it.

- **Where:** `listFoundItems` in
  [foundItem.service.ts](../server/src/condominiums/foundItem.service.ts);
  [FoundItemPhotoModal.tsx](../mobile/features/lostAndFound/components/FoundItemPhotoModal.tsx)

### RN-LAF-02 · Only the administrator posts, and the API is what enforces it

An item may be posted only by the `admin` of that condominium. The app hides the action from
everyone else, and that is a courtesy. A member who is not the administrator gets **403**; someone
who is not a member gets the **404** the read route gives
([ADR 0010](decisions/0010-permission-rules-live-in-the-service.md)).

Who posted is recorded and never shown.

- **Where:** `postFoundItem` in
  [foundItem.service.ts](../server/src/condominiums/foundItem.service.ts)

### RN-LAF-03 · An item is found or returned, and only the administrator says which

A new item starts as **found**. The administrator may mark it **returned**, and back to found, any
number of times — the way back exists for the wrong item or the wrong person. No third status
exists, and the database enum is what guarantees it.

A returned item **stays on the shelf**, marked. Changing the status changes nothing else: the route
accepts that one field, so the description, the place, the posting moment and the photo have no way
to move.

The refusals follow RN-LAF-02, and the `403` is decided before the item is looked up, so a member
who may not change anything learns nothing about whether an id exists.

- **Where:** `changeFoundItemStatus` in
  [foundItem.service.ts](../server/src/condominiums/foundItem.service.ts), and
  `validateStatusChange` in [foundItem.dto.ts](../server/src/condominiums/foundItem.dto.ts)

### RN-LAF-04 · Every item has a photo, taken or chosen on the device, and the server decides what it is

An item cannot be posted without a photo. It must be a JPEG, PNG or WebP of at most 5 MB. The type
is detected by the server from the file's first bytes; nothing the client says about it is read.

The description (up to 200 characters) and the place (up to 120) are required and stored trimmed.

These rules are enforced three times on purpose: in the app for the person typing, in the API for a
client that is not the app, and in the database for a writer that is not the API.

- **Where:** `validateNewFoundItem` in
  [foundItem.dto.ts](../server/src/condominiums/foundItem.dto.ts) and in
  [foundItem.ts](../mobile/features/lostAndFound/domain/foundItem.ts); the four CHECKs in the
  migration

### RN-LAF-05 · A photo is visible only to someone the item was shown to

The photo is not public and is not behind the session either: each item in the list carries a path
signed for that one photo and valid for one hour
([ADR 0012](decisions/0012-files-live-in-the-database-and-are-served-by-signed-paths.md)). A wrong,
expired or missing signature gets the same `404` as a photo that does not exist.

Someone removed from the condominium can still open a photo for up to an hour if they kept the
path. They had already seen it; this is accepted.

- **Where:** [signedPath.ts](../server/src/lib/signedPath.ts) and
  [foundItemPhoto.controller.ts](../server/src/condominiums/foundItemPhoto.controller.ts)

### RN-LAF-06 · The posting moment is the server's, and it is read in local time

When an item was posted is recorded by the database at the moment of posting and cannot be chosen
or edited. It is the one date in the system that is an **instant** rather than a calendar day, so
it is shown in the reader's local time, with the time of day.

- **Where:** the `posted_at` default in the migration, and `toDisplayDateTime` in
  [calendar.ts](../mobile/shared/lib/calendar.ts)

## Inconsistencies and gaps found

- **~~Visitors are not attached to a condominium or a unit~~ — closed on 2026-10-02.** A visit now
  carries `unit_id`, `condominium_id` and `authorized_by_id`, held together by two composite foreign
  keys ([ADR 0009](decisions/0009-visitors-belong-to-a-unit-and-a-membership.md)). Whoever authorizes
  needs a membership in the condominium, not a residence in the unit, so an admin can
  authorize too. The single row that existed was deleted, as the author authorized.

  **Since 2026-10-05 the visitors screen filters by the condominium the person is in**, and its form
  offers only the units there (RN-CHO-04). That is a filter on the screen and protects nothing: the
  route below is unchanged.

  **Closed on 2026-10-06:** `GET /visitors` returned every condominium's visitors and
  `DELETE /visitors/:id` deleted anyone's. The first now answers by role and the second only for
  whoever authorized the visit (RN-VIS-11). The filter on the screen stays, for a different reason: the route answers for all of
  a person's condominiums at once.

  What is still open: a **resident** may register a visitor for any unit of their condominium, not
  only one they live in — the API asks for a membership, not a residence (ADR 0009). The app only
  offers their own units, so it takes a client that is not the app.
- **The app's visitor form has not caught up.** `POST /visitors` now requires `unitId` and rejects the
  old free-text `authorizedBy`, so creating a visitor from the app fails until
  [VisitorFormModal](../mobile/features/visitors/components/VisitorFormModal.tsx) sends a unit, and
  reading one fails until the guards in
  [visitor.ts](../mobile/features/visitors/domain/visitor.ts) expect the new `unit` and
  `authorizedBy` objects.
- **The app and the server disagree about `VisitType`.** The app still spells two of the three values
  in Portuguese — `"entrega"` and `"prestador"` ([visitor.ts](../mobile/features/visitors/domain/visitor.ts)) —
  while the database and the API use `delivery` and `service_provider`. The English rename
  ([ADR 0008](decisions/0008-english-everywhere.md)) missed them. Neither typecheck catches it,
  because the two sides are independent type universes. Creating a delivery from the app is rejected
  with `400`, and a single delivery row in the database makes the app's whole list fail its guard.
  The label maps in
  [VisitorCard](../mobile/features/visitors/components/VisitorCard.tsx) and `VisitorFormModal` are
  keyed by the stale values too. **The seed now creates such rows**, so this is no longer latent.
- **The same validation lives in two files by design.** The rules in
  [visitor.ts](../mobile/features/visitors/domain/visitor.ts) (app) and
  [visitor.dto.ts](../server/src/visitors/visitor.dto.ts) (server) must be changed together,
  including the message text — the app shows the server's message under the right field. The
  server file carries a comment pointing at the app file.

  The same arrangement now holds for the **slot grid**:
  [slot.ts](../mobile/features/reservations/domain/slot.ts) (app) and
  [slot.ts](../server/src/condominiums/slot.ts) (server) declare the same eight start minutes, and
  each points at the other. Unlike the validation pair, a third copy exists in
  `reservations_slot_grid_check` — and that one is not the same kind of statement: the modules
  decide what to offer, the CHECK decides what may exist.
- **One server-side rule is unreachable from the interface.** The name field has
  `maxLength={60}`, so the app cannot produce the "at most 60 characters" rejection from the
  server; only a direct API call can.
- **`visitors.updated_at` is never meaningful.** Visitors cannot be edited (RN-VIS-08), so the
  column only ever equals `created_at`.
- **One route refuses by role; every other one does not.** Publishing a notice is checked against
  the caller's role (RN-NWS-02), and that is the only such check in the API. Everywhere else, any
  authenticated account may call any route — an `admin` reaching `/visitors` directly is still
  served, and the home screen hiding that module from them is presentation only. Hiding a module is
  not a permission (see [risks](architecture.md#risks-and-technical-debt)).
- **Validation is duplicated for accounts too**, between
  [sessao.ts](../mobile/features/auth/domain/session.ts) and
  [auth.dto.ts](../server/src/auth/auth.dto.ts), with the same message text.
