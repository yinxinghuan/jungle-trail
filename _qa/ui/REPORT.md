# Jungle Trail — Visual QA

## Evidence matrix

| State | 390×844 | 320×568 | Result |
|---|---|---|---|
| Live entry motion | `platform-layout-entry-preview-motion-390x844.png` | reduced-motion skips motion by contract | Pass; `running=true` and 3.6 s duration asserted |
| Entry frozen | `platform-layout-entry-frozen-390x844.png` | `platform-layout-entry-frozen-reduced-motion-320x568.png` | Pass; `running=false`, clear final frame |
| Gameplay handoff | `platform-layout-gameplay-after-entry-390x844.png` | Completion capture also verifies short control-safe layout | Pass; `running=true`, HUD visible |
| Ghost look demo | `platform-layout-ghost-look-390x844.png` | — | Pass; finger and real camera motion visible together |
| Pause | `platform-layout-pause-390x844.png` | Panel width is fluid with 18 px side inset | Pass |
| Completion first pass | `platform-layout-complete-first-pass-390x844.png` | `platform-layout-complete-first-pass-320x568.png` | P1 found |
| Completion recheck | `platform-layout-complete-390x844.png` | `platform-layout-complete-320x568.png` | Pass |
| External guest | `external-guest-entry-preview-motion-390x844.png` | — | Pass; managed CTA remains usable over live entry |

## Findings and fixes

### P1 — First frozen entry retained camera-motion blur

- Evidence: first `platform-layout-entry-frozen-390x844.png` capture after the live-entry change.
- Observation: the scene had stopped, but the retained WebGL frame still carried the post-process motion smear from the last camera step.
- Impact: the new first impression looked soft and accidental instead of cinematic.
- Fix: `Game.stop()` now cancels the preview RAF, then six stationary renders settle the camera history before the frame is retained.
- Recheck: final motion and frozen captures are visibly distinct; the frozen forest, path and leaf edges are clear, and the harness asserts `running=false`.

### P2 — QA could miss the short preview state

- Observation: waiting for `networkidle` allowed the 3.6 s preview to finish before Playwright could inspect it on a slow headless build.
- Impact: a valid product state could not be distinguished from an immediate freeze.
- Fix: the entry now includes a 0.6 s establishing hold and records motion/freeze timestamps; the harness observes from `domcontentloaded` and asserts at least 3.5 s of motion before freeze.
- Recheck: capture logged `previewState=motion`, `running=true`, then passed the frozen and entered state assertions.

### P1 — Completion UI overlapped onboarding and controls

- Evidence: both `platform-layout-complete-first-pass-*` captures.
- Observation: the look hint crossed the completion title and faded controls remained visible behind the 320×568 buttons.
- Impact: the payoff read as an unfinished stacked state.
- Fix: completion now hides the onboarding hint and fades the entire touch-control group to zero with pointer events disabled.
- Recheck: both final completion captures show only the waterfall, quiet HUD and two result actions.

### P2 — Onboarding skipped movement instruction

- Observation: the initial look hint disappeared after the first camera drag.
- Impact: a new player could discover observation but not forward movement.
- Fix: onboarding is now sequential: right-side look → left-circle move → dismiss.
- Recheck: onboarding now drives the real `Walker.lookBy()` and analogue movement APIs. `platform-layout-ghost-look-390x844.png` shows the shared finger while the forest has real camera-motion blur; slow-frame progress is capped so the demo cannot skip its visible middle state.

## Scores after recheck

| Category | Score (1–5) | Notes |
|---|---:|---|
| Hierarchy | 5 | Scene and trail dominate; UI remains quiet. |
| Coherence | 5 | Forest-derived color, line and material language throughout. |
| Readability | 4 | Labels and actions remain clear at both sizes. |
| Game feel | 4 | Analogue movement, immediate look, jump/sprint and spatial audio are coordinated. |
| Asset quality | 5 | Original procedural engine retained; poster is separate raster key art. |
| Responsive UX | 5 | 390×844 and 320×568 entry states pass in English/Chinese, including reduced-motion. |
| Polish | 5 | Live entry, loading, frozen wait, handoff, pause, completion and recovery share one system. |

Average: **4.7 / 5**. No category is below 3.

## Release note

- Local external-guest evidence confirms the managed visitor CTA remains usable. After deployment, the live bundle still requires the standard two-address unique-string check.
