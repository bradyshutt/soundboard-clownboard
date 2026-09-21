# Toggle all sounds — Implementation plan

## Status

Done.
Progress: [x] engine behavior [x] UI copy [x] merge and live smoke

## Approach

Extend the established gallop toggle rule to every public sound ID without changing the active-handle model or cross-sound overlap.

## Steps

1. Update `src/audio-engine.js` and `tests/audio-engine.test.js` so active effects and the active speech pad stop on a same-pad tap.
2. Update `src/app.js` and `tests/app.test.js` so all active pads advertise “tap to stop”; run targeted tests and a mobile smoke check.

## Risks / tradeoffs

- Speech uses a shared internal channel key, so toggle lookup must use its stored public sound ID.
- Stops during the 250 ms Bluetooth warm-up must settle cleanly.

## Changelog

- 2026-09-21: initial fast-path plan
- 2026-09-21: implementation complete; 28 tests and focused mobile smoke pass
