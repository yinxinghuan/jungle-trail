const copy = {
  en: {
    sleepingCopy: 'Walk the overgrown trail. Find the water beyond the ruins.',
    enter: 'Enter the jungle',
    preparing: 'Growing the world…',
    firstFrame: 'Lighting the canopy…',
    entryReady: 'Touch to take the trail',
    startFailed: 'The jungle could not be created on this device.',
    retry: 'Try again',
    pause: 'Pause',
    resume: 'Continue walking',
    returnTrail: 'Return to the trail',
    paused: 'The forest is waiting',
    mute: 'Mute sound',
    unmute: 'Unmute sound',
    jump: 'Jump',
    sprint: 'Sprint',
    lookHint: 'Drag the right side to look around',
    moveHint: 'Use the left circle to walk',
    mission: 'Follow the water · notice what does not belong to the forest',
    clueAhead: 'Ahead, a standing stone holds an ancient metal ring',
    clueCount: 'Trace {n}/1',
    clueNearby: 'Look for the upright stone with a metal ring',
    clueSearch: 'Follow the outer notch · find the metal-ringed stone',
    clueFocus: 'Hold the stone in your gaze',
    clueSprint: 'Slow down to observe',
    clueKicker: 'Trace recorded · 01',
    clueRecorded: 'These stones did not fall here by themselves.',
    trailLeft: 'The darker trail is to your left',
    trailRight: 'The darker trail is to your right',
    complete: 'You found the falls',
    observe: 'Keep looking',
    restart: 'Walk again',
    time: 'Trail time · {time}',
    webglError: 'This experience needs WebGL 2. Update your browser or try another device.',
    landmarks: ['Trailhead', 'Deep forest', 'Ruins approach', 'Temple clearing', 'The falls'],
  },
  zh: {
    sleepingCopy: '沿着被植被吞没的小径前行，寻找废墟后的瀑布。',
    enter: '进入雨林',
    preparing: '雨林正在生长…',
    firstFrame: '正在点亮林冠…',
    entryReady: '轻触，走进雨林',
    startFailed: '这台设备未能创建雨林场景。',
    retry: '重试',
    pause: '暂停',
    resume: '继续前行',
    returnTrail: '回到小径',
    paused: '森林正在等待',
    mute: '静音',
    unmute: '恢复声音',
    jump: '跳跃',
    sprint: '冲刺',
    lookHint: '在右侧拖动，观察四周',
    moveHint: '推动左侧圆环，沿小径前行',
    mission: '沿着水声前进 · 留意不属于森林的形状',
    clueAhead: '前方有一块嵌着古代金属圆环的直立石碑',
    clueCount: '线索 {n}/1',
    clueNearby: '寻找带金属圆环的直立石碑',
    clueSearch: '沿着圆环外侧刻度转动 · 寻找金属石碑',
    clueFocus: '让石块停留在视线中央',
    clueSprint: '慢下来，仔细观察',
    clueKicker: '已记录 · 01',
    clueRecorded: '这些石头不是从山上滚下来的。',
    trailLeft: '较暗的小径在左侧',
    trailRight: '较暗的小径在右侧',
    complete: '你找到了瀑布',
    observe: '继续观察',
    restart: '重新步行',
    time: '探索用时 · {time}',
    webglError: '该体验需要 WebGL 2，请更新浏览器或更换设备。',
    landmarks: ['林径入口', '雨林深处', '废墟前沿', '神庙空地', '瀑布'],
  },
};

function detectLocale() {
  const override = localStorage.getItem('game_locale');
  if (override === 'en' || override === 'zh') return override;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export const locale = detectLocale();

export function t(key, vars = {}) {
  let value = copy[locale][key] ?? copy.en[key] ?? key;
  if (Array.isArray(value)) return value;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}
