---
feature: live-microphone-effects
status: done
owner: @brady
updated: 2026-09-26
---

## Status

**TL;DR:** Add Robot, Echo, and Megaphone live microphone pads beside Clean Mic, using one shared microphone stream and dependency-free Web Audio processing.

**Next actions:**
- [x] Add catalog/UI state for four microphone modes.
- [x] Add replaceable audio graphs with safe switching and teardown.
- [x] Run focused checks.
- [ ] Merge and verify GitHub Pages.

## Context

The soundboard currently offers one clean live microphone monitor. The new pads should produce recognizable voice treatments without uploads, dependencies, or repeated permission prompts.

## Goals

- Add Clean Mic, Robot Mic, Echo Mic, and Megaphone Mic pads.
- Tapping the active mic stops capture; tapping another mic switches effects on the existing stream.
- Preserve permission-race handling, track teardown, and headphone guidance.

## Non-goals

- Studio-grade pitch shifting, vocoding, recording, or effect controls.

## Approach

Keep one captured `MediaStream` and replace only its connected Web Audio processor graph when switching modes. Robot uses ring modulation, Echo uses a conservative delay/feedback path, and Megaphone uses band-limiting plus soft distortion.

## Decision log

### 2026-09-26 — Use native Web Audio effect graphs
**Context:** The requested effects need to run live on phones without increasing the dependency or asset footprint.
**Decision:** Implement three fixed, conservative native-node graphs around the existing shared capture stream.
**Consequences:** Effects are lightweight and immediate, but Robot is ring-modulated rather than a full vocoder and settings are not user-adjustable.

## Journal

### 2026-09-26 — brady (human)
Requested more live microphone buttons with different voice effects and asked for the finished change to ship.

### 2026-09-26 — Codex
Selected the proposed Robot, Echo, and Megaphone set. Research confirmed that a replaceable effect graph preserves the existing single-stream permission and teardown model with lower mobile CPU use than persistent parallel effect buses.

### 2026-09-26 — Codex
Implemented four independently presented mic modes over one captured stream. Switching reuses permission and replaces only the effect graph; stopping still disconnects all nodes, stops modulation sources, and stops every media track. All 29 tests and syntax checks pass, and mobile Chrome exercised Clean → Robot → Echo → Megaphone → off without errors.
