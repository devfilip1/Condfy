# 0014 · Colours come from context, and styles are made from the palette

**Status:** Accepted · **Date:** 2026-10

## Context

The constitution has required from its first version that every component be legible in light and
dark, and `app.json` has declared `userInterfaceStyle: automatic`. Neither was honoured. There was
one palette, `Colors`, whose header said it was fixed on purpose, and 38 files read it like this:

```ts
const styles = StyleSheet.create({ card: { backgroundColor: Colors.cardBackground } });
```

That line runs **once, when the module loads**. The value is captured there and never changes, so
nothing higher up — no state, no context, no remount — can re-colour the screen afterwards. A
person choosing a dark appearance in Settings (feature 010) needed the styles themselves to be
produced from whichever palette is in use.

## Decision

**Two palettes with the same keys.** `shared/constants/Colors.ts` exports `LightColors`,
`DarkColors` and the type `Palette`. The single `Colors` export **no longer exists**.

**A theme layer in `shared/theme/`**: `ThemeProvider` (takes the scheme by prop), `useTheme()`, and
`makeStyles`.

**One way for a component to style itself:**

```ts
const useStyles = makeStyles((colors) =>
  StyleSheet.create({ card: { backgroundColor: colors.cardBackground } })
);

export default function Card() {
  const styles = useStyles();
  const { colors } = useTheme();   // only for a colour outside a style: icons, indicators
}
```

`makeStyles` runs the factory once per palette and keeps the result, so a component has at most two
stylesheets in its life, not one per render.

**The scheme is decided elsewhere.** `features/settings` reads what the person chose on this device
and, failing that, what the device is set to, and hands the result to `ThemeProvider`.
`shared/theme/` does no I/O.

## Why the `Colors` export was removed rather than kept as "the light one"

With it gone, a file that was not converted **does not compile**. The requirement is that no element
is left in the other appearance's colours; one compile error per forgotten file is a better
guarantee than a careful review, and it keeps holding for every file written from now on.

Restoring it as an alias to quiet the typecheck would remove the only automatic check this decision
has.

## Why `shared/theme/` is a folder of its own

The constitution lists three folders under `shared/`: `components`, `lib`, `constants`. A context
with a hook is none of them — not a presentational component that takes props, not a pure function
without React, not a token.

It still has to be in `shared/`: shared components need the palette, and `shared/` may not import a
feature. Filing it under one of the three would be a lie about what that folder holds; putting it
in a feature would reverse the dependency direction the folder list exists to protect. The
constitution was amended (4.1.0) to list `shared/theme/`, with the condition that it holds no I/O.

## Alternatives considered

- **Remount the whole tree when the appearance changes.** Module-level stylesheets still hold the
  old values.
- **CSS variables.** Web only; the app runs on three platforms.
- **A styling library.** A dependency and a rewrite of every style, for a switch between two
  palettes.
- **Inline `style={{ color: colors.x }}`.** Works, and scatters colour decisions through the JSX
  while losing the stylesheet per component.
- **Storing the preference per account, on the server.** Then the sign-in screen could not have it
  and two devices could not differ.

## Consequences

- **The typecheck is necessary and not sufficient.** It catches a file that still imports `Colors`.
  It cannot see a `<Text>` that never had a colour — black by default, invisible on dark — or a hex
  typed straight into a style. Converting the app found both: the title of every module header had
  no colour, and the home module cards carried three hard-coded greys.
- **Every `<Text>` and every icon gets a colour from the palette.** No exceptions for "it is black
  anyway".
- **No colour literal outside `Colors.ts`**, except shadows and `"transparent"`.
- **Text on a coloured or photographic background has its own tokens** — `textOnAccent`,
  `textOnStrong`, `textOnOverlay` — because "the card colour" stops being a synonym for white the
  moment there is a second palette.
- **The navigator has colour too.** The screen background, the tab bar and the status bar are set
  in the two layouts; a screen that does not paint its own background would otherwise be white
  under light text.
- **The appearance belongs to the device.** It is kept across sign-outs and applies before signing
  in — the opposite of the current condominium, which is forgotten at every sign-out
  ([ADR 0013](0013-the-current-condominium-is-chosen-once-and-is-never-a-permission.md)).
- **A style used outside a component cannot exist.** A helper that needs `styles` becomes a
  component, or receives them.

**Evidence:** [Colors.ts](../../mobile/shared/constants/Colors.ts),
[shared/theme](../../mobile/shared/theme/index.tsx),
[useAppearance.tsx](../../mobile/features/settings/hooks/useAppearance.tsx),
[app/_layout.tsx](../../mobile/app/_layout.tsx)
