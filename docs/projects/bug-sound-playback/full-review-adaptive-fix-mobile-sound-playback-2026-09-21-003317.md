# Adaptive Full Review — Playback lifecycle fixes

**Branch:** `brady/fix-mobile-sound-playback` vs `origin/main`
**PR:** #2 · https://github.com/bradyshutt/soundboard-clownboard/pull/2
**Adaptive:** 4/6 reviews · incremental since `1eb23fb` · ceiling `high`

## TL;DR

The timer removal, suspended-context recovery, and hash-bound provenance are correct. One side effect remains: the same 30.225-second derivative is used for both one-shot and loop playback, making one-shot slightly long and introducing a loop-boundary discontinuity.

| # | Finding | Priority | Confidence | Status |
| --- | --- | --- | --- | --- |
| 1 | One-shot and loop gallop need distinct media assets | 🟠 3/5 | 5/5 | Verified (adversarial) |

## Adaptive plan

| Review | Decision | Effort | Because |
| --- | --- | --- | --- |
| correctness | run | high | Two priority-3 correctness/lifecycle fixes changed code since the last pass |
| peer-claude | skipped | — | Peer transport remains unavailable |
| security | skipped | — | No security or dependency surface changed |
| side-effect | run | high | Shared gallop and microphone lifecycle behavior changed |
| architecture | run | medium | Media lifecycle ownership and a new provenance contract changed |
| simplify | run | low | Non-trivial code was removed and replaced |
| comment-adherence | off | — | Not requested (`--comments`) |

## 🔴 Launch blockers

None — no importance-≥4 findings.

## Side effects

### 1. One-shot and loop gallop need distinct media assets

| | |
| --- | --- |
| **Location** | `assets/audio/manifest.json:18` |
| **Kind** | side effect |
| **Severity** | medium |
| **Priority** | 3/5 |
| **Confidence** | 5/5 |
| **Sources** | side-effect |
| **Status** | Verified (adversarial) |

**Suggestion**
Keep a precisely thirty-second derivative for one-shot playback and retain the original authored loop as a distinct loop-mode asset.

**Why**
Chromium decodes the derivative as 30.225 seconds, leaving the UI active beyond the stated duration; looping that trimmed derivative also jumps at a non-authored boundary every cycle.

**Additional details**
The original source decodes as 2.891 seconds and was authored to loop. The 30.225-second derivative is not an integer multiple and should not replace it for explicit loop mode.

## Review outcomes

| Review | Result |
| --- | --- |
| correctness (Codex native) | clean |
| peer-claude | skipped — no configured transport |
| security | skipped — no security surface |
| side-effect | 1 finding |
| architecture | clean |
| simplify (report-only) | clean |
| comment-adherence | off (no `--comments`) |
| adversarial-verify | 1 held, 0 refuted |
| **Total** | **1 finding** |

_Report only — no changes were applied._
