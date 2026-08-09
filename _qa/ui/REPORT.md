# Jungle Trail — Visual QA

## Evidence matrix

| State | 390×844 | 320×568 | Result |
|---|---|---|---|
| Live entry motion | `platform-layout-entry-preview-motion-390x844.png` | reduced-motion skips motion by contract | Pass; `running=true` and 3.6 s duration asserted |
| Entry frozen | `platform-layout-entry-frozen-390x844.png` | `platform-layout-entry-frozen-reduced-motion-320x568.png` | Pass; `running=false`, clear final frame |
| Gameplay handoff | `platform-layout-gameplay-after-entry-390x844.png` | Completion capture also verifies short control-safe layout | Pass; `running=true`, HUD visible |
| Field instrument HUD | `platform-layout-field-hud-390x844.png` | `platform-layout-field-hud-320x568.png` | Pass; chapter, landmark and route remain structured while map/sound/pause/jump use readable unframed white icons over the live scene |
| Live field map | `platform-layout-field-map-390x844.png` | `platform-layout-field-map-320x568.png` | Pass; map occupies the sheet, real sampled route/position/heading, five landmarks, terrain references, three evidence nodes, one objective and one trace count; paused, no overflow |
| Map cardinal headings | `platform-layout-map-heading-north-390x844.png`, `platform-layout-map-heading-east-390x844.png` | `platform-layout-map-heading-north-320x568.png` | Pass; camera north/west/east/south maps exactly to paper 0/-90/90/±180° with a centre dot and one outward arrow |
| Jump apex | `platform-layout-jump-apex-390x844.png` | deterministic 320×568 physics uses the same constants | Pass; live fixed-step peak 0.701 m and airborne time 0.758 s |
| Progressed field map | `platform-layout-field-map-ruins-390x844.png` | narrow map uses the same responsive SVG | Pass; at `t=0.78`, next landmark becomes Water gate (~20 m), the traced route changes to brass and the player moves to the real northern ruins position |
| First trace nearby | `platform-layout-clue-nearby-390x844.png` | — | Pass; target range active, observation not auto-completed |
| First trace guided | `platform-layout-clue-guided-390x844.png` | — | Pass; after 4.5 s, outer notch points toward the target and copy names the metal-ringed stone |
| First trace alloy | `platform-layout-clue-alloy-390x844.png` | — | Pass; ancient alloy ring and oxidation seam are visible beside, not under, the centre reticle |
| First trace aligned | `platform-layout-clue-aligned-390x844.png` | `platform-layout-clue-aligned-reduced-motion-320x568.png` | Pass; partial progress between 0 and 1 asserted |
| First trace recorded | `platform-layout-clue-recorded-390x844.png` | `platform-layout-clue-recorded-reduced-motion-320x568.png` | Pass; `recorded`, progress 1, count 1/1 asserted |
| First trace advance signal | `platform-layout-clue-signal-390x844.png` | — | Pass; one-shot 38 m preview and positional cue asserted |
| Off-trail recovery | `platform-layout-route-recovery-390x844.png` | — | Pass; 3.2 m lateral displacement yields correct view-relative direction |
| Natural touch segment | `platform-layout-natural-input-segment-390x844.png` | — | Pass; real touch events transition from walk to fast walk and rotate camera without teleport/auto-walk |
| Full-width look zone | `platform-layout-look-zone-hint-390x844.png` | `platform-layout-look-zone-hint-320x568.png` | Pass; upper 68% spans the viewport, left/centre/right drags rotate, lower controls and map button do not leak, and two-finger move + look remains independent |
| Reduced look blur | `platform-layout-look-motion-low-blur-390x844.png` | `platform-layout-look-motion-low-blur-320x568.png` | Pass; low tier is 4 taps / 0.22-frame shutter and path edges remain readable during drag |
| Look settle | `platform-layout-look-settled-low-blur-390x844.png` | — | Pass; matched frame returns to a crisp stationary image after input release |
| Ghost look demo | `platform-layout-ghost-look-390x844.png` | — | Pass; finger and real camera motion visible together |
| Pause | `platform-layout-pause-390x844.png` | Panel width is fluid with 18 px side inset | Pass |
| Completion first pass | `platform-layout-complete-first-pass-390x844.png` | `platform-layout-complete-first-pass-320x568.png` | P1 found |
| Completion recheck | `platform-layout-complete-390x844.png` | `platform-layout-complete-320x568.png` | Pass |
| External guest | `external-guest-entry-preview-motion-390x844.png`, `external-guest-field-hud-390x844.png`, `external-guest-field-map-390x844.png` | — | Pass; managed CTA remains visible, lower gameplay controls stay usable, and the opened map retains its close control and objective beneath the external-only overlay |

## Findings and fixes

### P1 — Map heading compounded camera yaw with the route tangent using the wrong sign

- Evidence: the user's online report plus the old `mapTangentAngle + (walkerYaw - routeYaw)` calculation.
- Observation: the marker could appear aligned while following one bend, then rotate opposite to the player's view after turning because paper tangent and world yaw used different X-axis signs.
- Impact: the most important orientation cue contradicted movement and made both the map and the controls feel unreliable.
- Fix: removed route-relative angle composition. The marker now uses a fixed position dot and one outward arrow driven directly by the camera world-forward vector; north, west, east and south have explicit unit and runtime contracts.
- Recheck: actual SVG rotations are `0 / -90 / 90 / -180°` at both target viewports. Matched north/east captures keep the marker at the same trailhead position while only the arrow changes direction.

### P1 — Paper material added an unexplained dark horizontal line

- Evidence: the previous map captures and the user's comparison with the fold-out reference.
- Observation: a synthetic 50% horizontal gradient crossed the route and read as a black seam, although the reference's material volume comes primarily from vertical accordion panels.
- Impact: the line looked like a rendering defect and weakened the physical-paper illusion.
- Fix: removed the horizontal gradient completely and rebuilt the surface as five broad vertical light-facing panels separated by paired narrow highlights and soft brown shadows.
- Recheck: final 390×844 and 320×568 map captures contain no computed `180deg` fold layer and no dark line through the route centre.

### P2 — Jump and map entry understated available actions

- Observation: the former `3.05 m/s` takeoff peaked near `0.47 m`, while the large chapter/route instrument looked tappable but only the small map icon opened the map.
- Impact: jumping felt ineffective around roots and stones, and the map had a needlessly narrow discovery target.
- Fix: raised takeoff to `3.75 m/s` for a `0.72 m` theoretical peak, retaining the short anticipation and grounded landing; converted the full `290×72 / 215×63 px` top instrument into a semantic map button with press/focus feedback and shared focus restoration.
- Recheck: deterministic live simulation measures `0.701 m` and `0.758 s`; both HUD target sizes open the map and expose `aria-expanded=true` without leaking input to the camera.

### P1 — Right-only look input felt indistinguishable from a frozen camera

- Evidence: the previous `62%`-wide right-side hit region and the user's online interaction report.
- Observation: a drag beginning on the left or centre of the scene produced no response even though those areas looked identical to the active right side.
- Impact: players could reasonably conclude that camera rotation was broken before discovering an invisible boundary.
- Fix: expanded the camera drag surface to the full width of the upper `68%` of the viewport, moved the real HUD buttons above it, and reserved the lower `32%` for movement, jump and hand rest. The onboarding hand now crosses the scene centre and the bilingual prompt says to drag the upper scene rather than the right side.
- Recheck: at both 390×844 and 320×568, real touch drags from left, centre and right changed yaw by `0.15–0.22 rad`; the lower-zone and map-button leakage were exactly `0`. A simultaneous joystick + camera gesture retained `75–92%` forward input while rotating the view.

### P1 — Framed action controls interrupted the rainforest scene

- Evidence: the gameplay HUD before this revision and the user's white icon reference.
- Observation: the map, sound and pause controls sat inside a bordered dark rail, while jump used a second circular plate and visible text.
- Impact: five persistent boundaries read as a floating utility panel and competed with the scene whenever the player moved or looked around.
- Fix: removed the rail, borders, corner marks, blur plates and jump label from the live scene. The four actions now use one white rounded-stroke SVG language with restrained dark shadows; their transparent `44–74 px` hit regions, keyboard focus outline, accessible names and press-scale feedback remain intact. The map close button stays framed because it belongs to the paper surface rather than the immersive HUD.
- Recheck: matched 390×844 and 320×568 captures keep every icon readable over both bright sky and dark foliage, report no viewport overflow and preserve minimum target sizes of `44 / 44 / 44 / 66–74 px`.

### P1 — Mobile fast movement required a second held button

- Observation: the analogue stick only scaled a walking pace; reaching the faster gait required holding a separate sprint button with another finger.
- Impact: steering and speed selection felt disconnected, occupied both thumbs, and made precise transitions harder.
- Fix: the stick now uses a continuous `12–62–100%` response curve from dead zone through walk to fast walk. The sprint button is removed; the dashed inner ring and text label expose the current pace without adding another action.
- Recheck: `test/gait.test.js` proves the curve is continuous and monotonic. `_qa/playthrough-input.mjs` measured `1.03 m/s` at 54% displacement and `2.72 m/s` at full displacement while staying on the trail.

### P1 — HUD read as a functional prototype instead of an expedition tool

- Observation: two plain text rows and circular buttons carried too little hierarchy or world identity; there was no place to inspect the route.
- Impact: the strong procedural scene and the interface felt authored at different levels of finish.
- Fix: replaced the header with a bracketed field instrument showing chapter, landmark, route percent and evidence; added a coherent map/sound/pause tool group and a functional folding survey map. The map projects real world anchors through `Trail.nearest()` rather than using a decorative screenshot.
- Recheck: both target sizes show no page overflow, every action is at least 44 px, opening the map pauses the world, and exactly three live evidence states render. The first 320×568 pass placed the pace label too close to the lower edge; controls were raised 10 px and the matched state was recaptured.

### P1 — Field map had no world references

- Evidence: the first `platform-layout-field-map-*` pair from commit `aa4b7c4`.
- Observation: one abstract dotted curve and three diamonds conveyed progress but not place; there was nothing a player could match to the stream, forest, ruins or water gate they had seen.
- Impact: opening the map did not improve orientation and read as a decorative level-select illustration.
- Fix: added five real chapter landmarks at the same progress thresholds used by the HUD, distinct landmark glyphs, dense-canopy regions, stream, ruin footprint, terminal pool, contours, grid, north marker and scale. The live readout now reports current sector, next named landmark and estimated remaining distance; the player pin rotates relative to the trail.
- Recheck: automated states assert five landmarks and three evidence pins. At the trailhead the map reports Deep forest (~110 m); at `t=0.78` it reports Ruins approach and Water gate (~20 m), with a changed translated/rotated player transform.

### P1 — Decorative route shape was not a spatially accurate map

- Evidence: the map released in commit `eecfb9b` used one fixed S-shaped SVG for every chapter.
- Observation: evidence and player state were reduced to progress `t` and placed along that illustration; route order and distance were useful, but bends, cross-track position and chapter-to-chapter route variants were not represented.
- Impact: the interface looked more map-like than it actually was and could teach a false mental model of the forest.
- Fix: the map now samples the current chapter's real `Trail.samples`, preserves one metre scale on both axes, fixes world `-Z` as north, and projects `walker.pos` plus evidence anchor `x/z` directly. The static stream illustration was removed because it did not have matching world-coordinate data.
- Recheck: the harness asserts more than 50 line segments in the generated route. The start pin appears at the southern trailhead; at `t=0.78` the pin is above SVG `y=150` in the northern ruins sector. The 100 m scale uses the same projection scale.

### P1 — Map surface read as a rough utility panel

- Evidence: the first landmark-rich map pair from commit `eecfb9b`.
- Observation: the clipped paper, two-column split and plain text list had useful content but little material hierarchy; the narrow map column also reduced the value of newly added references.
- Impact: it felt one finish level below the procedural world and did not match the user's field-map references.
- Fix: changed the structure to a single fold-out survey sheet with four paper creases, fibrous print texture, double registration frame, folio mark and survey seal. The map is full-width; objective, sector and traces form a compact measured band beneath it.
- Recheck: matched 390×844 and 320×568 captures show the full true route, readable English/Chinese labels, no page overflow, zero horizontal sheet scroll and all controls at least 44 px.

### P2 — Central fold still read as a decorative book spine

- Evidence: the first fold-out map capture from commit `d0da0cb`.
- Observation: a darker centre crease, left/right paper colour split and matching notches at the top and bottom made the single map look like two bound pages.
- Impact: the surface implied a page-turning function that does not exist and competed visually with the true route running near the centre.
- Fix: removed the centre spine, centre notches and page-to-page colour split. The paper now has two equally light vertical fold marks plus one shallow horizontal fold, matching a single field map.
- Recheck: matched 390×844 and 320×568 captures retain the continuous outer frame and complete route without a dark line underneath it.

### P1 — Map information density forced important text too small

- Evidence: the user capture from commit `c9da7b5` and the matched field-map captures.
- Observation: current sector, next landmark, three textual trace states and the four-chapter rail repeated information already available in the scene, HUD and entry screen. Utility copy fell to 7–10 px on the narrow viewport.
- Impact: the eye had no clear order and the map felt like a report dashboard instead of a quick orientation tool.
- Fix: removed the repeated sector, per-trace text list and chapter rail. The page now answers only position, route, next landmark and total traces; the route drawing receives roughly 80% of the sheet, the objective is 15–16 px and the trace counter is 11–12 px.
- Recheck: matched 390×844 and 320×568 captures show one compact footer band, no horizontal or document overflow, five landmark nodes, three evidence nodes and controls at least 44 px.

### P1 — Fold marks had no broad light-facing surfaces

- Evidence: the user capture from commit `c9da7b5`.
- Observation: two low-opacity lines described crease positions, but the paper on both sides had nearly the same value.
- Impact: the sheet read as one flat panel rather than a field map that had been folded and opened.
- Fix: rebuilt the material as three broad vertical facets with alternating light exposure, a narrow highlight/shadow pair at each valley/ridge and a weaker horizontal fold. The facets affect the whole paper surface while the border stays continuous, so no crease reads as a book spine.
- Recheck: both target captures visibly preserve the light–dark–light panel rhythm through the header, route and footer; the horizontal fold remains subordinate to route information.

### P1 — Upper landmark labels overlapped

- Evidence: first enhanced 390×844 and 320×568 map captures.
- Observation: Ruins, Water gate and Falls occupy a deliberately compressed final route segment, so labels placed directly beside each node collided.
- Impact: the newly added references became least readable where the map was most information-dense.
- Fix: assigned alternating sides and staggered vertical offsets with leader lines; moved the low-priority ruin-platform terrain caption beneath the structure footprint.
- Recheck: final start and ruins-progress captures keep all three names separate at both target widths.

### P1 — Reopening the map could horizontally crop the sheet

- Evidence: first `platform-layout-field-map-ruins-390x844.png`.
- Observation: the scrollable paper retained a horizontal focus scroll when the close button regained focus, clipping the title and left map edge on the next open.
- Impact: a normal open → close → move → open sequence could make the map look broken.
- Fix: disable horizontal scrolling, focus the close control with `preventScroll`, and reset `scrollLeft` whenever the map opens.
- Recheck: the repeated-open harness reports `sheetOverflowX=0`, `sheetScrollLeft=0`; the matched progressed capture shows the full paper and title.

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
- Fix: onboarding is now sequential: upper-scene look → left-circle move → dismiss.
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

- Historical observation: Chromium changed pointer capture when a synthetic third touch was added to the old held joystick and sprint-button combination, producing misleading route stalls.
- Current resolution: the sprint button no longer exists. Natural input evidence now drives one analogue stick through walk and fast-walk bands, then independently verifies look; route containment and clue completion remain separate deterministic runtime tests.

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
# Full Expedition QA · 2026-08-08

- P1 首轮：证据圆环错误旋转为水平面；修复为面向观察轴。
- P1 首轮：终章中央实体遮住瀑布；修复为两侧承重、中央开放的 22 m 水源框架。
- P1 首轮：双塔间距超出手机竖屏水平视场；由 16.8 m 收紧到 8 m，保持 14 m 塔高并复拍观察轴。
- Platform-layout：入口 390×844、入口 320×568、游戏中、暂停、结算和测绘挑战均无页面溢出；关键按钮不低于 44 px。
- External-guest：访客登录扩展可关闭；没有为外部覆盖修改平台内相机或 HUD。
- Low 画质：运动模糊与景深均关闭；四章当前 scene calls 约 388–412，章节地标本身为 0–4 个合并批次，无新增全屏 pass。
- 匹配复验证据：`shots/qa2-*`、`shots/qa3-ch3`；产品状态证据：本目录新增 `platform-layout-*-{entry,gameplay,pause,complete,survey}-*.png`。

# Route Collision Safety QA · 2026-08-09

### P0 — 程序倒木、树干和板根侵入道路形成隐形阻断

- 修复前证据：`platform-layout-route-blocked-before-390x844.png`。第一章约 `t=0.554` 的道路被硬质植被代理截断，玩家必须离开道路绕行。
- 根因：植被生成只按实例中心到路线的距离决定是否接受；长倒木和板根即使中心在路外，变换后的胶囊仍可能伸进道路。模型又会部分埋入落叶与草丛，导致碰撞边界不可读。
- 修复：对倒木、树干、棕榈和板根的真实世界坐标碰撞代理进行采样，实体表面必须离路线中心至少 `0.9 m`；不合格实例同时从渲染和碰撞注册中剔除。
- 四章移动密度回归：中心线玩家净空最低分别为 `0.673 / 0.924 / 0.895 / 1.231 m`；桌面高密度分别为 `0.975 / 0.999 / 0.818 / 0.701 m`。两档要求均为 `0.562 m`，陡坡阻断均为 `0`。
- 匹配复验：`platform-layout-route-clear-after-390x844.png` 显示故障位置恢复连续泥路，同时保留两侧多层植被；`platform-layout-source-route-clear-after-320x568.png` 验证终章在最窄目标尺寸仍保持雨林密度和可读通路。

### P0 — 遗迹入口的可见泥路本身不连续

- 二次审计：清除硬质植被后，四章仍在约 `t=0.82–0.85` 被遗迹石块切断；第一、二章还会在 `t≈0.906` 被松散石堆截断。玩家虽然可以从更外侧绕行，但必须离开画面表达的道路。
- 修复：清理区宽度在遗迹门出现前由 `t=0.78–0.86` 展开；第三、四章在 `z≈-301` 提前汇入门洞轴线；三组松散石块生成时保留 `1.0 m` 路线表面间距，并把终点前独立石板移到路侧。所有保留石块继续使用真实碰撞。
- 回归方法：在每章路线坐标中以 28 cm 横向步长做分层连通搜索，使用真实道路宽度、地形坡度、玩家半径及完整碰撞注册；移动和桌面两档四章均从起点连通到 `t=0.955`，没有进入路外丛林。
- 画面复验：`platform-layout-ruin-gate-clear-after-390x844.png` 与 `platform-layout-source-gate-clear-after-320x568.png` 均保留前景巨石，同时在其右侧形成清楚泥路；`platform-layout-listening-axis-clear-after-390x844.png` 验证清理区到双塔轴线连续。

## 修复后评分

| Category | Score (1–5) | Notes |
|---|---:|---|
| Hierarchy | 5 | 泥路重新成为自然前进方向。 |
| Coherence | 5 | 只拒绝侵入安全通道的实例，没有增加人工护栏或提示线。 |
| Readability | 5 | 390×844 与 320×568 均能辨认连续路线。 |
| Game feel | 5 | 四章真实碰撞注册均保留至少 0.56 m 玩家净空，且可见泥路全程连通。 |
| Asset quality | 5 | 程序植被语言不变，路侧倒木与板根继续存在。 |
| Responsive UX | 5 | 窄屏通路与此前 HUD 构图均无回归。 |
| Polish | 5 | 修复发生在生成与碰撞合同层，不依赖关卡特例。 |

Average: **5.0 / 5**。无 P0/P1 遗留。
