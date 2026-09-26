# Live microphone effects — Implementation plan

## Status

In progress.
Progress: [ ] catalog and UI state [ ] effect graphs and teardown [ ] ship and live smoke

## Approach

Add microphone identity/profile metadata to the catalog and engine snapshots. Reuse one live stream while replacing a small graph factory output for Clean, Robot, Echo, or Megaphone. Keep effect levels conservative because direct monitoring can feed back.

## Steps

1. Update `src/catalog.js`, `src/app.js`, `tests/catalog.test.js`, and `tests/app.test.js` for four independently presented microphone pads.
2. Update `src/audio-engine.js` and `tests/audio-engine.test.js` with replaceable native-node graphs, live switching without another permission request, and complete oscillator/delay/filter/track teardown.
3. Run `npm test`, `npm run check`, and one mobile browser permission/switch/stop smoke; merge to `main` and verify Pages.

## Risks / tradeoffs

- Echo and direct monitoring increase feedback risk, so headphones remain recommended and feedback is intentionally low.
- A graph-switch click is possible; avoiding persistent parallel graphs keeps mobile CPU and battery use lower.

## Changelog

- 2026-09-26: initial fast-path plan
