---
feature: toggle-all-sounds
status: done
owner: @brady
updated: 2026-09-21
---

## Status

**TL;DR:** Every effect and spoken pad now stops its own active playback when tapped again. Different sounds continue to overlap.

**Next actions:**
- [x] Implement same-pad stop behavior and action-accurate presentation.
- [x] Run targeted checks.
- [ ] Merge and verify GitHub Pages.

## Context

Long recordings sometimes need to be cut short. Gallop already toggles, but other pads currently restart their sound.

## Goals

- Tapping any active sound pad stops that sound immediately, including during Bluetooth warm-up.
- Tapping an inactive sound starts it normally.
- Different sounds continue to overlap.

## Non-goals

- Change microphone behavior, recordings, or pagination.

## Approach

Use the engine's existing active entries and public `soundId` to detect a same-pad tap before dispatch. Stop the matching effect or singleton speech channel, then derive every active pad's label and hint as a stop action.

## Decision log

### 2026-09-21 — Toggle per sound, preserve cross-sound overlap
**Context:** Users need to cut longer sounds short without losing the soundboard's overlap behavior.
**Decision:** A second tap stops only the same pad; other active sounds remain playing.
**Consequences:** Same-pad replay now requires stop followed by another tap.

## Journal

### 2026-09-21 — brady (human)
Requested start/stop toggles for every sound.

### 2026-09-21 — Codex
Implemented per-pad toggles for recordings and spoken lines, including stops during Bluetooth warm-up. Active labels now say “Stop,” different sounds still overlap, 28 tests pass, and mobile smoke confirmed horse, gallop, and horn each transition playing → off.
