const copy = {
  en: {
    sleepingCopy: 'Walk the overgrown trail. Find the water beyond the ruins.',
    enter: 'Enter the jungle',
    preparing: 'Growing the world…',
    firstFrame: 'Lighting the canopy…',
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
