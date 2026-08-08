# 技术文档

## 1. 技术栈

- JavaScript ES modules、Three.js `0.170.0`、WebGL 2、GLSL 与 Web Audio。
- Vite `5.4.x` 负责开发、生产构建和相对路径部署，`base` 固定为 `./`。
- 场景全部由代码生成：地形、16 类植被、废墟、角色身体、纹理、水体和 60 个声音缓冲不依赖外部运行时美术资产。
- DOM/CSS 提供启动壳、移动触控、HUD、暂停、错误和完成状态；所有功能图标为同一套内联描边 SVG。
- Playwright 用于 390×844、320×568 的真实运行截图；生产页面加载 AlterU `guest-shell.js`，平台内由扩展自行跳过访客栏。
- 本游戏不读取玩家资料、不保存状态、不使用排行榜或后端 API，因此没有引入 Aigram 身份、存档或分数桥接。

## 2. 目录结构

- `index.html`：关键首屏样式、iOS 长按防护、DOM 状态结构、远程访客扩展入口。
- `src/main.js`：轻量启动壳、动态加载、i18n 绑定、触控、HUD、生命周期与完成闭环。
- `src/app.js`：上游 Three.js 世界入口、画质分档、渲染循环、场景构建和首帧握手。
- `src/ui.css`：视觉 token、启动页、HUD、触控、面板、完成态与窄屏适配。
- `src/i18n.js`：`zh/en` 文案、语言检测和变量替换。
- `src/player/`：第一人称移动、碰撞、步态、跳跃和程序化身体。
- `src/world/`：路径、地形、植被、废墟、溪流、瀑布和程序纹理。
- `src/render/`：天空、林冠光场、体积光、AO、调色、景深、泛光和运动模糊。
- `src/audio/`：Worker 合成、环境层、脚步、水声、鸟虫和音频图。
- `src/gfx/`：程序纹理烘焙与共享 GLSL。
- `worker/index.js`：自托管发布适配器；仅提供只读 `/api/health`，其余 `/api/*` 请求统一返回 404。
- `public/THIRD_PARTY_NOTICES.txt`：上游作品和 Three.js 的完整分发许可。
- `public/poster.png`：1024×1024 正式英文 raster 海报。
- `_qa/capture.mjs`、`_qa/ui/`：移动端状态截图脚本与首轮/复验证据。
- `_qa/capture-clue.mjs`：第一处观察的附近、对准、完成、中文窄屏与 reduced-motion 自动断言和截图。
- `_qa/capture-clue-material.mjs`：在 390×844 真实运行画面中断言古代合金嵌环与氧化缝存在，并捕获目标未被准星覆盖的材质证据。
- `_qa/capture-navigation.mjs`：路径扶正、34 m 线索预告和离路恢复提示的数值断言与构图证据。
- `_qa/playthrough-input.mjs`：不调用传送/自动行走 API，使用真实触控事件分别验证摇杆、冲刺和右侧转镜头。
- `_production/poster-source.md`：正式海报提示词、来源、平台 transit 失败和双尺寸检查记录。
- `doc/retrospective.md`：本次源码改造、场景化首屏、性能、视觉 QA、失败案例与跨项目复用合同。

## 3. 核心模块

### 状态与启动

`src/main.js` 管理 `sleeping → building → preview → ready-frozen → exploring → paused/completed/error`。首屏壳约 13 KB；页面真实可见后才动态导入约 1.2 MB 的场景 chunk。`startGame({ autoBegin: false })` 完成世界构建与首帧后，入口先停留 0.6 秒，再运行 3.6 秒观察镜头；随后 `Game.stop()` 取消 RAF，并用 6 个静止渲染清除运动模糊。点击入口才恢复实时循环、显示 HUD 和解锁声音。

### 主循环与生命周期

`Game.begin()` 使用 RAF 和帧率上限驱动 `step/render`，`Game.stop()` 取消入口待机循环；移动端默认从 60 fps/low 开始，桌面默认 60 fps/high。移动端 low 档连续 1.6 秒仍低于约 39 fps 时把帧率目标回退到 30 fps；显式 `#fps=` 调试覆盖不会被自适应改写。`visibilitychange` 与 `IntersectionObserver` 合并为暂停状态，隐藏平台预载不会创建 WebGL，已运行场景在不可见时停止场景更新并挂起音频。

### 移动性能

移动端保持相同种类、算法、种子与地标，但 `Vegetation` 使用 `densityScale: 0.50` 扩大抖动采样步长，将叶片图集从 2048² 降为 768²、树皮图集从 1024² 降为 512²。渲染器像素比上限为 `0.72`；最低后处理档关闭景深、体积光步进、AO 和瀑布喷溅，泛光降为 4 级，仍保留核心材质、林冠光照、瀑布表面和颜色处理。

`Grade` 的 low 档动态模糊为 4 taps / `0.22` 帧曝光，景深 taps 为 0，因而不创建景深材质或运行该全屏通道；medium 为 8 taps / `0.45` 帧，高与 ultra 保留原电影曝光。运行断言确认 low 档为 `pixelRatio=0.72`、`densityScale=0.5`、`atlasPx=768` 且 `dofMaterialAllocated=false`，不改变桌面 high 档基线。

### 输入与碰撞

`Walker` 统一键盘和模拟摇杆输入；触控向量保留幅度，移动速度随摇杆距离变化。移动端在玩家明确向前（纵向至少 `45%`、横向小于 `45%`）且距离路径中心不超过 `7.5 m` 时，把实际移动方向最多混合 `50%` 到前方路径切线；横推、后退、腾空或反向行走立即退出。该逻辑不旋转相机，也不影响桌面输入。右侧拖动调用 `lookBy()`，俯仰限制为 ±1.35 rad。跳跃只接受落地边缘触发，冲刺为按住状态。碰撞使用程序化高度场与网格化圆/胶囊/盒代理。

`Walker.trailOffset` 暴露路径距离、侧向和相对镜头方向。`src/main.js` 在离路超过 `2.4 m` 持续 `1.2 s` 后显示一次轻量“深色路径在左/右”，回到 `1.5 m` 内即隐藏；观察、任务或教学提示出现时，偏航提示让位，避免多个主指令叠加。

### 路径与首个线索视线

`Trail.widthAt()` 把主要泥路半宽提高到约 `1.12 m`，地形 shader 使用更连续的边缘函数并把泥土反照率压到原来的 `86%`，使路在高亮叶片和阴影下仍有连续轮廓。`Vegetation` 在生成时建立从路径 `t=0.318` 到首块石头的视线段：高遮挡灌木、棕榈、阔叶、幼树和藤类不会落在目标 `3.4 m` 或该段 `1.6 m` 的清障范围内；低矮地被仍保留，所以画面不会变成空走廊。

### 第一处观察垂直切片

`Ruins` 在 `t=0.356` 生成宽 `0.78 m`、高 `1.75 m` 的直立加工石碑，并额外挂接程序化 Torus/Box 几何组成的古代合金嵌环、轴线与绿锈缝。石碑主体仍进入合并石材网格，只有少量语义构件保留独立 Mesh；`observationAnchors.firstStone` 指向石碑下半部，避免中央观察环遮住上方实体嵌环。`Game.observationProbe()` 使用可复用 `Vector3` 投影语义点，并返回可见性、距离、中心偏差与屏幕方向，不产生逐帧垃圾。

`src/main.js` 在玩家距离目标 `38 m` 时先触发一次非阻塞预告和 `Ambience.playClueHint()` 方位声；进入 `22 m` 后启用判定：首次进入短边 `9%` 中心半径并通过 `120 ms` 防抖后，连续累积 `1.1 s`；已经开始观察时允许在 `14%` 半径内继续，并在完全偏离后保留 `0.35 s` 宽限。若进入近距区域 `4.5 s` 仍未对准，观察环外缘用 `--jt-clue-angle` 显示一枚指向目标的短刻度，并把文案明确为金属圆环石碑，不自动完成。冲刺、暂停、隐藏、离屏和入口预览均不累积。成功状态只保存在本次页面会话，更新 `线索 1/1`、显示非模态结论、触发轻触觉，并在音频图已准备好时调用 `Ambience.playDiscovery()` 播放两层短促正弦石质共鸣。

### 响应式布局

WebGL 画布随窗口尺寸更新相机和渲染目标。DOM HUD 直接使用安全区环境变量；粗指针设备显示触控，细指针设备保留 Pointer Lock。短屏缩小摇杆和动作按钮的可见尺寸，但交互目标保持至少 44 px。

### 音频

`Ambience` 在玩家后续手势中解锁 AudioContext，并由 Worker 生成音库。脚步、落地、鸟虫、风、溪流与瀑布依据世界位置和步态混合。线索预告使用短促双正弦声和 `PannerNode` 指向首块石头，不加载外部音频。`setMuted()` 平滑调整 master gain；音频失败不阻塞游戏。

### 多语言与平台

`src/i18n.js` 优先读取 `localStorage.game_locale`，否则按浏览器语言选择中文或英文。所有产品 UI 文案由 `t()` 读取；游戏名作为固定品牌文本。页面加载生产 `guest-shell.js`，但不自行伪造 Aigram 身份或 API 合同。

## 4. 扩展点

- 调整行走、跳跃、相机或触控：修改 `src/player/controller.js` 与 `src/main.js`。
- 调整地标、完成阈值和旅程 UI：修改 `landmarkFor()`、`finishJourney()` 及 `src/i18n.js`。
- 调整观察范围、预告范围、中心半径、稳定时长和回退：修改 `src/main.js` 的 `CLUE_*` 常量；更换目标主体或合金嵌件时修改 `src/world/ruins.js` 的 `firstStoneSignal` / `observationAnchors`，不要在 HUD 中硬编码世界坐标。
- 调整移动端扶正与离路提示：修改 `src/player/controller.js` 的 `setTrailAssist()` 合同和 `src/main.js` 的 `updateRouteCue()`；保持相机不被自动旋转。
- 扩展第二、第三处观察：沿用 `Game.observationProbe()` 与同一 UI 状态合同，为门址和瀑布分别增加语义 anchor；完成三章前不增加排行榜或存档。
- 调整移动性能：修改 `src/app.js` 的移动画质参数、`src/world/vegetation.js` 的 `densityScale/atlasPx`、`src/render/atmosphere.js` 与 `src/world/water.js` 的 tier 表。
- 调整场景和路径：修改 `src/world/path.js`、`terrain.js`、`vegetation.js`、`ruins.js` 或 `water.js`；改动后必须重新做上游基线对照。
- 调整颜色、图标、面板和响应式布局：修改 `src/ui.css` 与 `index.html`，并同步 `doc/visual.md`。
- 增加语言：扩展 `src/i18n.js` 的字典与检测逻辑，复验 320×568 长文本。
- 增加存档、事件或排行榜：先复制 `shared/runtime` 的 canonical bridge，再按 `aigram-api` 和 `game-persistence` 规范接入永久 game UUID；当前版本没有平台数据所有权。
- 更新海报：重新走 Aigram transit；若接口明确失败，记录失败后才使用专业 raster 后备，并更新 `_production/poster-source.md`。
