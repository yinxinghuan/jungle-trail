# Jungle Trail — Visual QA

## Evidence matrix

| State | 390×844 | 320×568 | Result |
|---|---|---|---|
| Entry | `platform-layout-entry-390x844.png` | Responsive rules inspected in final short viewport | Pass |
| Gameplay | `platform-layout-gameplay-390x844.png` | Completion capture also verifies short control-safe layout | Pass |
| Ghost look demo | `platform-layout-ghost-look-390x844.png` | — | Pass; finger and real camera motion visible together |
| Pause | `platform-layout-pause-390x844.png` | Panel width is fluid with 18 px side inset | Pass |
| Completion first pass | `platform-layout-complete-first-pass-390x844.png` | `platform-layout-complete-first-pass-320x568.png` | P1 found |
| Completion recheck | `platform-layout-complete-390x844.png` | `platform-layout-complete-320x568.png` | Pass |
| External guest | `external-guest-entry-390x844.png` | — | Local extension did not mount; repeat on formal URL |

## Findings and fixes

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
| Responsive UX | 4 | 390×844 and 320×568 pass; desktop controls remain upstream-compatible. |
| Polish | 4 | Entry, loading, pause, completion and recovery share one system. |

Average: **4.4 / 5**. No category is below 3.

## Remaining release-only evidence

- `guest-shell.js` does not install its external visitor banner on localhost, so the local `external-guest` image is not proof of the final CTA state.
- After deployment, capture the ordinary public URL with the banner visible and repeat platform-layout captures with the banner hidden only in the QA harness.
