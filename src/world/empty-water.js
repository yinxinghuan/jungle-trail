import * as THREE from 'three';

/** App-facing water contract for dry regions. */
export class EmptyWater {
  constructor(kind = 'dry-ridge') {
    this.kind = kind;
    this.root = new THREE.Group();
    this.root.name = `${kind}-water-none`;
    this.materials = [];
  }
  update() {}
  renderReflection() { return false; }
  setTier() {}
  setViewportHeight() {}
  setReflectionSize() {}
  stats() { return { kind: this.kind, pools: 0, drawCalls: 0, mirror: 'off' }; }
  dispose() {}
}
