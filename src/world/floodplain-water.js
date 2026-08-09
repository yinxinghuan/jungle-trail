import * as THREE from 'three';

/** Lightweight chapter-two water: seven shallow pools, one material, one draw. */
export class FloodplainWater {
  constructor(renderer, terrain, trail, { tier = 'high' } = {}) {
    this.terrain = terrain;
    this.trail = trail;
    this.tier = tier;
    this.root = new THREE.Group();
    this.root.name = 'floodplain-water';
    this.time = { value: 0 };

    this.engineered = terrain.region === undefined
      ? false : terrain.region.pathRoll < 0.5;
    const material = new THREE.MeshStandardMaterial({
      color: this.engineered ? 0x35534f : 0x29433f,
      roughness: 0.39,
      metalness: 0.04,
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
      side: THREE.DoubleSide,
      envMapIntensity: 0.72,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFloodTime = this.time;
      shader.vertexShader = 'attribute float floodEdge;\nvarying float vFloodEdge;\n'
        + shader.vertexShader;
      shader.vertexShader = `uniform float uFloodTime;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', `
          #include <begin_vertex>
          vFloodEdge = floodEdge;
          float floodWave = sin(position.x * 0.43 + position.z * 0.19 + uFloodTime * 0.72)
            + 0.45 * sin(position.x * -0.21 + position.z * 0.52 + uFloodTime * 1.07);
          transformed.y += floodWave * 0.012;
        `);
      shader.fragmentShader = `uniform float uFloodTime;\nvarying float vFloodEdge;\n${shader.fragmentShader}`
        .replace('#include <roughnessmap_fragment>', `
          #include <roughnessmap_fragment>
          roughnessFactor *= 0.84 + 0.12 * sin(vViewPosition.x * 1.7 + vViewPosition.z * 0.8 + uFloodTime);
        `)
        .replace('#include <output_fragment>', `
          diffuseColor.a *= smoothstep(0.02, 0.38, vFloodEdge);
          #include <output_fragment>
        `);
    };
    material.customProgramCacheKey = () => 'floodplain-water-v1';
    this.materials = [material];

    const geometry = this._buildGeometry(terrain.floodPools);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'floodplain-pools';
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 8;
    this.root.add(this.mesh);
  }

  _buildGeometry(pools) {
    const rings = 6;
    const segments = 48;
    const positions = [];
    const uvs = [];
    const edge = [];
    const indices = [];
    for (const pool of pools) {
      const base = positions.length / 3;
      for (let ring = 0; ring <= rings; ring++) {
        const radius = ring / rings;
        for (let segment = 0; segment < segments; segment++) {
          const a = segment / segments * Math.PI * 2;
          const irregularity = this.engineered ? 0.006 : 0.035;
          const irregular = 1 + irregularity * Math.sin(a * 3 + pool.index * 1.7)
            + irregularity * 0.62 * Math.sin(a * 7 - pool.index * 0.9);
          const along = Math.cos(a) * pool.along * radius * irregular;
          const across = Math.sin(a) * pool.across * radius * irregular;
          positions.push(
            pool.x + pool.tx * along + pool.nx * across,
            pool.surfaceY + 0.012,
            pool.z + pool.tz * along + pool.nz * across,
          );
          uvs.push(0.5 + Math.cos(a) * radius * 0.5, 0.5 + Math.sin(a) * radius * 0.5);
          edge.push(1 - radius);
        }
      }
      for (let ring = 0; ring < rings; ring++) {
        for (let segment = 0; segment < segments; segment++) {
          const next = (segment + 1) % segments;
          const a = base + ring * segments + segment;
          const b = base + ring * segments + next;
          const c = base + (ring + 1) * segments + segment;
          const d = base + (ring + 1) * segments + next;
          indices.push(a, c, d, a, d, b);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('floodEdge', new THREE.Float32BufferAttribute(edge, 1));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  update(dt) { this.time.value += dt; }
  renderReflection() { return false; }
  setTier(tier) { this.tier = tier; }
  setViewportHeight() {}
  setReflectionSize() {}
  stats() {
    return {
      kind: this.engineered ? 'source-basins' : 'floodplain',
      pools: this.terrain.floodPools.length, drawCalls: 1, mirror: 'off',
    };
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.materials.forEach((material) => material.dispose());
  }
}
