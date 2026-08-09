# 技术文档

## 1. 技术栈

- JavaScript ES modules、Three.js `0.170.0`、WebGL 2、GLSL、Web Audio 与 Vite `5.4.x`。
- Vite `base: './'` 生成可部署到任意子路径的 `dist/`；运行时不依赖传统图片、模型、录音或关卡包。
- DOM/CSS 提供实时场景入口、四章导航、野外调查 HUD、实时折叠地图、触控、暂停、结算、错误和测绘挑战；全部功能图标使用统一描边 SVG。
- Node 内置测试验证证据状态机、存档合并与硬质植被路线间距；Playwright 验证四章真实碰撞注册、390×844、320×568、platform-layout 和 external-guest。
- 进度先同步写入 `localStorage`，AlterU 内再通过 canonical `aigram-bridge.js` 静默写入永久 game UUID `8962baf6-4b6a-4ddc-892c-19252c297200` 对应的云存档。

## 2. 目录结构

- `index.html`：长按防护、游戏 DOM、永久 UUID、`guest-shell.js` 与 Aigram bridge 入口。
- `src/main.js`：章节选择、启动/预览、证据推进、调查模式、存档、HUD、地图投影、触控和生命周期。
- `src/game/chapters.js`：四章、三证据、场景/地图地标名、观察范围、稳定时间、安全观察位和 8 个测绘点的声明式合同。
- `src/game/investigation.js`：与 DOM/Three.js 解耦的 `EvidenceTracker` 和 `InvestigationSession`。
- `src/game/progress-store.js`：本地优先、云端合并、1 秒防抖写入与失败静默。
- `src/game/map-geometry.js`：把相机世界前向直接投影为纸面朝向角，避免路线相对角的符号叠加。
- `src/app.js`：单章 Three.js 世界、画质分档、渲染循环、语义观察投影和 QA 控制面。
- `src/world/path.js`：共享路径算法与四套控制点；各章保持相同游玩尺度，但由区域配置决定海拔和水系。
- `src/world/region-profile.js`：四章各自的地形/植被/音频种子、海拔、起伏、雾光、物种密度、水系和第一章系统开关。
- `src/world/floodplain-water.js`、`src/world/empty-water.js`：第二/四章单 draw-call 浅水面与第三章零水体合同；不创建第一章镜面反射相机和喷雾。
- `src/world/chapter-landmarks.js`：半沉门庭、双塔观测台、水源装置、合金构件、受控倒影与测绘标记。
- `src/world/ruins.js`：上游遗迹系统、第一章大型水门、三处语义锚点与古代合金信号。
- `src/world/trail-safety.js`：倒木、树干和板根相对路线中心线的碰撞间距合同。
- `src/world/` 其余文件：地形、植被、溪流、瀑布和程序纹理。
- `src/render/`：天空、林冠光场、体积光、AO、调色、景深、泛光和运动积分。
- `src/player/`：第一人称移动、碰撞、步态、跳跃和程序化身体。
- `src/audio/`：Worker 合成的环境声、脚步、水声、鸟虫、方位提示和发现反馈。
- `src/ui.css`、`src/i18n.js`：视觉 token、响应式布局及中英双语。
- `public/aigram-bridge.js`：与共享 canonical vanilla bridge 字节一致的平台桥。
- `public/THIRD_PARTY_NOTICES.txt`：上游 Jungle Trail 和 Three.js 的分发许可。
- `test/`：摇杆速度曲线、证据稳定、宽限、章节恢复、跨设备进度合并和路线间距测试。
- `tools/route-safety.mjs`：加载四个完整生成世界，扫描道路中心线的硬质植被和不可行走坡度。
- `tools/ui-qa.mjs`、`tools/shoot.mjs`、`_qa/ui/`、`shots/qa*`：真实运行状态与匹配机位证据。

## 3. 核心模块

### 状态、章节与生命周期

`src/main.js` 管理 `sleeping → building → preview → ready-frozen → exploring ↔ map / paused → chapter-complete / survey → error`。页面可见后只构建 URL 所选的一章；入口观察镜头结束后停止 RAF，点击才恢复实时渲染和音频。地图打开时暂停世界、音频与观察计时，但保留当前章节实例，关闭后原地恢复。章节按钮通过 URL 切换并整页释放上一章，任何时刻只存在一个 WebGL 世界。

四章复用同一套生成语言，但不复用同一个生成结果。`region-profile.js` 为每章提供唯一 terrain/vegetation/ruin/audio seed，并分别控制路线海拔、起伏、雾、太阳、环境光、总植被密度和逐物种倍率。第一章保留原生 `RuinPlan + Water`；第二章使用较平低地、7 片不规则浅水、枯立木和半沉门庭；第三章累计上升约 11 米、增强侧坡与裸岩石鳍，并完全关闭溪流/瀑布；第四章使用平缓开阔台地、4 片长窄人工蓄水面、石质渠沿和开放式水源装置。第二至四章不构建第一章遗迹台地、深潭、瀑布镜面或喷雾。

### 证据与重复挑战

每章合同声明 3 个依次出现的 evidence。`EvidenceTracker.update()` 只处理当前目标：通用 9% 对准半径、14% 保持半径、120 ms 防抖、350 ms 宽限、1.0–1.3 秒稳定时间；第一章水门按合同放宽为 18% / 25%、0.8 秒。快走、地图、暂停、隐藏和离屏不累积。所有证据都采用“将特征放入观察环并保持，自动记录”的同一操作，不响应点击、撞击或长按按钮；记录中显示独立文案，完成后立即给出继续方向。

水门、水流缺口、倒影门庭、双塔听音轴和水源机器这 5 个大型目标额外声明 `viewpointAnchor`、`viewpointRadius`、`positioningKey` 与 `readyKey`。`main.js` 先把玩家引到可通行的安全观察位；到位后才允许目标进入记录状态，并把箭头、距离与声响从观察位切换到目标特征。第一章水门还允许左右任意一条发亮嵌条作为观察目标，并在地面显示合金观察环；完成后明确提示无需开启机关、沿中央泥土路穿过。这样导航坐标不再复用建筑模型中心，避免把玩家带进柱体、墙体或水面。

`Game.observationProbe()` 同时返回投影可见性、短边归一化中心偏差，以及由相机 forward/right 向量与目标世界方向点积得到的可靠 `bearing`；`guidanceProbe()` 使用独立缓存结果，防止采样观察位时覆盖目标投影。离屏或身后目标不再依赖失真的 NDC 坐标判断左右。

`Ruins.setInvestigationFeedback()` 接收当前证据、已记录集合、帮助状态与“正在前往观察位”状态。第一处合金标记在记录后用材质颜色、emissive 与一次 1.2 秒缩放峰值形成永久激活状态；水门提亮两道独立合金材质，并用合并后的单一网格绘制地面观察环，reduced-motion 时保持静态。该系统不增加灯光、粒子或后处理；观察环只增加 1 个临时 draw call。

轻帮助出现后，`main.js` 以目标距离计算 1.4–3.0 秒重复间隔，并调用 `Ambience.playClueBeacon()` 在语义锚点播放双击合金脉冲。距离越近音高略高、间隔越短；对准、离开范围、暂停或静音后停止，文字的方向与整数米数始终保留。

主线完成后开放测绘挑战。每章的 8 个安全锚点由两组交错序列抽取 3 个，程序化小型石碑/合金环只在测绘中显示。安静模式 4.5 秒后提供方向帮助，专家模式延迟到 8 秒；结果保存最好时间、提示次数和偏航恢复次数，不接排行榜。

### 存档

`ProgressStore` 保存 `unlocked`、`completed`、`surveyBest`、`hintMode` 和 `updatedAt`。写入先同步落本地，再以 1 秒防抖调用 `/note/aigram/ai/game/save/data`；加载从 `/note/aigram/ai/game/get/data/list` 中筛选当前 `telegram_id`，与本地记录按并集和最新偏好合并。桥、网络或云端失败均不阻塞游戏。

### 性能与画质

移动端默认 low：DPR 上限 `0.72`、植被 `densityScale: 0.50`、叶片图集 `768²`、4 级 bloom、无景深、无运动模糊。medium/high/ultra 的运动采样为 `4/8/12` taps，快门为 `0.16/0.28/0.40`，明显低于上游电影级拖影。移动 low 持续 1.6 秒低于约 39 fps 时把帧率目标从 60 回退到 30。

当前 390×844 low 软件渲染审计中，第一章路线约 `2654` 个碰撞代理，第二章约 `1303`，第三章约 `1014`，第四章约 `673`，体现逐章由密闭向开阔的密度变化。第二章 7 片浅水与第四章 4 片蓄水分别合并为单个 draw call、无镜面 pass；第三章使用 0 draw-call 空水体合同。完整植被库存仍通过实例化和距离裁剪管理。

`visibilitychange` 和画布可见度低于 15% 会暂停更新与音频。入口冻结、切页和卸载会取消 RAF；章节 URL 切换负责释放 renderer、后处理、身体、音频与程序地标资源。

### 路线与碰撞安全

植被生成器在接受硬质实例前读取该变体的真实 `solid` 代理，把倒木胶囊、树干圆柱和板根胶囊变换到世界坐标，并沿代理每 0.35 米采样到 `Trail` 的最短距离。实体表面必须离路线中心至少 `0.9 m`；再扣除玩家半径 `0.32 m` 与碰撞 skin `0.018 m`，玩家沿中心线仍保留约 `0.56 m` 净间距。被拒绝的实例不会进入渲染批次或碰撞注册，因此不会产生“模型埋在植被里但碰撞仍封路”的无形墙。

遗迹石块继续保持可见且可绕行的设计性障碍，不使用隐藏碰撞清路。清理区从 `t=0.78` 开始展开，第三、四章在遗迹门前提前收束到门洞轴线；门后松散石块按真实尺寸保留 `1.0 m` 路线表面间距。`tools/route-safety.mjs` 分别以移动低密度和桌面高密度加载四章，每章采样 1001 个中心位置检查非石材净空与陡坡，再用 28 cm 横向步长在真实泥路宽度内做分层连通搜索；四章必须从起点连通至 `t=0.955`。

### 输入、音频与响应式

移动端左摇杆半径 52 px；镜头 Pointer 区域覆盖视口上方 `68%` 的全宽场景，不再限制在右半屏。顶部 HUD 容器位于更高层，地图调查牌、地图图标、声音和暂停恢复 pointer events；视口下方 `32%` 不接管镜头，专供摇杆、跳跃与手掌停放。镜头区和摇杆分别捕获自己的 `pointerId`，所以双指移动与观察可并行。`src/player/gait.js` 的 `analogTravelSpeed()` 把 `0–12%` 设为死区、`12–62%` 平滑映射至 `1.45 m/s` 步行、`62–100%` 平滑映射至 `3.10 m/s` 快走；移动端没有独立加速按钮。`JUMP_SPEED` 为 `3.75 m/s`，配合 `9.81 m/s²` 重力形成约 `0.72 m` 理论峰值；音频继续读取同一常量缩放落地冲击。桌面保留 Pointer Lock、WASD、Shift、Space，并用 M 切换地图。路径辅助只修正明确前进且距中心 7.5 米内的移动方向，不旋转相机。离路 2.4 米持续 1.2 秒显示恢复方向，回到 1.5 米内隐藏。

折叠地图不创建第二套 Three.js 场景。`src/main.js` 在打开地图时读取当前章节 `Trail.samples`，每 8 个采样点取一点，在固定 SVG 画框内用统一米制比例投影真实 `x/z`；世界 `-Z` 固定朝北。路线底线、已走路线和通行带共用这条动态 path。玩家使用 `walker.pos.x/z`，证据优先使用 `observationAnchors` 的真实坐标，5 个地标使用 `Trail.pointAt()` 与 HUD 相同的阈值。第二/四章每片水面也从 `Terrain.floodPools` 的真实中心、切线和长短轴采样 36 点投影为纸面轮廓；非第一章隐藏第一章静态遗迹和深潭，区域标签随章切换为积水盆地、裸露山脊或源头台地。`mapHeadingDegrees()` 直接把相机前向投影到 SVG；下一地标距离和 100 m 比例尺使用同一世界缩放。地图 DOM 只在打开时更新，关闭后没有逐帧开销。

`Ambience.playClueHint()` 使用等功率 `PannerNode` 从证据世界位置播放短促双音，第三章因此天然支持左右方向比较；静音时 UI 外缘方位刻度提供等价视觉信息。地图 DOM 只保留紧凑页头、主 SVG 和“下一地标 + n/3”页尾；章节导航仍由入口负责。纸面由一层上/中/下三段明度与一层左右明度叠成 2×3 六块浅微受光：从上到下逐渐变亮、右深左浅，33.333%、66.666% 与 50% 交界不附加任何窄色带、描边或阴影。`clip-path` 只在三条折叠轴的六个纸边交点加入不对称 `5–10 px` 缺口，各点使用不同宽度、深度与偏移，内部仍保持完整连续。顶部调查牌与右上图标共用 `openMap()`，关闭时把焦点还给实际触发入口。场景中的地图、声音、暂停和跳跃按钮保留 `44–74 px` 透明触控区，但 CSS 不绘制导轨、边框或底板；白色 SVG 通过双层暗投影跨明暗背景保持可读，跳跃键以 `aria-label` 取代可见文字。地图关闭键继续使用纸面内的实体容器。所有 HUD、面板和章节按钮在 320×568 保持无溢出。

## 4. 扩展点

- 改章节顺序、证据范围、稳定时间、安全观察位、测绘点或文案 key：`src/game/chapters.js`；大型目标不要把建筑中心直接兼作 `viewpointAnchor`。
- 加新观察规则：扩展 `src/game/investigation.js` 的输入 sample，不在 DOM 中复制计时逻辑。
- 调整大型地标、合金比例、塔距或倒影：`src/world/chapter-landmarks.js`；第一章原生遗迹改 `src/world/ruins.js`。
- 改四章路线：`src/world/path.js` 的 `CONTROL_VARIANTS`；保持终点与 `spillway.js` 水系合同一致。
- 改区域海拔、起伏、雾光、植被生态、水系或独立种子：`src/world/region-profile.js`；第一章专属瀑布合同仍由 `spillway.js` 管理。
- 改入口、章节导航、HUD、地图、结算或测绘流程：`index.html`、`src/main.js`、`src/ui.css` 和 `src/i18n.js`。
- 改摇杆步行/快走分界与曲线：`src/player/gait.js`；改移动、跳跃、相机或路径辅助：`src/player/controller.js`；改硬质植被路线安全间距：`src/world/trail-safety.js`。
- 改性能：`src/app.js` 的 tier、`src/render/grade.js` 的采样、`src/world/vegetation.js` 的密度/图集和 `src/world/water.js` 的水体档位。
- 改存档 schema：`src/game/progress-store.js`，提高 `SAVE_VERSION` 并保持旧数据 normalize；平台合同继续使用 canonical bridge。
- 加排行榜或社交功能：另行按 `game-persistence` 规范接入；当前设计明确只保存个人进度。
