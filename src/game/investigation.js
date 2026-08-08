const clamp01 = (value) => Math.min(1, Math.max(0, value));

export class EvidenceTracker {
  constructor(contract) {
    this.contract = contract;
    this.reset();
  }

  reset(recorded = false) {
    this.recorded = recorded;
    this.announced = recorded;
    this.progress = recorded ? 1 : 0;
    this.nearbyAt = 0;
    this.alignedAt = 0;
    this.lastAlignedAt = 0;
    this.helped = false;
  }

  update(sample, now, dt, options = {}) {
    if (this.recorded) return { state: 'recorded', progress: 1, completed: false };
    const previewRange = this.contract.previewRange ?? 38;
    const range = this.contract.range ?? 22;
    const alignRadius = options.alignRadius ?? 0.09;
    const breakRadius = options.breakRadius ?? 0.14;
    const confirmMs = options.confirmMs ?? 120;
    const graceMs = options.graceMs ?? 350;
    const helpDelayMs = options.helpDelayMs ?? 4500;
    const hold = this.contract.hold ?? 1.2;
    const distance = Number.isFinite(sample.distance) ? sample.distance : Infinity;
    const announcedNow = !this.announced && distance <= previewRange;
    if (announcedNow) this.announced = true;
    const nearby = distance <= range;
    if (!nearby) {
      this.nearbyAt = 0;
      this.alignedAt = 0;
      this.lastAlignedAt = 0;
      this.progress = 0;
      return { state: this.announced ? 'signaled' : 'roaming', progress: 0, announcedNow, completed: false };
    }
    if (!this.nearbyAt) this.nearbyAt = now;
    const centered = sample.visible && sample.centerDistance <= alignRadius;
    const tracking = !sample.sprinting && sample.visible
      && (centered || (this.lastAlignedAt && sample.centerDistance <= breakRadius));
    if (tracking) {
      if (!this.alignedAt) this.alignedAt = now;
      this.lastAlignedAt = now;
      if (now - this.alignedAt >= confirmMs) this.progress = clamp01(this.progress + dt / hold);
    } else {
      this.alignedAt = 0;
      const inGrace = this.lastAlignedAt && now - this.lastAlignedAt <= graceMs;
      if (!inGrace) this.progress = clamp01(this.progress - dt * 0.85 / hold);
    }
    const helpedNow = !tracking && !this.helped && now - this.nearbyAt >= helpDelayMs;
    if (helpedNow) this.helped = true;
    const completed = this.progress >= 1 - 1e-6;
    if (completed) {
      this.recorded = true;
      this.progress = 1;
    }
    return {
      state: completed ? 'recorded' : tracking ? 'aligned' : 'nearby',
      progress: this.progress, announcedNow, helpedNow, completed,
      tracking, helped: this.helped, nearby,
    };
  }
}

export class InvestigationSession {
  constructor(chapter, recordedIds = []) {
    this.chapter = chapter;
    const recorded = new Set(recordedIds);
    this.trackers = chapter.evidence.map((contract) => {
      const tracker = new EvidenceTracker(contract);
      tracker.reset(recorded.has(contract.id));
      return tracker;
    });
  }

  get recordedCount() { return this.trackers.filter((tracker) => tracker.recorded).length; }
  get complete() { return this.recordedCount === this.trackers.length; }
  get activeIndex() { return this.trackers.findIndex((tracker) => !tracker.recorded); }
  get active() { const i = this.activeIndex; return i < 0 ? null : this.trackers[i]; }
  recordedIds() { return this.trackers.filter((x) => x.recorded).map((x) => x.contract.id); }
  reset() { this.trackers.forEach((tracker) => tracker.reset(false)); }
}
