# Mobile soundboard on GitHub Pages — Implementation plan

## Status

Approved by plan review and Brady for implementation, merge to `main`, and production deployment.

Progress: [x] step 1 [x] step 2 [x] step 3 [x] step 4

## Approach

Build a no-build static web app with clear seams between the declarative catalog (`src/catalog.js`), browser audio ownership (`src/audio-engine.js`), and DOM/page state (`src/app.js`). The decisions and tradeoffs are recorded in the [living doc](./mobile-soundboard-pages-living-doc.md#decision-log). Keep browser-specific dependencies injectable or behind narrow methods so Node's built-in test runner can cover paging, catalog integrity, source replacement, microphone teardown, and gallop-loop state without adding a package dependency.

The HTML/CSS shell will fit twelve touch targets plus navigation inside the dynamic mobile viewport and safe areas. GitHub Pages will serve the no-build source tree directly, using the feature branch for the pre-merge smoke test and `main` for production after merge.

## Steps

1. **Create the static shell, catalog, and paging model.**
   - Add `index.html`, `styles.css`, `package.json`, `src/catalog.js`, and `tests/catalog.test.js`.
   - Define all sixteen requested sounds in stable order, paginate into twelve slots, and fill unused page-two positions with disabled future-sound placeholders.
   - Establish semantic controls, safe-area metadata, the 3×4 grid, and bottom previous/next controls without audio wiring.
   - Tests: `tests/catalog.test.js` verifies sound count/order, unique IDs, capabilities, 12-slot paging, and navigation boundaries.
   - Verify: `npm test` and `npm run check`.

2. **Implement the browser audio engine and effect library.**
   - Add `src/audio-engine.js` and `tests/audio-engine.test.js`.
   - Centralize `AudioContext` creation/resume, per-sound active handle replacement, cleanup, gain limiting, speech cancellation, and disposal.
   - Implement distinct procedural recipes for two horse calls, a generated 30-second gallop buffer, two clown horns, two engine revs, burnout, squeak, two meows, a short circus phrase/beat, and a warm rising pad; use device speech synthesis for “yee-haw” and generic-Western “howdy partner.”
   - Implement one shared gallop state machine: starting one-shot stops looping, starting looping stops one-shot, stopping/disposal clears the mode, and the loop UI derives from the actual engine state. Implement microphone request/live/error/off lifecycle with deterministic node disconnection and track stopping.
   - Tests: injected fakes verify context resume, same-sound replacement, different-sound overlap, every gallop mode transition, microphone teardown, permission errors, and full engine disposal.
   - Verify: `npm test` and `npm run check`.

3. **Wire and polish the mobile interaction surface.**
   - Add `src/app.js` and finish `index.html`/`styles.css` states for pressed playback, microphone requesting/live/error, loop active, page indicator, disabled navigation, and “More sounds soon” slots.
   - Keep the gallop loop control as an accessible sibling control in the pad corner, preserve long-running audio across page changes, and release resources on `pagehide`.
   - Add concise headphone/feedback guidance and visible status announcements without shrinking the 3×4 targets.
   - Tests: extend catalog/controller-focused tests for event-to-command mapping and accessible labels where they remain DOM-independent.
   - Verify: `npm test`, `npm run check`, then serve locally and inspect portrait and landscape phone viewports; exercise every pad, page navigation, loop start/stop, microphone denial, microphone live/off, and repeated taps in a real browser.

4. **Add and exercise the GitHub Pages delivery path.**
   - Add `README.md` with local verification, microphone-safety, and deployment guidance.
   - Run tests and syntax checks locally, enable branch-source Pages, and temporarily point it at this exact feature branch for the pre-merge deployment.
   - Wait for the deployment to succeed and smoke-test the public project URL on a phone-sized viewport. After the final code/review fix is live and the PR is merged, repoint Pages to `main` and verify the production deployment reflects the merge commit.
   - If the private repository's account plan rejects Pages, stop before changing repository visibility; making source public requires explicit authorization.
   - Verify: local gates, workflow status, Pages API status, live URL load, asset load, tap playback, and microphone prompt over HTTPS.

## Risks / tradeoffs

- Procedural effects favor instant, license-free delivery over studio realism; browser and speaker differences will change their character.
- Device speech voices differ, and some mobile browsers may delay voice enumeration; the implementation needs a generic English fallback rather than assuming a named voice.
- Direct microphone monitoring can create acoustic feedback. Conservative gain and headphone guidance reduce but cannot eliminate that physical risk.
- Mobile browsers require audio and microphone activation from a user gesture. Every entry point must resume the context inside the tap path and surface permission failures.
- A private repository needs an eligible paid GitHub plan for Pages. The deployment step will verify eligibility and will not make the repository public implicitly.
- A 30-second generated stereo/mono buffer consumes several megabytes in memory; generate it lazily once and reuse it rather than rebuilding on each tap.

## Changelog

- 2026-09-20: initial plan
- 2026-09-20: defined a single gallop state machine and replaced the impossible pre-merge manual dispatch with a temporary branch-scoped push trigger after plan review
- 2026-09-20: replaced Actions deployment with Pages branch-source publishing after the cloud credential rejected workflow-file pushes; production still publishes only `main`
