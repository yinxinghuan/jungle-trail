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
- `_production/poster-source.md`：正式海报提示词、来源、平台 transit 失败和双尺寸检查记录。

## 3. 核心模块

### 状态与启动

`src/main.js` 管理 `sleeping → building → exploring → paused/completed/error`。首屏只加载约 10 KB 的壳代码；玩家点击后才动态导入约 1.2 MB 的场景 chunk。启动壳在 `startGame()` 完成世界构建、执行一次 `step()` 并实际 `renderOnce()` 后才隐藏。

### 主循环与生命周期

`Game.begin()` 使用 RAF 和帧率上限驱动 `step/render`，移动端默认 30 fps/low，桌面默认 60 fps/high。连续 1.6 秒超预算时只下降一个画质级别。`visibilitychange` 与 `IntersectionObserver` 合并为暂停状态，暂停时停止场景更新并挂起音频。

### 移动性能

移动端保持相同种类、算法、种子与地标，但 `Vegetation` 使用 `densityScale: 0.62` 扩大抖动采样步长，将叶片图集从 2048² 降为 1024²、树皮图集从 1024² 降为 512²。最低后处理档关闭体积光步进、AO 和瀑布喷溅，仍保留核心材质、林冠光照、瀑布表面和颜色处理。

### 输入与碰撞

`Walker` 统一键盘和模拟摇杆输入；触控向量保留幅度，移动速度随摇杆距离变化。右侧拖动调用 `lookBy()`，俯仰限制为 ±1.35 rad。跳跃只接受落地边缘触发，冲刺为按住状态。碰撞使用程序化高度场与网格化圆/胶囊/盒代理。

### 响应式布局

WebGL 画布随窗口尺寸更新相机和渲染目标。DOM HUD 直接使用安全区环境变量；粗指针设备显示触控，细指针设备保留 Pointer Lock。短屏缩小摇杆和动作按钮的可见尺寸，但交互目标保持至少 44 px。

### 音频

`Ambience` 在玩家后续手势中解锁 AudioContext，并由 Worker 生成音库。脚步、落地、鸟虫、风、溪流与瀑布依据世界位置和步态混合。`setMuted()` 平滑调整 master gain；音频失败不阻塞游戏。

### 多语言与平台

`src/i18n.js` 优先读取 `localStorage.game_locale`，否则按浏览器语言选择中文或英文。所有产品 UI 文案由 `t()` 读取；游戏名作为固定品牌文本。页面加载生产 `guest-shell.js`，但不自行伪造 Aigram 身份或 API 合同。

## 4. 扩展点

- 调整行走、跳跃、相机或触控：修改 `src/player/controller.js` 与 `src/main.js`。
- 调整地标、完成阈值和旅程 UI：修改 `landmarkFor()`、`finishJourney()` 及 `src/i18n.js`。
- 调整移动性能：修改 `src/app.js` 的移动画质参数、`src/world/vegetation.js` 的 `densityScale/atlasPx`、`src/render/atmosphere.js` 与 `src/world/water.js` 的 tier 表。
- 调整场景和路径：修改 `src/world/path.js`、`terrain.js`、`vegetation.js`、`ruins.js` 或 `water.js`；改动后必须重新做上游基线对照。
- 调整颜色、图标、面板和响应式布局：修改 `src/ui.css` 与 `index.html`，并同步 `doc/visual.md`。
- 增加语言：扩展 `src/i18n.js` 的字典与检测逻辑，复验 320×568 长文本。
- 增加存档、事件或排行榜：先复制 `shared/runtime` 的 canonical bridge，再按 `aigram-api` 和 `game-persistence` 规范接入永久 game UUID；当前版本没有平台数据所有权。
- 更新海报：重新走 Aigram transit；若接口明确失败，记录失败后才使用专业 raster 后备，并更新 `_production/poster-source.md`。
