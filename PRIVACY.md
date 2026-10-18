# Atlas Dice privacy

Atlas Dice connects supported character sheets to your Atlas VTT player table.

## What it reads

When you use a supported roll control, Atlas Dice reads:

- The character's displayed name.
- The feature or roll name.
- The dice formula and selected modifiers.
- Whether a Demiplane roll uses its duality pool, so a compatible GM can apply their dice names and colours.

The Demiplane adapter reads the resolved dice properties of the chosen control. It does not call the sheet's handlers or read account context.

Atlas Dice checks open Atlas player tabs to find a roll destination. It uses their tab IDs, titles and bridge status for the popup. It saves your chosen tab ID in Chrome's session storage. It does not save a copy of your sheet or roll history.

## Where rolls go

The extension sends a roll through Chrome's tab messaging to the Atlas player tab you chose. That page sends it through your existing Atlas connection to your GM. Atlas handles the roll result, audience and table log.

Atlas Dice makes no separate HTTP requests. It has no analytics or advertising code. It does not send roll data to a separate extension service.

## Site access

The manifest grants access to:

- D&D Beyond character pages: to read supported roll controls and the character label.
- Demiplane: to read supported Daggerheart controls and their resolved dice properties. The adapter acts only on Daggerheart character pages.
- `play.atlas-vtt.dev` and `play-staging.atlas-vtt.dev`: to find Atlas player tabs, check whether they can receive a roll and send the named formula.

The `storage` permission holds your chosen table tab for the browser session. The extension does not ask for access to every website.

It does not read login cookies, authentication tokens or Atlas player keys. It does not read the complete character sheet.

## Remove the extension

Remove Atlas Dice from your browser's extensions page. The extension's stored table choice is removed with it. Rolls already recorded in an Atlas table log are managed by Atlas and its GM.

For questions or bug reports, use [the project issues](https://github.com/atlas-vtt/atlas-dice/issues).
