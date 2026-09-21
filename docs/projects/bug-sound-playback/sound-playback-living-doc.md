---
feature: sound-playback
status: in-progress
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
- Soft caps: Status ≤ 15 lines, Open questions ≤ 10 items.
-->

## Status

**TL;DR:** Production playback works, but most named effects sound weird and do not resemble their labels. The defect is reproduced: all thirteen named effects are hand-built from bare oscillators or generated noise, with no purpose-recorded audio assets.

**Current state:**
- `brady-bot-bug: phase 8/16 · config: baseline`
- Verdict: `actionable` · severity P2
- Reproduction: direct user listening report plus failing catalog assertion showing 0/13 named effects have purpose-recorded audio assets
- Root-cause confidence: proven

**Next actions:**
- [x] Confirm the recommended asset-backed root fix.
- [x] Review the regression-first implementation plan.
- [x] Make the committed recording regression test green.
- [x] Document CC0 provenance.
- [ ] Execute the listening/playback matrix and revert-check.
- [ ] Complete fix verification and reviews.

---

## Context

The phone-first GitHub Pages soundboard was deployed from `main` at https://bradyshutt.github.io/soundboard-clownboard/. The first live user report says, “Almost none of the sounds are working.” The original smoke test exercised every pad and checked UI state and console exceptions, but did not measure or listen to audio output.

### Bug brief

- **Symptom:** Most sound pads do not deliver a usable sound in production for the reporting user.
- **Signal:** Direct user report on 2026-09-20 against the production GitHub Pages site; occurrence count, device, browser, and exact affected pads are unknown.
- **Where it surfaces:** `src/app.js` dispatches pad activation; `src/audio-engine.js` owns synthesized effects, device speech, and microphone monitoring.
- **Discriminators:** Device/browser and whether “not working” means silent output versus unrecognizable synthetic output are not yet known.
- **Blast radius:** The app's core workflow is degraded for at least one production user. No data is at risk.
- **Timeline:** First reported immediately after the initial deployment from merged PR #1 (`1176a9f`). The production audio engine is byte-identical to `main`.
- **Verdict:** `actionable` — P2. This is a direct failure report against the product's primary feature, with reach not yet established.
- **Gaps:** No client telemetry or error reporting exists; no browser/device details or pad-by-pad results accompanied the report.

## Goals

- Make every non-microphone pad produce its intended audible result on supported phone browsers.
- Preserve the gallop state machine, speech replacement behavior, and microphone teardown guarantees.
- Add a regression check that fails on the deployed implementation before changing production code.

## Non-goals

- Add recording, uploads, persistence, or unrelated soundboard features.
- Imitate Arthur Morgan or a named performer for “howdy partner.”

## Approach

Replace the acoustically generic recipes with curated, redistributable recordings while retaining the engine's current stoppable-handle boundary, overlap rules, 30-second gallop state machine, speech behavior, and microphone teardown. Add catalog/file-integrity tests and require a named listening pass because amplitude-only automation cannot prove semantic fidelity.

## Open questions

- [x] Does “not working” mean silent playback, incorrect/unrecognizable playback, or both? Incorrect and unrecognizable playback.
- [ ] Should every named procedural effect move to a curated recording, or only real-world effects while musical stings remain synthesized? Recommendation: replace all thirteen so the acceptance rule is consistent.

---

## Decision log

<!-- Add entries below as decisions are made. Format:
### YYYY-MM-DD — <decision title>
**Context:** What forced the decision.
**Decision:** What we chose.
**Consequences:** What this implies; what it rules out.
-->

### 2026-09-20 — Replace every procedural effect with a curated recording
**Context:** The user confirmed the sounds are audible but weird and inaccurate, and the root-cause pass found the same fidelity defect in all thirteen procedural recipes.
**Decision:** Use compact, redistributable CC0 recordings for all thirteen non-speech effects while preserving gallop, speech, and microphone lifecycle contracts.
**Consequences:** The static payload grows and listening remains a human acceptance step, but labels now map to purpose-recorded sources and the entire sibling class is fixed consistently.

## Journal

### 2026-09-20 — brady (human)
Initial scaffold.

### 2026-09-20 — Codex
Phase 0 complete: resolved the baseline bug workflow with required reproduction and diagnosis/plan gates; detected a personal static-site repo with Node tests and GitHub access but no production observability feed.

### 2026-09-20 — Codex
Phase 1 complete: classified the direct production report as actionable P2. The deployed audio engine matches `main`, while browser/device and exact pad failures remain unknown.

### 2026-09-20 — Codex
Phase 2 complete: created this tracking document and framed success as restoring audible output for every playback pad.

### 2026-09-20 — Codex
Phase 3 stopped at the reproduction gate: an instrumented run against production on mobile Chrome measured non-zero peaks for all 13 Web Audio effects (0.176–0.688), observed both speech calls, and saw a running audio context. The user-reported failure remains unreproduced without the affected device/browser and clarification of silent versus incorrect output.

### 2026-09-20 — Codex
Phase 3 resumed and completed after the user clarified that playback is audible but weird and inaccurate. A catalog assertion requiring purpose-recorded assets failed because all 13 named effects currently have no asset source; source inspection confirms they are implemented with generic oscillator/noise recipes.

### 2026-09-20 — Codex
Phase 4 complete: root cause is proven and longstanding since `5ff1a0f`. Specific real-world labels were implemented as minimal oscillator/noise gestures, the real recipe was mocked out in tests, and physical-device sound fidelity was explicitly left outside the original acceptance pass. All thirteen procedural effects are reachable sibling instances.

### 2026-09-20 — Codex
Phase 5 checkpoint: recommend the root fix—replace all thirteen procedural effects with curated redistributable clips, preserve existing lifecycle/state contracts, and add asset integrity plus human listening acceptance. Revert would remove the whole product; relabeling would only hide the defect; retuning simple synthesis would remain unreliable for animal and vehicle sounds.

### 2026-09-20 — Codex
Phase 5 approved: the user said “Do it,” authorizing the complete asset-backed root fix and the requested merge/deployment to `main`.

### 2026-09-20 — Codex
Phase 6 complete: wrote the five-step bugfix plan with a test-only red commit, one asset-backed fix across all thirteen siblings, provenance documentation, a revert-check, and live production verification.

### 2026-09-20 — Codex
Phase 7 review complete: five objections were fixed in the plan—catalog-to-engine source wiring, exact gallop timing and stale-deadline tests, synchronous gesture-safe playback, an executed semantic listening matrix, and an isolated-worktree revert-check. Convention fit found no objections.

### 2026-09-21 — Codex
Phase 7 approved by the user. Phase 8 step 1 complete: committed the asset-coverage reproduction test alone and observed the expected failure, `horse-whinny must declare a bundled recording`.

### 2026-09-21 — Codex
Phase 8 step 2 complete: replaced every procedural recipe with a distinct bundled CC0 recording and moved effect playback to a synchronous media-element path. The reviewed gallop state machine now loops the recording for an injected exact thirty-second one-shot deadline; 23 unit tests and syntax checks pass.

### 2026-09-21 — Codex
Phase 8 step 3 complete: documented each recording's creator, Freesound source, CC0 status, and unchanged MP3 encoding, and added the per-pad phone listening criteria to the asset provenance guide.
