# Accurate sound effects — Implementation plan

## Status

In progress — the regression test is committed red; the asset-backed fix is next.

Progress: [x] step 1 [ ] step 2 [ ] step 3 [ ] step 4 [ ] step 5

**Defect:** Thirteen semantically specific effects are represented by acoustically generic oscillator/noise recipes (`src/audio-engine.js:62`).
**Reproduction:** Direct listening report plus a failing catalog assertion — none of the thirteen effect entries currently points to a purpose-recorded local audio asset.
**Confidence:** proven

## Approach

This realizes the root-fix option approved in the [tracking document](./sound-playback-living-doc.md): replace all thirteen procedural recipes with compact CC0 recordings, declared directly on the catalog entries and stored under `assets/audio/`. The controller passes the catalog's explicit `{ id, src }` contract into `AudioEngine`, which plays one `HTMLAudioElement` per active effect synchronously inside the tap call stack; recordings do not wait for Web Audio initialization. Different effects may overlap, and replaying one ID still replaces only that ID. The gallop asset remains governed by the reviewed state machine: an injectable scheduler loops its short recording for exactly thirty seconds in one-shot mode and indefinitely in loop mode. Device speech and microphone-owned Web Audio remain separate.

No persisted data exists, so no backfill is needed. The fix changes only effect playback; app routing, paging, speech replacement, and microphone teardown must retain their existing contracts. The earlier tests missed this because they mocked the complete effect factory and asserted lifecycle rather than semantic fidelity. Asset coverage tests close the structural gap; a live listening pass remains necessary because code cannot prove that a recording sounds like its label.

## Steps

1. **Commit the failing reproduction test.** Extend `tests/catalog.test.js` to require every `kind: "effect"` entry to declare a unique local MP3 source whose file exists and is non-empty. Run `npm test` and record the expected failure that the current effect entries have no `src` values.
2. **Replace the procedural library with CC0 recordings.** Add the thirteen selected files under `assets/audio/`, attach each source to its catalog entry, pass the catalog's exact `{ id, src }` values through `AppController` into `AudioEngine`, and replace oscillator/noise generation with injectable `HTMLAudioElement` playback behind the existing active-handle contract. Call `media.play()` before any promise boundary and reserve awaited Web Audio setup for the microphone. Add an injectable gallop deadline that loops the short clip for one-shot playback. Update engine/controller tests to cover all thirteen source mappings, a pending `AudioContext.resume()` not delaying media start, same-ID replacement, different-ID overlap, playback rejection cleanup, natural completion, release/dispose, 29,999/30,000 ms one-shot timing, replay/toggle/release cancellation, stale deadlines, and the exact loop transitions. Make the reproduction and full test suite green.
3. **Record provenance and the listening contract.** Add `assets/audio/README.md` with each creator, source page, CC0 status, and any editing performed. Update the product README to describe bundled recordings rather than procedural synthesis, and add an explicit phone-speaker listening checklist covering every named pad without changing speech or microphone scope.
4. **Perform the revert-check.** In an isolated temporary worktree at the test-only commit, run the new regression test and confirm the recorded missing-asset failure without mutating the implementation tree. Then rerun `npm test` plus `npm run check` on the fixed branch.
5. **Verify the original symptom and production result.** Before merge, execute and record a thirteen-row label-to-recording listening matrix for recognizability and acceptable phone-speaker loudness; also confirm each recording loads and advances playback. Exercise gallop one-shot/loop interruption, speech replacement, and microphone live/off teardown, then merge and wait for GitHub Pages to deploy `main`. Repeat the labeled listening matrix and confirm all asset requests return 200 on production. Because no client telemetry exists, production confirmation is this deployed semantic and transport matrix plus the user's listening result.

## Risks / tradeoffs

- Bundled recordings increase the static payload, but playback is lazy and the site remains dependency-free; each selected source is CC0 and provenance stays in-repo.
- Browser media elements use the device media channel rather than the shared Web Audio compressor. Per-effect volume normalization must be checked on phone speakers to avoid large loudness jumps.
- Semantic fidelity is partly subjective. Metadata and source-purpose checks prevent generic synth fallback, while the final listening matrix is the acceptance gate.
- All thirteen procedural sibling instances are fixed together. Spoken phrases remain device voices because their words already match their labels and “howdy partner” must remain generic rather than imitate a performer.
- Rollback is a clean revert of the fix PR; there are no migrations, persisted writes, or external state changes.
- No unrelated audio refactor or feature expansion is in scope, and existing tests will not be weakened to accommodate the new implementation.

## Changelog

- 2026-09-20: Initial bugfix plan for the approved asset-backed root fix.
- 2026-09-20: Incorporated plan-review findings by specifying the cross-layer source contract, synchronous gesture path, exact gallop deadline tests, semantic listening matrix, and isolated-worktree revert-check.
