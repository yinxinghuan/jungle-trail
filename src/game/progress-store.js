const STORAGE_KEY = 'jungle_trail_expedition_v2';
const SAVE_VERSION = 2;

export function freshProgress() {
  return {
    version: SAVE_VERSION,
    unlocked: ['trail-remembers'],
    completed: {},
    surveyBest: {},
    hintMode: 'guided',
    updatedAt: 0,
  };
}

export function normalizeProgress(value) {
  const base = freshProgress();
  if (!value || typeof value !== 'object') return base;
  return {
    ...base,
    unlocked: Array.isArray(value.unlocked) && value.unlocked.length
      ? [...new Set(value.unlocked.filter((x) => typeof x === 'string'))] : base.unlocked,
    completed: value.completed && typeof value.completed === 'object' ? value.completed : {},
    surveyBest: value.surveyBest && typeof value.surveyBest === 'object' ? value.surveyBest : {},
    hintMode: value.hintMode === 'expert' ? 'expert' : 'guided',
    updatedAt: Number(value.updatedAt) || 0,
  };
}

export function mergeProgress(localValue, cloudValue) {
  const local = normalizeProgress(localValue);
  const cloud = normalizeProgress(cloudValue);
  const newest = cloud.updatedAt > local.updatedAt ? cloud : local;
  return normalizeProgress({
    ...newest,
    unlocked: [...new Set([...local.unlocked, ...cloud.unlocked])],
    completed: { ...local.completed, ...cloud.completed },
    surveyBest: { ...local.surveyBest, ...cloud.surveyBest },
  });
}

export class ProgressStore {
  constructor(storage = window.localStorage, bridge = window.Aigram) {
    this.storage = storage;
    this.bridge = bridge;
    this.value = this._readLocal();
    this._cloudTimer = 0;
  }

  _readLocal() {
    try { return normalizeProgress(JSON.parse(this.storage.getItem(STORAGE_KEY))); }
    catch { return freshProgress(); }
  }

  async load() {
    const a = this.bridge;
    if (!a?.isInAigram || !a.gameUuid || !a.telegramId) return this.value;
    try {
      const response = await a.callAigramAPI(
        `/note/aigram/ai/game/get/data/list?session_id=${encodeURIComponent(a.gameUuid)}`,
        'GET',
      );
      const rows = Array.isArray(response?.data) ? response.data : [];
      const row = rows.find((item) => String(item.user_id) === String(a.telegramId));
      const cloud = row?.resource_data ? JSON.parse(row.resource_data) : null;
      this.value = mergeProgress(this.value, cloud);
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.value));
    } catch { /* local progress remains authoritative when the bridge is unavailable */ }
    return this.value;
  }

  save(next) {
    this.value = normalizeProgress({ ...next, updatedAt: Date.now() });
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.value));
    clearTimeout(this._cloudTimer);
    this._cloudTimer = setTimeout(() => this.flush(), 1000);
    return this.value;
  }

  update(mutator) { return this.save(mutator(structuredClone(this.value))); }

  flush() {
    clearTimeout(this._cloudTimer);
    this._cloudTimer = 0;
    const a = this.bridge;
    if (!a?.isInAigram || !a.gameUuid) return;
    try {
      a.postAigramAPI('/note/aigram/ai/game/save/data', {
        session_id: a.gameUuid,
        resource_data: JSON.stringify(this.value),
      });
    } catch { /* save failures never block the expedition */ }
  }
}

