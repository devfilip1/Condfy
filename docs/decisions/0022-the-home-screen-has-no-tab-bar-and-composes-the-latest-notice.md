# 0022 · The home screen has no tab bar, draws modules by kind, and composes the latest notice from the newsletter feature

**Status:** Accepted · **Date:** 2026-10

## Context

The home screen grew one feature at a time. It began as four modules in a grid under a floating
bar; each feature since added a card to the grid, and the bar ended up with one destination, Home,
and one action, Sign out — whose "screen" was a file that rendered nothing, kept so that a tab
would exist.

By feature 016 a síndico's grid held six cards of equal weight, two of them occasional
administration, and the bar switched between nothing.

The product owner asked for three things: the bar removed; the condominium's latest notice shown
under the first four modules, on a card of their own design; and the two administration modules
kept below that card, drawn differently — lower, and each as wide as the screen.

## Decision

**The `(tabs)` group is deleted and the home screen is the ordinary route `app/index.tsx`.** The
URL is still `/`. Signing out is a row of Settings, with the confirmation it already had.

**A module declares a `kind`** — `everyday` or `administration` — in `modules.ts`, beside
`visibleTo`. The home screen draws the first as cards in the grid and the second as full-width rows
below the notice card. Who sees a module is unchanged.

**The latest notice is the first item of the list the board already loads.** No new route.

**The card and the hook that finds the notice live in `features/newsletter`**, exported from its
`index.ts`, and `HomeScreen` composes them.

**The card is always dark through a nested `ThemeProvider scheme="dark"`**, with its styles made in
an inner component, inside that provider.

**The wave picture is bundled with the app**, at `mobile/assets/images/notice-card-waves.png`, and
drawn dimmed over a dark base.

**The home screen scrolls**, and its grid is a wrapping view rather than a list.

## Alternatives considered

| Option | Why not |
|---|---|
| Keep the bar, with Home and Settings | A bar to save one touch on a screen rarely opened |
| Hide the bar with a style | The route and the file that existed only for the tab would remain |
| A list of names — "Roles and Requests are rows" — in the home screen | The next administration module would mean editing a component. A `kind` is data, in the file that already describes modules |
| Tell the kinds apart by `visibleTo` — "whatever residents do not see" | Pass check is not seen by residents either, and it is the doorman's daily tool |
| A route that returns only the latest notice | A second query whose ordering could drift from the board's. The head of the same answer cannot disagree with it |
| Put the card in `features/home` | It is made of `Notice` and of the board's preview rule; a copy of either would be a second definition of the same thing |
| Dark colours written into the card | Colours never come from a constant ([0014](0014-colours-come-from-context-and-styles-are-made-from-the-palette.md)). The dark palette already has the white and the green the design uses |
| Keep the grid as a `FlatList` | It would be a virtualised list inside the new scroll view, for at most five items |

## Consequences

- **The home screen downloads the whole board to show one notice.** Boards are short. When they are
  not, the answer is a limit on the existing route — not a different route.
- **`features/newsletter` has a public API beyond its screens for the first time**, and
  `features/home` depends on it. The dependency goes one way.
- **A failure to load the notice is silent on the home screen.** The card is simply absent; the
  board, in its module, is where a failure is explained.
- **The card looks the same in both appearances**, deliberately — the second component, after the
  visitor pass, that does not follow the appearance in use. The trap is the same: styles made
  outside the nested provider follow the app, and the card turns light.
- **The project has its first bundled image**, and `mobile/assets/` exists. The file is a
  screenshot of a picture from outside the project: its resolution is the screenshot's, and
  whether it may be distributed is for the owner to confirm. The icons `app.json` names in that
  folder are still missing — an older gap this did not close.
- **Nothing on the home screen can be reached only through the bar any more**, so nothing floats
  over its content; the bottom padding that cleared the bar is an ordinary one.
- **A new module must say what kind it is**, or it does not compile.

**Evidence:** [app/index.tsx](../../mobile/app/index.tsx),
[HomeScreen.tsx](../../mobile/features/home/HomeScreen.tsx),
[modules.ts](../../mobile/features/home/data/modules.ts),
[ModuleRow.tsx](../../mobile/features/home/components/ModuleRow.tsx),
[useLatestNotice.ts](../../mobile/features/newsletter/hooks/useLatestNotice.ts),
[LatestNoticeCard.tsx](../../mobile/features/newsletter/components/LatestNoticeCard.tsx),
[SettingsScreen.tsx](../../mobile/features/settings/SettingsScreen.tsx)
