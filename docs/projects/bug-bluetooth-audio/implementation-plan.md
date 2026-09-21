# Bluetooth audio attack — Implementation plan

## Status

In progress — failing regression committed.
Progress: [x] failing test [ ] minimum fix [ ] merge and live smoke

## Approach

Inject timer dependencies into the existing recorded-effect handle, synchronously start playback at near-inaudible volume, and replay from time zero at full configured volume after 250 ms. Stopping during warm-up clears the timer and resolves the pending start so gallop toggle remains immediate.

## Steps

1. Make the committed warm-up regression pass in `src/audio-engine.js` without changing public commands.
2. Run the audio-engine tests and one browser gallop stop check, then merge.

## Risks / tradeoffs

- Bluetooth output latency cannot be removed by the browser; this preserves the attack after that latency.
- Timer cleanup must not leave a stopped gallop promise pending.

## Changelog

- 2026-09-21: initial fast-path plan
