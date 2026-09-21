---
feature: gallop-toggle-active-state
status: draft
owner: @brady
updated: 2026-09-21
---

<!-- AGENT INSTRUCTIONS — read before editing
- Status / Next actions: overwrite freely; always bump `updated:` in frontmatter.
- Context / Goals / Non-goals: edit only when reality changes; record the change in Journal.
- Approach / Open questions: evolving — update as understanding shifts.
- Decision log + Journal: APPEND ONLY. Never rewrite or delete past entries.
- Open questions: add, check off, or promote to Decisions. Don't silently delete.
- If a fact moves between sections, update the canonical spot and log it in Journal.
-->

## Status

**TL;DR:** Make the gallop pad itself a play/stop toggle and visibly mark every pad whose sound is currently playing. The change is scoped and ready for implementation.

**Current state:**
- Recording-backed playback is merged on `main`.
- Research and a short implementation plan are in progress.

**Next actions:**
- [ ] Implement engine active-state reporting and gallop toggle behavior.
- [ ] Wire pad presentation, run targeted tests, and ship to `main`.

---

## Context

The soundboard can play overlapping sounds, but pads do not show which sounds are active. The gallop pad starts a thirty-second run on every tap instead of letting a second tap stop the current run.

## Goals

- Tapping gallop while either one-shot or loop playback is active stops it.
- Every playing effect or spoken phrase has a clear active pad state until it ends or is replaced.
- Preserve overlapping sounds, gallop long-press loop behavior, and microphone teardown.

## Non-goals

- Make every non-gallop pad a stop toggle.
- Redesign the grid, audio assets, or playback overlap policy.

## Approach

Expose active catalog IDs from `AudioEngine.getState()`, emit state changes for all playback lifecycles, derive pad presentation from that state, and make `AudioEngine.play("gallop")` stop an already active gallop before starting a new one.

## Open questions

- None.

---

## Decision log

### 2026-09-21 — Keep non-gallop taps as replay actions
**Context:** The user requested an active state for all playing sounds but explicitly requested toggle behavior only for gallop.
**Decision:** Gallop taps stop active gallop playback; other sound taps keep their existing replay/overlap behavior while showing active state.
**Consequences:** The active visual is status, not a universal stop affordance.

## Journal

### 2026-09-21 — brady (human)
Initial scaffold.

### 2026-09-21 — Codex
Scoped the follow-up from the merged recording fix: gallop tap toggle plus engine-driven active presentation for every playing pad, with a targeted verification pass per the user's request to ship quickly.
