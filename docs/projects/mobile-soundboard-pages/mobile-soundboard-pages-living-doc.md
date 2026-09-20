---
feature: mobile-soundboard-pages
status: draft
owner: @brady
updated: 2026-09-20
---

<!-- AGENT INSTRUCTIONS — read before editing
- Status is rewritable; always bump `updated:` in frontmatter.
- Context and Goals change only when reality changes; record changes in Journal.
- Decision log and Journal are append-only.
-->

## Status

**TL;DR:** Build a mobile-first, install-free soundboard as a static GitHub Pages site. The app will show a 3×4 paginated grid, synthesize its sounds locally for immediate playback, and provide a microphone-monitor toggle for live projection.

**Current state:**
- brady-bot: phase 2/15 · config: quick · repo: personal
- The empty repository and GitHub Pages constraints have been investigated.
- Narrow repository research and implementation planning are next.

**Next actions:**
- [ ] Finish narrow repository research and settle the approach.
- [ ] Write and adversarially review the implementation plan.
- [ ] Implement, verify, review, and deploy after the plan gate.

## Context

The soundboard will be used primarily from a phone and must make sixteen requested effects available with one-tap playback. Twelve cells are visible per page, with previous/next controls below the grid. One cell toggles immediate microphone monitoring; the gallop cell also exposes a loop control.

The repository currently contains only an initial placeholder commit. GitHub Pages is not configured yet and the repository is private.

## Goals

- Present exactly twelve large tap targets at a time in a full-height 3×4 grid.
- Cover all sixteen requested sounds across two pages with obvious page navigation.
- Start synthesized effects immediately from a tap without network fetches or licensed audio assets.
- Toggle live microphone monitoring with clear permission, active, and error states.
- Give the 30-second gallop effect a separate, accessible loop toggle.
- Deploy over HTTPS with GitHub Pages and leave a small, testable foundation for later recording/playback support.

## Decision log

### 2026-09-20 — Generate the initial sound library in-browser
**Context:** The app needs distinctive effects but the repository has no licensed audio assets, and phone playback should not wait on downloads.
**Decision:** Use Web Audio synthesis for effects and the device speech synthesizer for the two spoken lines. Use a generic Western delivery for “howdy partner,” without imitating a named performer.
**Consequences:** The site stays tiny and license-safe, but effects are stylized rather than studio recordings and speech timbre varies by device.

### 2026-09-20 — Keep the first release static and dependency-light
**Context:** GitHub Pages is the deployment target and future recording support is explicitly out of the first release.
**Decision:** Prefer semantic HTML, CSS, and small JavaScript modules with a lightweight test/build setup only where it materially improves confidence.
**Consequences:** Deployment and rollback are simple; later recording persistence can be added behind the sound definition/playback boundary.

## Journal

### 2026-09-20 — brady (human)
Initial scaffold.

### 2026-09-20 — Codex
Phase 0 complete: resolved `quick` with a Phase 6 plan gate, baseline draft-PR output, `origin/main`, and the personal-repo profile.

### 2026-09-20 — Codex
Phase 1 complete: confirmed the repo is an empty private GitHub repository, Pages is not configured, Actions are enabled, and microphone monitoring requires the HTTPS that Pages provides.

### 2026-09-20 — Codex
Phase 2 complete: created the minimal tracking document and captured the initial product and implementation decisions.
