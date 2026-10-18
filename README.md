# Atlas Dice

Roll from a D&D Beyond 5e or Demiplane Daggerheart character sheet into your Atlas VTT player table.

**Early test release.** The public Atlas player site has not yet received the sheet-roll receiver. This build needs a compatible Atlas test player page and GM plugin. It can be installed now; sending rolls requires those Atlas updates.

Atlas Dice uses the sheet's normal roll buttons. Your GM rolls the dice in Atlas. The table log shows the character and feature name.

## Install in Chrome or Arc

You do not need Node or any build tools.

1. Open [Releases](https://github.com/atlas-vtt/atlas-dice/releases) and download **`atlas-dice-0.3.1.zip`** from the release assets. GitHub's **Source code** downloads are for developers.
2. Extract the ZIP into a folder you want to keep. Chrome loads the extension from that folder.
3. Open `chrome://extensions` in Chrome, or `arc://extensions` in Arc.
4. Switch on **Developer mode**.
5. Click **Load unpacked**. Select the extracted folder that contains `manifest.json`.
6. Reload your character sheet and Atlas player tabs.

If you already installed Atlas Dice, follow [Update a manual installation](#update-a-manual-installation) to keep one installation.

There is no Chrome Web Store review or registration fee for this manual installation. [Chrome's installation guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Use it

1. Join your Atlas player table. Your GM must be connected and showing a scene. The table needs an Atlas player page and GM plugin that support external sheet rolls.
2. Open your character sheet in the same browser.
3. Use the sheet's normal roll buttons.

Atlas Dice uses the only open Atlas player tab automatically. If you have more than one, open the extension popup and choose the intended table.

On Demiplane, choose a trait or **Duality**, then adjust your modifiers or experiences as usual. Use the final **Roll** button to send the roll to Atlas. Pool preparation stays on the sheet.

## Supported rolls

- **D&D Beyond 5e:** skills, ability checks, saving throws, initiative, weapon and spell attacks and damage, and readable feature dice in the sidebar.
- **Demiplane Daggerheart:** resolved trait, attack, damage, feature and generic Duality rolls. The final roll includes the pool and modifiers you selected on the sheet.
- **GM defaults:** a bare modifier such as `+2` uses the character's dice set first, then the campaign or collection defaults. Explicit dice stay as written. A matching Demiplane duality pool uses the DM's die names and colours. Extra dice keep their normal appearance. These features need a compatible GM plugin and player page.

The extension adds no game presets. It reads the dice from the sheet and the GM's settings.

| Shortcut | Action |
| --- | --- |
| Shift + click | Advantage on a plain d20 roll. |
| Ctrl / Cmd + click | Disadvantage on a plain d20 roll. |
| Alt / Option + click | Use the sheet's own roller for this click. |

Other dice, such as duality and damage dice, keep their formula with Shift and Ctrl / Cmd.

## Update a manual installation

GitHub downloads do not update automatically.

1. Download and extract the new release ZIP.
2. Replace the contents of your existing extension folder with the new files.
3. Open your browser's extensions page and click **Reload** on Atlas Dice.
4. Reload your character sheet and Atlas player tabs.

## If a roll does not arrive

- Check that your GM is connected and a scene is showing.
- Reload the Atlas player tab and character sheet after updating the extension.
- With several Atlas tabs, choose the correct one in the extension popup.
- A message that the player page needs an update means the hosted Atlas page is too old. Updating the extension alone cannot update that page.
- **Sent** means Atlas Dice sent the request. Check the Atlas log for the GM's result or refusal.
- After an uncertain delivery, check the log before rolling again. Atlas Dice does not retry or queue rolls.

Unreadable or unsupported sheet controls keep their native behaviour. Automatic critical damage, spending sheet resources and applying conditions are outside this release. Sheet layouts can change. Tests use representative sheet fixtures; report a control that stops working through [Issues](https://github.com/atlas-vtt/atlas-dice/issues).

This extension is for desktop browsers that support unpacked Chrome extensions.

## Privacy

Atlas Dice reads the displayed character name, feature name and dice formula when you roll. It sends them to your chosen Atlas player tab. Your existing Atlas connection sends the request to the GM.

It does not read login cookies, account tokens, Atlas player keys or your whole character sheet. It makes no separate HTTP requests and sends no analytics. It remembers only your chosen Atlas tab in browser session storage. See [Privacy](PRIVACY.md) for the site permissions and data flow.

## Build from source

Use Node 22.22 or newer.

```sh
npm ci
npm run package
```

Load `dist/` with **Load unpacked**. The install ZIP is written to `release/`.

Run the checks:

```sh
npx playwright install chromium
npm run check
```

`npm run check` runs TypeScript checks, unit tests, the build and a Chromium test that installs the release ZIP. The browser test uses local sheet and Atlas page fixtures. It checks native roll interception, Demiplane duality metadata, table selection and disconnected refusal. It does not contact a real character sheet or GM.

For another sheet service, see [the sheet roll API](docs/sheet-roll-api.md). The listener is open to other providers. This extension's adapters and site permissions cover the two services listed above.

## Licence

[GNU AGPL v3 only](LICENSE). [Source code](https://github.com/atlas-vtt/atlas-dice). Atlas Dice and the Atlas icon are copyright Fabian Urbanek. D&D Beyond, Demiplane and Daggerheart identify compatible third-party services. This is an independent integration.
