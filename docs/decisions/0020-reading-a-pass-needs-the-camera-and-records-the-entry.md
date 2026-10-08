# 0020 · Reading a pass needs the camera, answers in four values of one field, and records the entry once

**Status:** Accepted · **Date:** 2026-10

## Context

Since feature 012 every visit has a pass with a QR code, and
[ADR 0016](0016-the-visitor-pass-is-a-picture-made-on-the-device.md) said plainly that nobody read
it: at the gate a pass was checked by eye. Feature 015 gives the doorman the gate — and a module
that reads a pass and says whether it is good today.

Three questions came with it. How does an app that could only *draw* a QR code come to *read* one?
What shape does "is this pass valid?" take over HTTP, when most answers are some kind of "no"? And
the product owner asked for the visitor's entry to be recorded — where, and how, when two doormen
can read the same pass at once?

## Decision

**The pass does not change.** Its code already identifies one visit, and the server knows that
visit's day. The reader is the inverse of the function that writes the QR text — `passCodeOf`
beside `passQrValue`, in the one file that knows the prefix. Every pass already shared reads like a
new one.

**The app reads with `expo-camera`**, installed with `npx expo install` at the SDK's version. It is
imported by **two files, both in `features/passCheck/`**:

- `components/PassScanner.tsx` — the camera view, QR codes only;
- `services/cameraPermission.ts` — asking the device, which is I/O and so not a component's job.

**A text that is not a Condfy pass never leaves the device.** The app answers "not recognised"
itself; the text is not sent, opened or shown.

**A check is `POST /condominiums/:id/pass-checks`, and every outcome is a `200`.** Valid, not valid
yet, expired and not recognised are four values of `outcome`. Error statuses mean "you may not
ask" — which is what lets the app keep "could not be checked" apart from all four.

**Not recognised is one branch**, with no other field: an unknown code, a removed visit, a visit to
another condominium and a code that is not a UUID. The last is checked before the query, because
`pass_code` is a `uuid` column and Postgres raises an error for anything else.

**Only a doorman checks a pass** — the one rule that names that role. The síndico and the
administrator are refused, by decision of the product owner.

**The entry is one nullable instant on the visit, `entered_at`**, written by the first check
answered Valid and never again — through an `UPDATE` conditional on the column still being `NULL`.
Its row count is also the answer to "was this check the first?".

## Alternatives considered

| Option | Why not |
|---|---|
| Change what the QR carries — a signed payload with the date, checkable offline | Invalidates every pass already shared, puts a date in a picture that gets forwarded, and "today" would be the phone's. The code plus a lookup needs none of it |
| Photograph the pass with `expo-image-picker` and decode the picture | Nothing installed decodes; and it is a photo, a tap and an upload per visitor |
| `expo-barcode-scanner` | Removed from the SDK in favour of `expo-camera` |
| `410` for expired, `404` for not recognised | The app's HTTP layer would treat an ordinary answer as a failure, and "expired" would look like "could not be checked" |
| Tell a pass of another condominium apart from an unknown code | Tells whoever is scanning that the code exists somewhere |
| A `pass_checks` table with every reading | The owner asked to know who came in, not to audit readings. One fact per visit is one column |
| Read `entered_at`, and write it if empty | Two doormen at once would both read "empty", both write, and both be told they were first |
| The doorman confirms the entry with a second touch | Offered to the owner, who chose automatic recording: the gate has to be quick |

## Consequences

- **A new dependency**, the first since ADR 0016, and a second "who may import this" rule that the
  typecheck does not enforce. It is in `CLAUDE.md`.
- **It brings one transitive package, `barcode-detector`**, which `expo-camera` loads in a browser
  that has no native `BarcodeDetector`. Read from the installed package's source: on the web,
  `CameraView` scans through the browser's detector when there is one and through that polyfill
  otherwise. **This was read, not run** — whether it works in the browsers the project cares about
  is for the owner's test. If it does not, the module's "no usable camera" state is the web's
  answer, and the gate works from the list.
- **The camera's reason on iOS is one sentence for the whole app.** `expo-image-picker` and
  `expo-camera` both set it in `app.json`; they carry the same text, covering photos and passes.
  The microphone permission that `expo-camera` would add is switched off: nothing records.
- **The camera reports a code many times a second.** `usePassCheck` ignores every reading but the
  first with a ref — state changes one render too late — and numbers each check so an answer never
  lands on a later pass.
- **An entry cannot be undone.** A pass checked and then turned away still shows as entered. That
  is the cost of recording automatically, accepted by the owner.
- **`enteredAt` is the second instant in a contract of calendar days**, with a found item's
  `postedAt`. A visit now has one of each kind, and they are not read by the same function.
- **The label on the pass itself is still decided on the device.** ADR 0016 expected the server to
  take that over when a reader existed. It has, where it matters — at the gate; the label a
  resident sees on their own pass decides nothing and was left as it is.
- **A condominium with no doorman has no reader.**

**Evidence:** [passCheck.service.ts](../../server/src/condominiums/passCheck.service.ts),
[passCheck.dto.ts](../../server/src/condominiums/passCheck.dto.ts),
[usePassCheck.ts](../../mobile/features/passCheck/hooks/usePassCheck.ts),
[PassScanner.tsx](../../mobile/features/passCheck/components/PassScanner.tsx),
[cameraPermission.ts](../../mobile/features/passCheck/services/cameraPermission.ts),
[visitor.ts](../../mobile/features/visitors/domain/visitor.ts) (`passCodeOf`),
migration `20261007140001_add_visitor_entered_at`
