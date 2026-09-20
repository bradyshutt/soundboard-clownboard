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
- brady-bot: phase 7/15 · config: quick merge · repo: personal
- Repository research, first-release scope, and the reviewed four-step implementation plan are complete.
- Both plan-review objections were fixed in the plan, and Brady approved implementation through merge and production deployment.
- The cloud workspace is active and reconciled with the transferred branch; the earlier repository-access blocker is resolved.

**Next actions:**
- [x] Write and adversarially review the implementation plan.
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

## Approach

Build a no-framework, no-build static site from semantic HTML, mobile-first CSS, and native ES modules. A declarative sound catalog supplies labels, visual metadata, and playback identifiers; a small audio engine owns the shared `AudioContext`, procedural Web Audio effects, speech synthesis, active-source cleanup, the 30-second gallop buffer, and microphone-stream lifecycle. Pure catalog and paging behavior will use Node's built-in test runner, while the browser surface will receive an automated smoke check plus real-browser mobile visual and interaction verification.

The viewport uses `100dvh` with safe-area padding: twelve fixed grid slots occupy the available space above a compact navigation bar. The first page contains twelve sounds; the second contains the remaining four plus eight disabled “More sounds soon” pads. GitHub Actions will upload the static root as a Pages artifact on `main`, with `workflow_dispatch` allowing the feature branch to be deployed before merge.

First-release scope excludes recording, uploaded assets, persistence, service workers/installability, custom domains, volume controls, and impersonation of a named character or performer.

## Decision log

### 2026-09-20 — Generate the initial sound library in-browser
**Context:** The app needs distinctive effects but the repository has no licensed audio assets, and phone playback should not wait on downloads.
**Decision:** Use Web Audio synthesis for effects and the device speech synthesizer for the two spoken lines. Use a generic Western delivery for “howdy partner,” without imitating a named performer.
**Consequences:** The site stays tiny and license-safe, but effects are stylized rather than studio recordings and speech timbre varies by device.

### 2026-09-20 — Keep the first release static and dependency-light
**Context:** GitHub Pages is the deployment target and future recording support is explicitly out of the first release.
**Decision:** Prefer semantic HTML, CSS, and small JavaScript modules with a lightweight test/build setup only where it materially improves confidence.
**Consequences:** Deployment and rollback are simple; later recording persistence can be added behind the sound definition/playback boundary.

### 2026-09-20 — Use a no-build Pages artifact workflow
**Context:** The repository is empty, the site has no compilation needs, and deployment must work at a GitHub project subpath.
**Decision:** Ship source files directly and deploy the repository root with the official Pages Actions workflow. Permit manual workflow dispatch so the reviewed feature branch can be deployed without merging the draft PR.
**Consequences:** There is no generated build output or base-path configuration. Private-repository Pages eligibility remains an external account constraint to verify during deployment.

### 2026-09-20 — Define predictable playback and page behavior
**Context:** The request leaves concurrency, empty page slots, and long-running audio behavior open.
**Decision:** Different effects may overlap; replaying the same effect replaces its prior instance. Page changes do not stop audio. The gallop pad plays one 30-second run, while its corner loop toggle starts or stops a repeating 30-second run. The second page reserves eight disabled slots for future sounds.
**Consequences:** Rapid use stays expressive without stacking duplicate long effects, and later additions retain a stable 12-slot layout.

### 2026-09-20 — Treat microphone monitoring as explicit live state
**Context:** Direct speaker monitoring can feed back, while microphone tracks must be released deterministically.
**Decision:** The microphone pad toggles one stream routed through a conservative gain, displays requesting/live/error states, advises headphones, and stops all tracks when turned off or when the page exits.
**Consequences:** Monitoring persists across soundboard pages until explicitly disabled; users remain responsible for granting permission and avoiding acoustic feedback.

### 2026-09-20 — Deploy the feature branch with a temporary exact-branch trigger
**Context:** GitHub will not manually dispatch a newly added workflow until that workflow exists on the default branch, but this run must produce a live Pages site while leaving a draft PR.
**Decision:** Temporarily allow the Pages workflow to run on pushes to this exact feature branch, deploy and smoke-test the final app, then remove that branch trigger so the reviewed workflow retains only `main` and `workflow_dispatch`.
**Consequences:** The pre-merge deployment is possible without mutating `main`; the final workflow remains reusable and does not publish arbitrary branches.

## Journal

### 2026-09-20 — brady (human)
Initial scaffold.

### 2026-09-20 — Codex
Phase 0 complete: resolved `quick` with a Phase 6 plan gate, baseline draft-PR output, `origin/main`, and the personal-repo profile.

### 2026-09-20 — Codex
Phase 1 complete: confirmed the repo is an empty private GitHub repository, Pages is not configured, Actions are enabled, and microphone monitoring requires the HTTPS that Pages provides.

### 2026-09-20 — Codex
Phase 2 complete: created the minimal tracking document and captured the initial product and implementation decisions.

### 2026-09-20 — Codex
Phase 3 complete: narrow research confirmed there is no application prior art and compared no-build versus Vite scaffolds and shared-engine versus per-effect audio designs.

### 2026-09-20 — Codex
Phase 4 complete: settled the first-release scope around a no-build static app, a small shared playback boundary, fixed 12-slot pages, explicit long-running state, and an Actions-based Pages deployment.

### 2026-09-20 — Codex
Phase 5 complete: wrote the four-step default-style implementation plan covering the static shell, audio engine, mobile interactions, and Pages rollout.

### 2026-09-20 — Codex
Phase 6 complete: the single-lens plan review found two actionable gaps; revised the rollout trigger and gallop state machine, leaving no open plan findings.

### 2026-09-20 — Codex
Prepared a local-to-cloud Conductor handoff at the Phase 6 plan gate; all work is committed and the cloud session should request plan approval before implementation.

### 2026-09-20 — Codex
Cloud workspace creation returned HTTP 400 because the organization’s “Cloud computer” machine does not include this repository. No matching Conductor project exists for a project-ID fallback; retry after granting repository access in organization settings.

### 2026-09-20 — Codex
Resumed in the cloud workspace, reconciled the transferred branch and planning artifacts, and confirmed the repository-access blocker is resolved; the run remains paused at the Phase 6 plan gate.

### 2026-09-20 — Codex
Phase 6 gate approved: proceed autonomously through implementation, review, merge to `main`, and production GitHub Pages verification.
