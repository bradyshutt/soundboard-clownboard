# Gallop toggle and active pad state — Implementation plan

## Status

Approved — implement the smallest extension of the existing active-handle model.
Progress: [ ] step 1 [ ] step 2

## Approach

Enrich existing active-handle entries with their originating catalog ID and publish `activeSoundIds` in engine snapshots. Emit on each start/end/stop/error transition, including the singleton speech channel. Make a main gallop tap stop either one-shot or loop playback when active or pending. Derive every visible pad’s `data-state`, hint, and accessible label from the snapshot, using the existing `data-state` CSS convention. See the [Decision log](./gallop-toggle-active-state-living-doc.md#decision-log).

The guidance bank was unavailable in this cloud workspace; no external guidance was applied.

## Steps

1. Update `src/audio-engine.js` and `tests/audio-engine.test.js` to publish active catalog IDs, notify across media and speech lifecycles, and make repeated gallop taps stop active/pending playback. Gallop stop paths must update mode and handle ownership before emitting one coherent snapshot; a subscription test will assert that invariant. Verify with `node --test tests/audio-engine.test.js`.
2. Update `src/app.js`, `styles.css`, and `tests/app.test.js` to derive and render active presentation for every visible pad while keeping non-gallop taps as replay actions. Presentation tests will distinguish inactive “Play,” active ordinary “Play again,” and active/pending gallop “Stop” copy while preserving microphone copy. Verify with `npm test && npm run check` and one mobile browser smoke pass.

## Risks / tradeoffs

- The internal speech channel key differs from its initiating pad ID, so each active entry must retain the public sound ID.
- A gallop may be pending before `gallopMode` settles; toggle detection must include pending state.
- Persistent active styling must remain distinct from the existing short tap pulse.

## Changelog

- 2026-09-21: initial plan
- 2026-09-21: clarified atomic gallop snapshots and action-accurate active labels after plan review
