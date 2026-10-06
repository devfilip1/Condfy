# 0012 · Files live in the database and are served by signed paths

**Status:** Accepted · **Date:** 2026-10

## Context

Lost & Found is the first feature that keeps a **file**: the photo of each found item, taken or
chosen on the administrator's device. Until now the only pictures in the system were the fixed
`https` addresses of the common areas, hosted somewhere else and merely pointed at.

Three questions arrive together, and whatever answers them will be copied by the next feature that
needs a file:

1. **Where do the bytes live?**
2. **How do they get to the server?**
3. **Who may fetch them, and how is that checked?**

The third is harder than it looks. The rule is simple — whoever may see the item may see its photo —
and the obvious implementation is to put the photo behind the same bearer token as every other
route. That works on a phone and **fails on the web**: there an image is an `<img>` tag, and an
`<img>` tag cannot send an `Authorization` header. The app runs on three platforms.

## Decision

**The photo is a column of the item's own row**: `found_items.photo`, `BYTEA NOT NULL`, with the
media type beside it.

**It travels as base64 inside the same JSON body** as the item's text. The posting route alone
raises its body limit to 8 MB.

**It is served through a signed path**, outside the session-protected routes. Each item in the list
carries a `photoPath` with an expiry and an HMAC over the path and that expiry, valid for one hour:

```text
/condominiums/:condominiumId/found-items/:itemId/photo?expires=<unix>&signature=<hex>
```

The key is derived from the `JWT_SECRET` the server already requires. A wrong, expired or missing
signature answers `404`, the same as a photo that does not exist.

**The server decides what the file is.** The media type that is stored and later served is detected
from the first bytes (JPEG, PNG or WebP); the request has no field for it. The response carries
`X-Content-Type-Options: nosniff`.

## Why this works, and why it is small

**In the row**, the database states the rules itself, as [ADR 0004](0004-integrity-rules-in-the-database.md)
asks: `NOT NULL` means an item without a photo cannot exist, and one `INSERT` means there is never
a row without its file or a file without its row. Nothing new has to be run, configured or backed
up — no folder, no bucket, no credential, no environment variable.

**In the JSON**, there is no new server dependency, the app's one HTTP client sends it unchanged,
and it behaves identically on Android, iOS and web. One body also means one validation pass that
names every field at fault, photo included.

**By signed path**, the photo is fetched by a plain image element everywhere. The signature is only
ever produced inside the list, and the list only answers a member — so "holds a valid signature"
means "was shown this item within the last hour". Because the **path** is what is signed, a
signature for one item is useless on another's id.

## Alternatives considered

- **A folder on the server's disk.** A second store beside the database: its own backup, a path to
  configure, files orphaned when the insert fails after the write and rows pointing at nothing when
  it fails before.
- **Object storage.** The right answer at a scale this project does not have. An SDK, credentials
  and a service to run locally, for a project with no deployment.
- **`multipart/form-data`.** The textbook upload. It adds a parser on the server, and in the app
  `FormData` wants `{ uri, name, type }` on native and a `Blob` on web — a platform split inside the
  one HTTP client.
- **A bearer token on the photo route.** Fails on web, as above.
- **The access token in the query string.** Puts a credential that opens the whole account into
  URLs, which the server logs. The photo signature opens one photo for one hour.
- **A public photo route.** Item ids are random, but that is obscurity, and the rule is a rule.
- **Trusting a media type sent by the client.** A claim, where the first bytes are a fact.

## Consequences

- **The list query must never select `photo`.** Nothing breaks if it does — it only drags megabytes
  out of the database on every load, which is exactly why it has to be written down. Every query in
  the service names its columns, and one function alone reads the bytes.
- **The photo route is deliberately outside the session group.** It looks like a hole next to routes
  that all require a session. It is not: its permission is the signature. Moving it inside "to be
  safe" breaks the web silently.
- **Someone removed from a condominium can still fetch a photo for up to an hour**, if they kept
  the path. They had already seen it. Accepted.
- **The path is different on every list load.** The app must not store or compare it, and uses the
  item's id as the image cache key — a found item's photo never changes.
- **A photo costs 33% more on the wire and is held whole in memory** on both ends. At 5 MB, a few
  times a month, that is not worth a dependency.
- **`photoPath` is relative.** The server does not know the address the device reaches it by; the
  app joins it to `EXPO_PUBLIC_API_URL`.
- **Signed paths appear in the request log**, signature included. They carry no personal data and
  expire in an hour.
- The size limit and the accepted types exist in three places: the app's domain file, the server's
  DTO and two CHECKs. The first two are the deliberate duplication CLAUDE.md records; the CHECKs
  constrain what may **exist**, whoever writes it.

## Revisit when

Photos stop being small and few — video, several per item — or there is a real deployment with a
CDN in front. Either is the moment for object storage, and the signed path already has the right
shape to point somewhere else.

**Evidence:** [schema.prisma](../../server/prisma/schema.prisma),
[the migration](../../server/prisma/migrations/),
[signedPath.ts](../../server/src/lib/signedPath.ts),
[imageType.ts](../../server/src/lib/imageType.ts),
[foundItem.service.ts](../../server/src/condominiums/foundItem.service.ts),
[foundItemPhoto.controller.ts](../../server/src/condominiums/foundItemPhoto.controller.ts)
