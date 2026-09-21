# Full Review — Accurate sound recordings

**Branch:** `brady/fix-mobile-sound-playback` vs `origin/main`
**PR:** #2 · https://github.com/bradyshutt/soundboard-clownboard/pull/2
**Scope:** committed (13 recorded effects plus playback wiring, tests, and provenance) · **Effort:** high · **Security:** clean · **Comments:** off
**Reviews run:** correctness · architecture · side-effect · simplify · security · adversarial verification

---

## TL;DR

The recording-backed design fixes the semantic-fidelity defect and preserves synchronous, gesture-safe playback. Two lifecycle gaps should be fixed before release: the thirty-second gallop still relies on a throttled JavaScript timer, and recording taps no longer wake a suspended microphone audio context. Provenance should also be made mechanically inseparable from the shipped bytes.

| # | Finding | Priority | Confidence | Status |
| --- | --- | --- | --- | --- |
| 1 | Gallop duration is split across media and a throttled timer | 🟠 3/5 | 5/5 | Verified (source) |
| 2 | Recording taps do not resume a suspended microphone context | 🟠 3/5 | 4/5 | Verified (source) |
| 3 | Provenance is not bound to the shipped asset bytes | 🟡 2/5 | 5/5 | Verified (source) |

Priority legend: 🔴 launch blocker (≥4) · 🟠 fix before release (3) · 🟡 fast-follow (2) · ⚪ optional cleanup (1)

---

## 🔴 Launch blockers

None — no importance-≥4 findings.

## Correctness & bugs

### 1. Gallop duration is split across media and a throttled timer

| | |
| --- | --- |
| **Location** | `src/audio-engine.js:21`, `src/audio-engine.js:27`, `src/audio-engine.js:56` |
| **Kind** | correctness / architecture |
| **Priority** | 3/5 |
| **Confidence** | 5/5 |
| **Sources** | correctness, architecture |
| **Status** | Verified (source) |

**Suggestion**
Ship a naturally thirty-second gallop recording for one-shot playback, let its media `ended` event own completion, and reserve `loop` for explicit loop mode.

**Why**
Mobile browsers can defer JavaScript timers while backgrounded or under power pressure, so the current one-shot can audibly exceed thirty seconds even though its unit-test clock fires exactly on schedule.

### 2. Recording taps do not resume a suspended microphone context

| | |
| --- | --- |
| **Location** | `src/audio-engine.js:162` |
| **Kind** | side effect |
| **Priority** | 3/5 |
| **Confidence** | 4/5 |
| **Sources** | side-effect |
| **Status** | Verified (source) |

**Suggestion**
When a live Web Audio context already exists and is suspended, use every explicit playback gesture to request its resume without delaying the synchronous `HTMLAudioElement.play()` call.

**Why**
The recording continues to play, but live microphone monitoring can remain silent even though the UI still says it is live. The former procedural path resumed the shared context on every pad gesture; the new media path bypasses it entirely.

## Architecture

### 3. Provenance is not bound to the shipped asset bytes

| | |
| --- | --- |
| **Location** | `assets/audio/README.md:3` |
| **Kind** | architecture / integrity |
| **Priority** | 2/5 |
| **Confidence** | 5/5 |
| **Sources** | architecture |
| **Status** | Verified (source) |

**Suggestion**
Add a structured manifest containing source, creator, license, and SHA-256 for every recording, then validate catalog coverage and hashes in tests.

**Why**
The prose currently claims every file is an unchanged CC0 preview, but a future asset replacement can leave that claim stale with no failing check.

## Review outcomes

| Review | Result |
| --- | --- |
| correctness | 1 finding |
| peer-claude | unavailable: local CLI unauthenticated and no Conductor Claude credential |
| security | clean |
| side-effect | 1 finding |
| architecture | 2 findings, one merged with correctness |
| simplify | clean |
| comment-adherence | off: no `--comments` |
| adversarial-verify | 3 held, 0 refuted |
| **Total** | **3 findings** |

_Report only — no changes were applied._
