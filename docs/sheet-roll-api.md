# Sheet roll API

The player page accepts named rolls from any sheet service through the `atlas-sheet-rolls/v1` window message channel. `SheetRoll.site` is a bounded service slug, not an allowlist. No registration or Atlas credentials are needed.

The contract types and parser live in [`src/bridge/contract.ts`](https://github.com/atlas-vtt/atlas-dice/blob/main/src/bridge/contract.ts). The Atlas player page implements the receiving end. The extension sends to that page through `atlasContent.ts`.

## Contract

Send from a content script in the Atlas player window using `window.postMessage(request, location.origin)`. The receiver requires that exact window and origin. External tabs and frames cannot call it directly. Use extension tab messaging to reach a content script in the Atlas tab.

```js
{
  channel: 'atlas-sheet-rolls/v1',
  kind: 'roll', // or 'probe', with no roll field
  id: crypto.randomUUID(),
  roll: { site: 'your-sheet', character: 'Mira', name: 'Spear damage', formula: 'd8+3' },
}
```

Reply envelope: `{ channel: 'atlas-sheet-rolls/v1', kind: 'reply', id, reply }`.

- Probe: `{ ok: true, available: boolean, capabilities: SHEET_CAPABILITIES }`.
- Sent roll: `{ ok: true, available: true }`. This is dispatch, not GM acceptance or a result.
- Failure: `{ ok: false, code, error }`. Codes: `invalid-roll`, `not-ready`, `send-failed`, `rate-limited`, `delivery-uncertain`.
- Invalid envelopes, IDs, channels and kinds are ignored. Clients time out after three seconds, remove their listener, and never retry automatically.
- Fields are additive within v1. Clients must ignore extra fields and accept older replies with no capabilities or code. `parseReply` preserves the recognized fields and ignores unsupported capability versions.

`SHEET_CAPABILITIES` lists limits: 100 starting dice, 100 normalized formula characters, 60 character-name code points, 200 feature-name code points, 64 ASCII service-slug characters, ten new requests per one-second window, and 128 cached roll replies. Raw formula input is capped at 400 UTF-16 units; raw names at four times their visible limit. The slug matches `[a-z][a-z0-9]*(?:-[a-z0-9]+)*`.

Use `parseSheetRoll` for all untrusted data. `normalizeFormula` accepts a bounded subset of Atlas dice notation: dice, signed whole numbers, keep-highest/lowest and explosions. It also accepts one signed or unsigned whole-number modifier with at most four digits. Unsigned modifiers become signed (`2` becomes `+2`), including zero. A modifier remains unresolved until the GM rolls it. It refuses sums containing no dice, variables, multiplication, parentheses and incomplete formulas. The GM remains the authority for the actual roll and result. The requested labels do not grant token ownership.

## Default dice

Send `+2` to use the assigned character sheet's default dice. Its template's dice set wins. Without a character override, Atlas uses the played campaign's dice settings, or the collection's settings when the campaign uses those. If neither defines dice, Atlas uses its normal fallback. The GM reads these settings for each roll. The default dice keep their names and colours, in public and private rolls.

Send `1d8+2` when the sheet specifies a d8. Explicit dice win over every default. They take no default names or colours unless you send `setAppearance: true`. Do not add a d20 to a modifier on the sheet service's behalf. Do not add a game preset to use this API.

To show the GM's names and colours on an explicit default pool, add `setAppearance: true` to the roll. For example:

```js
roll: { site: 'your-sheet', character: 'Mira', name: 'Check', formula: 'd12+d12+d6+2', setAppearance: true }
```

Atlas matches the first dice against the entire GM-defined pool, in order. With two named d12s as the default, the two d12s get those names and colours. The extra d6 stays plain. A grouped `2d12` can also match two separately named dice. A missing die, different size or negative base die prevents the match. The flag changes appearance only. It never changes the requested dice, bonus or result. Send no names, colours or dice-set IDs. The GM selects the set under the same ownership and default rules as a bare bonus. Older pages and GMs ignore this optional field. The built-in Demiplane adapter sets it for duality pools, not ordinary damage pools.

## Delivery rules

The receiver keeps the last 128 unique roll replies in memory, including failures. IDs are scoped to one loaded player page. A duplicate ID returns the original reply, even with a changed payload, and uses no rate allowance. The callback is synchronous; the reply is cached before the next window message is handled. There is no asynchronous delivery gap. Reload and cache eviction end this duplicate protection.

The rate window starts with the first new roll request and resets after at least 1,000 ms. Invalid requests count; probes and cached requests do not. Do not depend on the bridge's allowance for a batch of rolls: the GM has its own limits.

Rolls use the acting token and current roll mode of the Atlas player page. Disconnected rolls are refused and never queued. Never send to every open table or fall back to a different table after delivery becomes uncertain. Check the table log before the player makes another roll after a timeout.

## Verify a provider

- Keep a roll's feature name and character label readable and current.
- Test modifiers, explicit dice, extra dice and the optional GM appearance flag.
- With two Atlas tabs open, choose one. Send to that one only.
- Refuse disconnected requests. Do not queue or retry them.
- Keep a request ID after uncertain delivery. A fresh ID can create another roll.

Run `npm run check` in this project to check the built-in contract and adapters and install the release ZIP in Chromium. Those tests use local fixtures. They do not verify a live third-party sheet or GM.
