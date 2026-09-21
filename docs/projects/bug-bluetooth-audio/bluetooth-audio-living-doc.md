---
feature: bluetooth-audio-attack
status: in-progress
owner: @brady
updated: 2026-09-21
---

## Status

- `brady-bot-bug: phase 8/16 · config: quicker no-stop no-repro merge`
- Reproduction: evidence-backed Bluetooth report plus failing warm-up regression test
- Root-cause confidence: probable
- Severity: P2

## Context

Cold Bluetooth output takes roughly 250 ms to wake, while each recording begins at time zero. The transport consumes the opening audio during wake-up, so users hear a delayed clip with its attack missing. This cloud VM has no Bluetooth sink; device behavior is evidence-backed rather than locally reproduced.

## Goals

- Prime the output for 250 ms at near-inaudible volume, then replay each recording from time zero at its intended volume.
- Preserve synchronous gesture-safe `play()`, overlap, lifecycle cleanup, and gallop tap-to-stop.

## Approach

Keep the existing media-element path. Start it synchronously at `0.001` volume to open the output route, then after 250 ms seek to zero and restore the configured volume. Cancel and settle that warm-up when playback is stopped, including gallop's second tap.

## Decision log

### 2026-09-21 — Use a short in-band output warm-up
**Context:** Preloading removes network delay but cannot wake a sleeping Bluetooth output; a continuous keepalive would consume battery.
**Decision:** Warm each playback for 250 ms at near-inaudible volume and restart its attack.
**Consequences:** Cold playback retains about 250 ms of unavoidable Bluetooth wake latency but no longer loses the recognizable beginning; no always-on audio session is introduced.

## Journal

### 2026-09-21 — brady (human)
Reported delayed, clipped attacks over Bluetooth and reiterated that a second gallop tap must stop the 30-second run.

### 2026-09-21 — Codex
Fast-path diagnosis: output-device latency is cumulative and outside page control; the app currently starts full-volume content at media time zero. Added a failing regression requiring a 250 ms near-inaudible warm-up followed by an attack replay. The deployed gallop state machine already stops active and pending playback on a second main-pad tap.
