# Jungle Trail 技术与视觉复盘

> 记录日期：2026-08-08  
> 上游：StarKnightt / Prasenjit，MIT  
> 固定上游 revision：`753fb347328ce49963d8ae96124d5224f980bf63`  
> AlterU 场景化首屏提交：`d97fa5f28468b93a7d2a0c8a9574f54336e05693`

## 1. 这次项目证明了什么

Jungle Trail 证明：一个计算较重的程序化 3D 世界，不必在“廉价启动页”和“进入即持续烧 GPU”之间二选一。只要把加载、预览、待机和接管拆成明确状态，就可以让真实场景承担首屏吸引力，同时把未开始玩家的持续渲染成本降到接近零。

这次最值得复用的不是某个雨林材质，而是以下完整合同：

1. 页面隐藏预载时不创建 WebGL。
2. 页面真实可见后自动下载重场景 chunk 并构建世界。
3. 只有关键程序纹理、核心场景和一次真实渲染完成，才把 Canvas 交给首屏。
4. 真实画面先停留 `0.6 s`，再做 `3.6 s`、最大约 `8°` 的低速观察。
5. 观察结束后停止 RAF，并用 6 个静止渲染清除运动模糊历史。
6. 保留最后一帧和 GPU 资源，不继续模拟、渲染或启动音频。
7. 玩家点击后恢复 RAF、显示 HUD、接管控制，并通过同一手势解锁 AudioContext。

这套模式适合“场景本身就是卖点”的旗舰 WebGL/WebGPU 体验，不应替代所有游戏的首触加载策略。

## 2. 源码复刻与视觉基线

### 正确做法

- 先固定上游 commit、作者与 MIT 许可证，再开始改造。
- 保留上游 Three.js 世界模块边界：路径、地形、植被、废墟、水体、玩家身体、环境光、后处理和音频。
- 第一阶段先证明原作的尺度、材质、相机、光线、雾、瀑布和空间声音仍成立，再叠加 AlterU 入口、触控和状态 UI。
- README、`public/THIRD_PARTY_NOTICES.txt` 和 `games.json.description` 分别承担源码署名、分发 notice 与发表侧可见署名。

### 不应复用的捷径

- 不能根据截图重画“类似雨林”，那会丢掉上游程序化资产之间共享的噪声、光照和材质逻辑。
- 不能为了手机端直接删除自由观察、体积光、水雾或植被层次；应降低采样、DPR、图集和密度，同时保留核心视觉语法。
- 不能把调试传送、桌面 Pointer Lock 入口或 F3 面板直接当产品 UI。

## 3. 技术架构经验

### 3.1 轻壳与重场景分离

最终构建中：

| 部分 | 未压缩 | gzip | 浏览器职责 |
|---|---:|---:|---|
| 入口状态机 `index-u45y5Srj.js` | 13.13 kB | 5.42 kB | 首屏、i18n、状态、触控与生命周期 |
| 场景 `app-DlbmrE7n.js` | 1,194.45 kB | 357.22 kB | Three.js 世界、材质、后处理与音频图 |
| UI CSS | 9.36 kB | 2.90 kB | 启动、入口、HUD、面板与响应式 |

`dist/` 的磁盘尺寸不是首屏网络成本。源码映射和正式海报会进入发布目录，但浏览器不会在正常游玩入口自动下载全部文件。评估资源必须分别看传输、初始化、显存和持续运行。

轻壳通过动态 `import('./app.js')` 保持即时响应。过去由点击触发动态导入；场景化首屏改为“文档真实可见后触发”，但隐藏平台预载仍不建场。

### 3.2 明确的入口状态机

```text
sleeping
  → building
  → preview-settling (0.6 s)
  → preview-motion (3.6 s)
  → ready-frozen (RAF stopped)
  → exploring (tap resumes RAF + controls + audio)
  → paused / completed / error
```

不要只用 `loading/playing` 两个布尔值。重场景入口至少要区分“正在构建”“真实场景已出现”“预览仍在运行”“已冻结等待”“玩家已接管”，否则资源暂停、声音解锁、HUD 可见性和 QA 都会互相污染。

### 3.3 有意义首帧握手

启动层不能在模块下载完成时消失。正确握手顺序是：

1. 构造 renderer 与世界；
2. 完成程序纹理和必要 mesh；
3. `step(1 / 60)` 更新相机与共享 uniform；
4. `renderOnce()` 真正输出一帧；
5. 才添加 `is-scene-ready` 并把启动层变为透明场景叠层。

固定超时只适合控制最短展示时间，不能证明场景已准备好。

### 3.4 冻结必须停止循环，而不只是暂停内容

`Game.setPaused(true)` 虽然跳过 `step/render`，但 RAF 回调仍会每帧调度。入口长期待机使用独立的 `Game.stop()`：取消 `_raf`、清空累积时间并把 `running` 设为 `false`。玩家点击后再调用 `begin()` 创建新的循环。

这让 QA 可以机械断言：

- 预览中：`window.__game.running === true`；
- 冻结待机：`running === false`，HUD 隐藏；
- 点击接管：`running === true`，HUD 可见。

### 3.5 后处理历史需要静止收敛

第一版冻结只停止了 RAF，最后一帧仍保留相机运动模糊，真实截图看起来像低清或性能故障。这是本项目最重要的视觉失败之一。

最终处理：先停止循环，再用相同相机和零时间步连续执行 6 次 `step(0) + renderOnce()`，让运动历史收敛到静止状态，然后保留最后一帧。具有 TAA、afterimage、motion blur、temporal accumulation 或速度缓冲的项目都要考虑这一步；“模拟停了”不等于“输出帧已经稳定”。

### 3.6 音频与自动预览必须解耦

自动预览无声。构造 `Ambience` 只安装首次手势监听，不创建 AudioContext、不合成 60 个缓冲、不打开输出设备。玩家点击入口时，document-level `pointerdown` 才触发解锁和后台音频烘焙。

视觉可以自动开始，音频不能绕过浏览器手势合同，也不应在信息流预载中制造声音或额外 CPU 峰值。

### 3.7 移动性能分档

当前移动合同：

- `low` tier；
- DPR 上限 `0.75`；
- 30 fps 上限；
- 植被密度 `0.62`；
- 叶片图集 `1024²`，树皮等次级图集进一步降低；
- 连续 `1.6 s` 超预算才下降一级，避免首帧 shader 编译期误判；
- `visibilitychange` 与 `IntersectionObserver` 共同暂停离屏模拟和声音。

降级顺序应优先动采样、DPR、图集和密度，不先删定义视觉身份的地标、光线或材质类别。

### 3.8 可移植发布

- Vite `base: './'`；所有运行资源保持相对路径。
- 自托管与 GitHub Pages 使用同一 Git commit 和同一 bundle。
- 纯前端游戏仍提供最小 `worker/index.js`：仅 `/api/health` 返回 `{ ok: true }`，其余 API 返回 404；不创建伪后端或数据库。
- 正式地址使用永久 UUID `8962baf6-4b6a-4ddc-892c-19252c297200`。

## 4. 视觉与界面经验

### 4.1 真正的作品应该承担首屏

原版启动页只有暗绿渐变、抽象林冠和大标题。它功能正确，却要求用户先相信一个普通启动页，点击后才能看到真正优秀的雨林。这种结构浪费了作品最强的视觉资产。

场景化入口把真实雨林作为 94% 以上的画面主体，DOM 只承担：

- 作品身份；
- 一句方向承诺；
- 一个明确入口动作；
- 一个真实加载/就绪状态。

标题、说明和按钮放在底部场景暗部，中心道路与林冠光保持可见；不用居中卡片、磨砂大面板或播放三角。

### 4.2 入口运动要像观察，不像演示转盘

有效参数：

- 先停留 `0.6 s`，让眼睛建立构图；
- `3.6 s` 内水平偏转约 `8°`；
- 俯仰只加入约 `0.012 rad` 的轻微弧线；
- 使用 cosine ease，不突然起停；
- 只播放一次，不循环摇头；
- `prefers-reduced-motion` 直接进入清晰冻结态。

运动的目的只是证明场景是活的，并展示一点空间深度。持续循环会把自然纪录片感变成商品轮播，也会浪费电量。

### 4.3 画面冻结后，UI 仍要明确可点击

停止动态后不能让入口看起来像一张不可交互海报。保留：

- 48 px 高主按钮；
- 静态状态文字“轻触，走进雨林 / Touch to take the trail”；
- 暖白边框和明确 pressed/focus 状态；
- 真实场景而非播放图标。

点击时按钮同帧压缩，入口层用 320 ms 淡出，HUD 立即出现，场景循环无缝继续。

### 4.4 平台内与外部访客栏分开判断

平台内构图以没有访客栏的 `platform-layout` 为准。外部 `guest-shell` 是固定覆盖层，只检查 CTA 仍可使用，不能为了它永久下移标题、缩小场景或改变相机。

最终证据同时包含：

- `platform-layout-entry-preview-motion-390x844.png`；
- `platform-layout-entry-frozen-390x844.png`；
- `platform-layout-entry-frozen-reduced-motion-320x568.png`；
- `external-guest-entry-preview-motion-390x844.png`。

## 5. QA 与失败经验

### 失败 A：只看构建成功

构建不能证明入口有吸引力、冻结是否真的停止 RAF、中文短屏是否完整，或最后一帧是否残留运动模糊。必须运行真实场景并截图。

### 失败 B：冻结帧带运动模糊

原因不是分辨率低，而是 temporal history 尚未收敛。修复是静止渲染 6 帧，不是提高 DPR 或锐化 CSS。

### 失败 C：用 `networkidle` 验证短动画

程序化建场长时间占用主线程。Playwright 等到 `networkidle` 后再观察时，3.6 秒预览可能已经结束，于是测试误以为动画被跳过。

正确做法：

- 从 `domcontentloaded` 开始观察；
- 用 DOM dataset 记录 `previewMotionStartedAt` 与 `previewFrozenAt`；
- 断言运动持续至少 `3.5 s`；
- 分别断言 `running=true → false → true`；
- 截图只负责视觉判断，不承担全部时序证明。

### 失败 D：把磁盘产物大小当首屏流量

`dist/` 包含 sourcemap、海报和 notices。资源评估必须看浏览器实际请求及 gzip，而不是只运行 `du -sh dist`。

## 6. 可复用实现合同

下面是可移植到其他重型场景的最小伪代码：

```js
if (document.hidden) waitUntilVisible();
else prepareScene();

async function prepareScene() {
  const { startGame } = await import('./heavy-scene.js');
  game = startGame(canvas, { autoBegin: false });
  // startGame 内必须已经完成 step + renderOnce
  revealLiveScene();
  game.begin();
  await establish(600);
  await runOneShotPreview(3600);
  game.stop();
  settleTemporalHistory(6);
}

function enter() {
  game.begin();
  showControls();
  // 同一 pointer gesture 解锁音频
}
```

调用方还必须实现：

- `visibilitychange` 与可见比例暂停；
- reduced-motion 直接冻结；
- WebGL/初始化错误与重试；
- 真实首帧握手；
- 入口、冻结和接管三态 QA；
- 音频手势解锁；
- 不遮挡主体的响应式入口排版。

## 7. 什么时候采用，什么时候不要采用

### 适合

- 真实 3D 场景本身就是点击理由；
- 构建成本可以在页面可见后支付；
- 场景能在停止 RAF 后保留有吸引力的画面；
- 点击后保留同一相机和世界，无需二次加载；
- 内存常驻成本在目标设备上可接受。

### 不适合

- 信息流会同时让多个页面保持可见或浏览器没有可靠可见性信号；
- 初始化会在低端手机造成长时间主线程冻结；
- 场景只有持续模拟时才成立，静止画面失去意义；
- 显存远高于持续重建成本；
- 用户点击率很低，不值得为所有可见曝光支付一次完整建场。

这些情况继续采用“低成本 sleeping state + 首次点击创建 renderer”。不要因为 Jungle Trail 成功，就把所有重游戏都改成自动建场。

## 8. 能力分类与后续

当前结论：这是一个**产品化交互模式**，不是独立视觉效果 Skill。

它已在 Jungle Trail 完成：

- 真实外部源码改造；
- 390×844 动态/冻结/接管验证；
- 320×568 中文 reduced-motion 验证；
- 自托管与 Pages 双部署；
- 实际 bundle 独特字符串验证。

但当前只有一个不同题材消费者。等第二个重型 3D/WebGPU 游戏以同一合同接入并验证通用接口后，再考虑沉淀为专门的“live scene entry”工作流或扩展现有 `adapt-visual-demo` 规则。

玩法下一步应从环境本身生长：五个地标、自然线索、遗迹观察或声音导航都比金币、倒计时、生命值更合适。本复盘只记录方向，不把尚未实现的玩法写成已验证能力。
