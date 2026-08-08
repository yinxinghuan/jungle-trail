# Jungle Trail — Visual QA

## Evidence matrix

| State | 390×844 | 320×568 | Result |
|---|---|---|---|
| Live entry motion | `platform-layout-entry-preview-motion-390x844.png` | reduced-motion skips motion by contract | Pass; `running=true` and 3.6 s duration asserted |
| Entry frozen | `platform-layout-entry-frozen-390x844.png` | `platform-layout-entry-frozen-reduced-motion-320x568.png` | Pass; `running=false`, clear final frame |
| Gameplay handoff | `platform-layout-gameplay-after-entry-390x844.png` | Completion capture also verifies short control-safe layout | Pass; `running=true`, HUD visible |
| First trace nearby | `platform-layout-clue-nearby-390x844.png` | — | Pass; target range active, observation not auto-completed |
| First trace guided | `platform-layout-clue-guided-390x844.png` | — | Pass; after 4.5 s, outer notch points toward the target and copy names the metal-ringed stone |
| First trace alloy | `platform-layout-clue-alloy-390x844.png` | — | Pass; ancient alloy ring and oxidation seam are visible beside, not under, the centre reticle |
| First trace aligned | `platform-layout-clue-aligned-390x844.png` | `platform-layout-clue-aligned-reduced-motion-320x568.png` | Pass; partial progress between 0 and 1 asserted |
| First trace recorded | `platform-layout-clue-recorded-390x844.png` | `platform-layout-clue-recorded-reduced-motion-320x568.png` | Pass; `recorded`, progress 1, count 1/1 asserted |
| First trace advance signal | `platform-layout-clue-signal-390x844.png` | — | Pass; one-shot 38 m preview and positional cue asserted |
| Off-trail recovery | `platform-layout-route-recovery-390x844.png` | — | Pass; 3.2 m lateral displacement yields correct view-relative direction |
| Natural touch segment | `platform-layout-natural-input-segment-390x844.png` | — | Pass; real touch events advance, engage sprint and rotate camera without teleport/auto-walk |
| Reduced look blur | `platform-layout-look-motion-low-blur-390x844.png` | `platform-layout-look-motion-low-blur-320x568.png` | Pass; low tier is 4 taps / 0.22-frame shutter and path edges remain readable during drag |
| Look settle | `platform-layout-look-settled-low-blur-390x844.png` | — | Pass; matched frame returns to a crisp stationary image after input release |
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

### P1 — Observation projection used half the intended screen radius

- Evidence: first automated aligned capture repeatedly dropped back to nearby despite the authored stone appearing close to the center ring.
- Observation: NDC was converted to a short-side screen fraction without the required `0.5`, so the documented `9%` radius behaved as roughly `4.5%`.
- Impact: normal camera breathing could interrupt a deliberate observation and prevent completion.
- Fix: both projected axes now multiply by `0.5`; the QA harness records `clueCenterDistance` and asserts partial progress followed by exactly `1.000`.
- Recheck: 390×844 and 320×568 complete within the `1.1 s` contract while retaining the `14%` hysteresis and `0.35 s` grace.

### P1 — Basic look tutorial competed with the clue instruction

- Evidence: first clue captures showed “Drag the right side to look” beneath “Hold the stone in your gaze.”
- Observation: a player could move with the joystick without ever satisfying the earlier look tutorial, leaving both instructions active at the first clue.
- Impact: two simultaneous primary instructions weakened hierarchy and made the observation feel like an overlay rather than the next lesson.
- Fix: entering the clue range cancels the ghost demo, marks basic onboarding complete and hides its hint before the observation UI appears.
- Recheck: matched nearby, aligned and recorded captures now show one instruction only at both target sizes.

### P2 — Headless WebGL screenshots outlived transient reveal copy

- Observation: SwiftShader full-page capture could take longer than the product's `3.6 s` reveal duration.
- Impact: the functional assertion passed but the next evidence image missed the real transient copy.
- Fix: the harness first asserts the genuine recorded state and `1/1`, then replays the already implemented reveal DOM solely for the composition screenshot; product timing remains unchanged.

### P1 — Trail contour disappeared under bright leaves and deep shadow

- Evidence: the earlier gameplay and first-clue captures made the route readable only in isolated sun patches.
- Impact: mobile players could mistake foliage gaps for the route and spend attention correcting locomotion instead of investigating.
- Fix: widened the authored mud band, made its shader edge more continuous, lowered dirt albedo to `86%`, and added a coarse-input-only direction blend that never rotates the camera.
- Recheck: the deterministic steering probe stayed within `1.821 m` of the trail while progressing from `t=0.10` to `t=0.119`; the real touch segment also remained on the route.

### P1 — First clue arrived without enough advance framing

- Observation: the observation ring appeared only at `18 m`, leaving no transition from free walking to investigation.
- Impact: the first objective felt like a UI event instead of something noticed in the forest.
- Fix: at `34 m`, one restrained sentence and a positional stone sound announce that one face does not match; vegetation now preserves a low-density sightline toward the target. At close range, a single delayed enhancement helps only after `9 s` without alignment.
- Recheck: the harness asserts a `25.53 m` signal, then separately completes the original gaze interaction. The signal, observation, tutorial and route-recovery prompts are mutually exclusive.

### P2 — Full three-finger automation was not a valid proxy for a person

- Observation: Chromium changes pointer capture when a synthetic third touch is added to held joystick and sprint touches, producing misleading route stalls.
- Decision: no full-playthrough pass is claimed from that setup. Natural input evidence is scoped to independently verifying the real joystick, sprint and look handlers; route containment and clue completion remain separate deterministic runtime tests.

### P1 — Mobile frame cap and shutter made looking feel delayed

- Evidence: user online test plus the earlier motion captures, where a 30 fps hard cap was combined with 8 motion samples and a full-frame shutter.
- Impact: camera rotation looked like it continued after the thumb moved, reducing confidence when following the trail or centering the stone.
- Fix: mobile now starts with a 60 fps target; low tier uses 4 motion samples and a `0.22`-frame shutter. If low tier remains below roughly 39 fps for `1.6 s`, the renderer falls back to 30 fps instead of repeatedly missing a 60 fps budget.
- Recheck: runtime assertions report `tier=low`, `frameCap=60`, `shutter=0.22`, `motionTaps=4`; a deterministic slow-device probe falls back to `30`. Matched 390×844 moving/settled and 320×568 moving frames retain readable vegetation and trail edges.

### P1 — First trace matched the forest too closely

- Evidence: user online test plus the earlier aligned captures, where the upright stone used the same wet grey-green surface language as every ruin and the delayed help remained generic for 9 seconds.
- Impact: the teaching target required searching foliage rather than recognizing an intentional anomaly, so difficulty came from weak visual signal and UI ambiguity instead of observation skill.
- Fix: widened and raised the standing stone, expanded its low-vegetation clearing to `3.4 m`, and added a procedural warm ancient-alloy ring with a dark green oxidation seam. The physical ring sits above the semantic gaze anchor, so the 56 px HUD reticle cannot cover it. Preview/near ranges are now `38/22 m`; after `4.5 s`, a small outer notch supplies direction and copy names the metal-ringed stone.
- Recheck: `platform-layout-clue-alloy-390x844.png` shows the warm/dark metal contrast clearly against the stone; `capture-clue.mjs` completes the interaction at 390×844 and 320×568, and its helped-state assertion verifies both the directional angle and specific copy.

### P1 — Low tier spent bandwidth on low-value softness and density

- Evidence: user online report of low frame rate after motion blur had already been reduced.
- Impact: the mobile tier continued sampling full-screen depth of field and retained `62%` vegetation density while the player needed sharp path and clue edges.
- Fix: mobile vegetation density is `50%`, the procedural leaf atlas is `768²`, pixel ratio is capped at `0.72`, bloom uses 4 levels, and low-tier depth of field is completely unallocated. Motion remains the already accepted 4 taps / `0.22` frame shutter.
- Recheck: runtime assertions report `pixelRatio=0.72`, `vegetationDensity=0.5`, `leafAtlasPx=768`, `dofMaterialAllocated=false`, and preserve the adaptive `60 → 30` fallback. Motion/settled captures remain readable at both target widths.

## Scores after recheck

| Category | Score (1–5) | Notes |
|---|---:|---|
| Hierarchy | 5 | Scene and trail dominate; UI remains quiet. |
| Coherence | 5 | Forest-derived color, line and material language throughout. |
| Readability | 5 | Labels, actions and the darker continuous trail remain clear at both sizes. |
| Game feel | 4 | Input response is materially sharper and fallback is verified; final delight rating still depends on the next online device test. |
| Asset quality | 5 | Original procedural engine retained; poster is separate raster key art. |
| Responsive UX | 5 | 390×844 and 320×568 entry states pass in English/Chinese, including reduced-motion. |
| Polish | 5 | Live entry, loading, frozen wait, handoff, pause, completion and recovery share one system. |

Average: **4.9 / 5**. No category is below 3.

## Release note

- Local external-guest evidence confirms the managed visitor CTA remains usable. After deployment, both live bundles must contain the first-trace advance copy before the release is claimed complete.
