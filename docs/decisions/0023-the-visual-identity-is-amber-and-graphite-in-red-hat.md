# 0023 · The visual identity is amber and graphite in Red Hat, and a text style picks a family instead of a weight

**Status:** Accepted · **Date:** 2026-10

## Context

The app had colours but no identity. Its palette was an amber accent on neutral greys, chosen one
token at a time; its type was whatever the device supplied; and it had no logo — the visitor pass
drew a stock building icon, and `app.json` named icon and splash files that did not exist.

One colour was also wrong on its own terms: `textSecondary` in the light palette, `#B7B7B7` on
`#F7F7F7`, has a contrast of about 1.9:1, far under the 4.5:1 that text needs.

The product owner asked for an identity that reads as premium and discreet, and chose it from
directions shown side by side: the amber kept, on graphite and warm neutrals, set in Red Hat, with
the rounded shapes the app already has.

## Decision

**The palette is amber `#F2A93B` and graphite `#1D1B18` on warm neutrals.** Same keys, new values,
in both palettes. Every text-and-background pair was checked against 4.5:1.

**`accentText` is a new token.** Amber on a light background cannot be read, so the accent used as
text or as an icon is a dark amber in the light palette and the accent itself in the dark one.

**The type is Red Hat Display for titles and Red Hat Text for everything else**, loaded from
`@expo-google-fonts`, one import per weight. `shared/theme/fonts.ts` is the only file that imports
the two packages; it exports the names (`fonts`) and the files (`fontFiles`).

**A text style chooses its weight with `fontFamily: fonts.…`, and declares no `fontWeight`.** Each
font file holds one weight. Bold of 16 and above is `fonts.display`; smaller bold is `fonts.bold`.

**The root layout holds the splash screen until the fonts load**, and lets the app open in the
system font if they fail.

**The symbol is a portal** — two arches, one inside the other. `mobile/scripts/make-icons.js` draws
it from geometry and writes the six files `app.json` names; `CondfySymbol`, in `shared/components`,
draws the same shape with views at whatever size it is given. The pass and the sign-in screen use it.

**Font sizes and corners are roles, in `shared/theme/scale.ts`.** Thirteen loose font sizes became
six (`fontSizes`: display 28, title 20, heading 17, body 15, label 13, caption 11) and ten loose
radii became four (`radius`: card 22, control 14, tag, sheet 28). Each old value went to the nearest
role.

**Layouts are unchanged.** The identity changes colour, type, sizes of text, corners and the mark.
No screen was rearranged and no component was removed.

## Alternatives considered

| Option | Why not |
|---|---|
| A deep green as the brand colour, the owner's first sketch | Shown and set aside by the owner in favour of keeping the amber the app is already known by |
| Keep `fontWeight` and set one family | A loaded family has one weight per file. Android then fakes the bold or ignores it, and the two platforms disagree |
| Import the fonts from each package's index | The index requires every weight and every italic, and all of them are bundled |
| A shared `<AppText>` that sets the family | 261 `<Text>` across 66 files would change component, and a `TextInput` would still need its own. A style key is the unit the app already styles by |
| Leave sizes and corners as loose numbers | The first pass did, to keep every screen still. The owner saw the type change alone and asked for the components to follow |
| A spacing scale applied to every padding and gap | Paddings are where a layout lives; snapping them moves things. The scale stays in the identity document until a screen is redrawn |
| `react-native-svg` for the symbol | A dependency to draw two arches. Views draw them, and the pass is captured from views already |
| An image library to produce the icons | Six PNGs of two shapes. Node's `zlib` writes them |
| Use amber for links on light backgrounds | 2:1 against the screen background |

## Consequences

- **Text with no `fontFamily` is drawn in the system font, and nothing catches it** — the same blind
  spot as text with no colour ([0014](0014-colours-come-from-context-and-styles-are-made-from-the-palette.md)).
  A new text style must name a family.
- **`fontWeight` in a style is now a defect**, not a preference.
- **The first frame waits for five font files.** They are bundled, so the wait is a read from disk.
- **Most text grew by one point** — 12 became 13, 14 became 15, 16 became 17 — and the module cards
  went from a radius of 35 to 22. Where a line was already tight it may now wrap; the module name
  on the home screen shrinks to fit instead.
- **A circle's radius and the symbol's are not roles.** `999`, half a side and the numbers in
  `CondfySymbol` stay literal.
- **Spacing is not tokenised.** Paddings and gaps are still numbers.
- **The symbol exists in two places** — the script and `CondfySymbol` — on the same 64-unit grid.
  Changing one without the other makes the pass disagree with the app icon.
- **`mobile/assets/images/` now holds generated files.** They are committed, because Expo reads them
  at build time, and regenerated by the script rather than edited.
- **A changed colour must have its pairs checked again**; the palette file says so.

**Evidence:** [Colors.ts](../../mobile/shared/constants/Colors.ts),
[fonts.ts](../../mobile/shared/theme/fonts.ts),
[scale.ts](../../mobile/shared/theme/scale.ts),
[app/_layout.tsx](../../mobile/app/_layout.tsx),
[CondfySymbol.tsx](../../mobile/shared/components/CondfySymbol.tsx),
[make-icons.js](../../mobile/scripts/make-icons.js),
[app.json](../../mobile/app.json)
