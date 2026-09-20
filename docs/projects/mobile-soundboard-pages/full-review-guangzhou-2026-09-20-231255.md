# Full Review — Mobile Clownboard soundboard

**Branch:** `brady/guangzhou` vs `origin/main`
**PR:** #1 · https://github.com/bradyshutt/soundboard-clownboard/pull/1
**Scope:** committed (22 commits, 14 files, +1730/−0) · **Effort:** medium (quick config) · **Security:** skipped (static dependency-free client) · **Comments:** off
**Reviews run:** correctness (Codex native) · architecture · side-effect · simplify · adversarial verification

---

## TL;DR

The branch delivers the intended mobile soundboard with sound module boundaries that are appropriate for its size. Three browser lifecycle/concurrency behaviors should be fixed before release; the remaining findings concern future deployment enforcement and a safe cleanup.

| # | Finding | Priority | Confidence | Status |
| --- | --- | --- | --- | --- |
| 1 | Back-forward cache restores a disposed app | 🟠 3/5 | 5/5 | Verified (adversarial) |
| 2 | Concurrent first-use loop taps leave looping enabled | 🟠 3/5 | 5/5 | Verified (adversarial) |
| 3 | Replaying one speech effect cancels the other | 🟡 2/5 | 5/5 | Verified (adversarial) |
| 4 | Production publishing has no enforced verification gate | 🟡 2/5 | 4/5 | Verified (source) |
| 5 | Audio nodes are tracked in duplicate registries | ⚪ 1/5 | 4/5 | — |

Priority legend: 🔴 launch blocker (≥4) · 🟠 fix before release (3) · 🟡 fast-follow (2) · ⚪ optional cleanup (1)

---

## Decision themes

No findings share a product decision: #1–#3 are concrete correctness fixes, #4 is a future delivery-process tradeoff, and #5 is an independent cleanup. Decide individually.

---

## 🔴 Launch blockers

None — no importance-≥4 findings.

## Correctness & bugs

### 1. Back-forward cache restores a disposed app

| | |
| --- | --- |
| **Location** | [`src/app.js:228`](https://github.com/bradyshutt/soundboard-clownboard/pull/1/files#diff-c72a907ac323cd2f334ed0e2bd07d15ab62581c4753660c8a0d1c681b30be4b6R228) |
| **Kind** | correctness |
| **Severity** | medium |
| **Priority** | 3/5 |
| **Confidence** | 5/5 |
| **Sources** | correctness |
| **Status** | Verified (adversarial) |

**Disposition:** fixed — commit `9e4be70` releases reusable audio on persisted `pagehide` and keeps the mounted app valid for bfcache restoration.

**Suggestion**
On `pagehide`, release live resources without permanently invalidating restored handlers, or detect `event.persisted` and remount/reinitialize on the matching `pageshow`.

**Why**
A user who navigates away and returns with the browser back button sees normal controls, but every sound and microphone action fails until a hard reload.

**Additional details**
The once-only handler disposes the captured `AudioEngine`; bfcache restores that same document and its event handlers without re-running the module, and the engine then rejects every attempt with `Audio engine has been disposed`.

### 2. Concurrent first-use loop taps leave looping enabled

| | |
| --- | --- |
| **Location** | [`src/audio-engine.js:367`](https://github.com/bradyshutt/soundboard-clownboard/pull/1/files#diff-955ea3c9db065675bc9d0dfd1d10748a5c11d130c685438efff7d3fdffb3a2d5R367) |
| **Kind** | correctness |
| **Severity** | medium |
| **Priority** | 3/5 |
| **Confidence** | 5/5 |
| **Sources** | correctness |
| **Status** | Verified (adversarial) |

**Disposition:** fixed — commit `9e4be70` tracks pending loop intent synchronously and adds a concurrent first-use double-tap regression test.

**Suggestion**
Serialize gallop loop transitions or track the latest requested loop intent across the initial asynchronous context resume, and add a concurrent-first-use regression test.

**Why**
A rapid double tap on the first use should toggle the loop back off, but instead leaves a 30-second loop running.

**Additional details**
Both calls observe `gallopMode === "off"` before awaiting `ensureContext()`. When resume resolves, both start a loop; the second replaces the first and remains active.

### 3. Replaying one speech effect cancels the other

| | |
| --- | --- |
| **Location** | [`src/audio-engine.js:395`](https://github.com/bradyshutt/soundboard-clownboard/pull/1/files#diff-955ea3c9db065675bc9d0dfd1d10748a5c11d130c685438efff7d3fdffb3a2d5R395) |
| **Kind** | correctness |
| **Severity** | medium |
| **Priority** | 2/5 |
| **Confidence** | 5/5 |
| **Sources** | correctness |
| **Status** | Verified (adversarial) |

**Disposition:** fixed — commit `9e4be70` models device speech as one explicit global channel; the living doc now records that spoken phrases replace one another.

**Suggestion**
Model Web Speech as the one global queue it actually is: either make new speech replace all speech explicitly and document/test that exception, or synthesize speech through independently stoppable audio sources.

**Why**
Rapidly replaying “Yee-Haw” can unexpectedly cut off “Howdy Partner,” contradicting the stated different-sound overlap behavior.

**Additional details**
`speechSynthesis.cancel()` immediately stops the current utterance and removes the whole queue, but it is stored as if it were a per-ID stop handle.

## Architecture

### 4. Production publishing has no enforced verification gate

| | |
| --- | --- |
| **Location** | [`README.md:28`](https://github.com/bradyshutt/soundboard-clownboard/pull/1/files#diff-b335630551682c19a781afebcf4d07bf978fb1f8ac04c6bf87428ed5106870f5R28) |
| **Kind** | architecture |
| **Severity** | n/a |
| **Priority** | 2/5 |
| **Confidence** | 4/5 |
| **Sources** | architecture |
| **Status** | Verified (source) |

**Disposition:** deferred — the cloud credential cannot add workflow files without `workflow` scope. This release remains gated by local tests plus preview/production smoke tests; the future CI improvement is carried to closeout.

**Suggestion**
When a credential with workflow-write scope is available, add a required check for `npm test` and `npm run check`, or move production Pages back to an artifact workflow gated by those commands.

**Why**
The current change is manually verified, but a future broken commit to `main` would be published automatically without a mechanical test gate.

**Additional details**
Branch-source Pages directly republishes `main`; the verification commands currently exist as human instructions only because this workspace credential cannot add workflow files.

## Code cleanup / simplify

- **#5** [`src/audio-engine.js:63`](https://github.com/bradyshutt/soundboard-clownboard/pull/1/files#diff-955ea3c9db065675bc9d0dfd1d10748a5c11d130c685438efff7d3fdffb3a2d5R63) — Audio nodes are tracked in duplicate registries. Keep one collection and defensively call optional `stop()` and `disconnect()` methods during teardown. **Disposition:** fixed — commit `9e4be70` uses one node registry. _(source: simplify)_

---

## Review outcomes

| Review | Result | Cost |
| --- | --- | --- |
| correctness (Codex native) | 3 findings | — |
| peer-claude (Conductor fallback) | unavailable: no configured Claude credential | — |
| security | skipped: static dependency-free client | — |
| side-effect | clean | — |
| architecture | 1 finding | — |
| simplify (report-only) | 1 cleanup | — |
| comment-adherence | off: no `--comments` | — |
| adversarial-verify | 3 verified, 3 held, 0 refuted | — |
| **Total** | **5 findings** | **—** |

The peer pass could not run: the direct Claude CLI is unauthenticated and Conductor has no Claude credentials configured. Repository integrity checks passed before and after all reviewers.

_Report only — no changes were applied._
