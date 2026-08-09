import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _euler = new THREE.Euler();

function place(list, geometry, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  _position.set(...position);
  _rotation.setFromEuler(_euler.set(...rotation, 'YXZ'));
  _scale.set(...scale);
  _matrix.compose(_position, _rotation, _scale);
  const copy = geometry.clone();
  copy.applyMatrix4(_matrix);
  list.push(copy);
}

function marker({ terrain, trail, t, side, stone, alloy, anchor, ringScale = 1 }) {
  const p = trail.pointAt(t, new THREE.Vector3());
  const tan = trail.tangentAt(t, new THREE.Vector3());
  p.x += -tan.z * side;
  p.z += tan.x * side;
  p.y = terrain.height(p.x, p.z);
  const yaw = Math.atan2(tan.x, tan.z);
  place(stone, new THREE.BoxGeometry(0.82, 1.9, 0.58, 1, 2, 1),
    [p.x, p.y + 0.82, p.z], [0.025, yaw, -0.02]);
  place(alloy, new THREE.TorusGeometry(0.27 * ringScale, 0.025, 7, 28),
    [p.x, p.y + 1.16, p.z], [0, yaw, 0]);
  anchor.set(p.x, p.y + 1.15, p.z);
}

export class ChapterLandmarks {
  constructor(terrain, trail, chapter, tier = 'high') {
    this.root = new THREE.Group();
    this.root.name = `chapter-landmark-${chapter.id}`;
    this.observationAnchors = {};
    this.materials = [];

    const stone = [];
    const alloy = [];
    const patina = [];
    const reflection = [];
    const deadwood = [];
    const box = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, tier === 'low' ? 10 : 16, 1);
    const ring = new THREE.TorusGeometry(1, 0.12, tier === 'low' ? 6 : 8, tier === 'low' ? 24 : 40);

    if (chapter.number === 2) this._floodedThreshold(terrain, trail,
      { stone, alloy, patina, reflection, deadwood, box, cylinder, ring });
    if (chapter.number === 3) this._listeningRidge(terrain, trail, { stone, alloy, patina, box, cylinder, ring });
    if (chapter.number === 4) this._sourceEngine(terrain, trail, { stone, alloy, patina, box, cylinder, ring });

    const addMerged = (name, geometries, material) => {
      if (!geometries.length) return;
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach((item) => item.dispose());
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      mesh.castShadow = !material.transparent;
      mesh.receiveShadow = true;
      this.root.add(mesh);
      this.materials.push(material);
    };
    addMerged('chapter-stone', stone, new THREE.MeshStandardMaterial({
      color: 0x626557, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.44,
    }));
    addMerged('chapter-alloy', alloy, new THREE.MeshStandardMaterial({
      color: 0xc9a15f, roughness: 0.26, metalness: 0.86, envMapIntensity: 1.24,
    }));
    addMerged('chapter-patina', patina, new THREE.MeshStandardMaterial({
      color: 0x326453, roughness: 0.68, metalness: 0.40, envMapIntensity: 0.46,
    }));
    addMerged('chapter-controlled-reflection', reflection, new THREE.MeshBasicMaterial({
      color: 0x263934, transparent: true, opacity: 0.16, depthWrite: false,
      side: THREE.DoubleSide,
    }));
    addMerged('chapter-deadwood', deadwood, new THREE.MeshStandardMaterial({
      color: 0x4b493e, roughness: 1, metalness: 0, envMapIntensity: 0.16,
    }));
    this._buildSurveyMarkers(terrain, trail, chapter);
  }

  _buildSurveyMarkers(terrain, trail, chapter) {
    this.surveyRoot = new THREE.Group();
    this.surveyRoot.name = 'survey-markers';
    this.surveyRoot.visible = false;
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x343a33, roughness: 0.94, metalness: 0.01, envMapIntensity: 0.24,
    });
    const alloyMaterial = new THREE.MeshStandardMaterial({
      color: 0xaa8248, roughness: 0.38, metalness: 0.78, envMapIntensity: 0.72,
    });
    this.materials.push(stoneMaterial, alloyMaterial);
    const baseGeometry = new THREE.BoxGeometry(0.54, 1.26, 0.44);
    const ringGeometry = new THREE.TorusGeometry(0.18, 0.018, 6, 20);
    const bases = new THREE.InstancedMesh(baseGeometry, stoneMaterial, chapter.surveyAnchors.length);
    const rings = new THREE.InstancedMesh(ringGeometry, alloyMaterial, chapter.surveyAnchors.length);
    const object = new THREE.Object3D();
    chapter.surveyAnchors.forEach((t, index) => {
      const p = trail.pointAt(t, new THREE.Vector3());
      const tan = trail.tangentAt(t, new THREE.Vector3());
      const side = index % 2 ? 2.45 : -2.45;
      p.x += -tan.z * side;
      p.z += tan.x * side;
      p.y = terrain.height(p.x, p.z);
      const yaw = Math.atan2(tan.x, tan.z);
      object.position.set(p.x, p.y + 0.52, p.z);
      object.rotation.set(0.025, yaw, index % 2 ? 0.025 : -0.025);
      object.updateMatrix();
      bases.setMatrixAt(index, object.matrix);
      object.position.set(p.x, p.y + 0.72, p.z);
      object.rotation.set(0, yaw, 0);
      object.updateMatrix();
      rings.setMatrixAt(index, object.matrix);
      this.observationAnchors[`survey-${index}`] = new THREE.Vector3(p.x, p.y + 0.72, p.z);
    });
    bases.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
    bases.castShadow = true;
    bases.receiveShadow = true;
    this.surveyRoot.add(bases, rings);
    this.root.add(this.surveyRoot);
  }

  setSurveyVisible(visible) { if (this.surveyRoot) this.surveyRoot.visible = visible; }

  _floodedThreshold(terrain, trail, g) {
    const deadTreeSpecs = [
      [0.08, -8.0, 8.5, -0.05], [0.16, 10.5, 12.0, 0.04],
      [0.27, -11.0, 10.0, 0.03], [0.34, -7.8, 13.5, -0.04],
      [0.46, 9.4, 8.0, 0.05], [0.57, -10.2, 11.5, -0.02],
      [0.68, 8.2, 12.5, 0.04], [0.79, 11.0, 9.0, -0.04],
      [0.86, -8.0, 11.0, 0.03],
    ];
    deadTreeSpecs.forEach(([t, side, height, lean], index) => {
      const p = trail.pointAt(t, new THREE.Vector3());
      const tangent = trail.tangentAt(t, new THREE.Vector3()).normalize();
      p.x += -tangent.z * side;
      p.z += tangent.x * side;
      p.y = terrain.height(p.x, p.z);
      const radius = 0.22 + (index % 3) * 0.07;
      place(g.deadwood, g.cylinder,
        [p.x, p.y + height * 0.5, p.z], [lean, index * 0.71, lean * 0.7],
        [radius, height, radius * 0.9]);
      if (index % 2 === 0) {
        place(g.deadwood, g.cylinder,
          [p.x + 0.35, p.y + height * 0.72, p.z],
          [Math.PI * 0.42, index * 0.71, 0.18], [radius * 0.42, 2.2, radius * 0.42]);
      }
    });

    const centre = trail.pointAt(0.91, new THREE.Vector3());
    const tan = trail.tangentAt(0.91, new THREE.Vector3()).normalize();
    const nx = -tan.z, nz = tan.x;
    const yaw = Math.atan2(tan.x, tan.z);
    const groundY = terrain.height(centre.x, centre.z);
    for (const side of [-1, 1]) {
      const x = centre.x + nx * side * 6.6;
      const z = centre.z + nz * side * 6.6;
      const y = terrain.height(x, z);
      place(g.stone, g.box, [x, y + 3.2, z], [0, yaw, side * 0.025], [2.1, 7.6, 2.35]);
      place(g.alloy, g.box,
        [x - nx * side * 1.08 + tan.x * 1.18, y + 3.1, z - nz * side * 1.08 + tan.z * 1.18],
        [0, yaw, 0], [0.10, 4.8, 0.05]);
      place(g.patina, g.box,
        [x - nx * side * 1.08 + tan.x * 1.22, y + 2.1, z - nz * side * 1.08 + tan.z * 1.22],
        [0, yaw, 0], [0.17, 0.48, 0.06]);
      place(g.reflection, g.box, [x, y - 1.8, z], [0, yaw, 0], [1.95, 3.0, 2.05]);
    }
    place(g.stone, g.box,
      [centre.x, groundY + 6.55, centre.z], [0.02, yaw, -0.025], [12.8, 1.35, 2.2]);
    place(g.alloy, g.ring,
      [centre.x + tan.x * 1.15, groundY + 6.4, centre.z + tan.z * 1.15],
      [0, yaw, 0], [1.3, 1.3, 1.3]);
    place(g.reflection, g.box,
      [centre.x, groundY - 3.2, centre.z], [0, yaw, 0], [11.2, 0.65, 1.9]);

    marker({ terrain, trail, t: 0.34, side: -2.8, stone: g.stone, alloy: g.alloy,
      anchor: this.observationAnchors.drownedDatum = new THREE.Vector3() });
    marker({ terrain, trail, t: 0.62, side: 2.9, stone: g.stone, alloy: g.alloy,
      anchor: this.observationAnchors.thresholdDrain = new THREE.Vector3(), ringScale: 0.82 });
    this.observationAnchors.reflectionNotch = new THREE.Vector3(
      centre.x + tan.x * 1.15, groundY + 6.4, centre.z + tan.z * 1.15,
    );
    const reflectionViewpoint = trail.pointAt(0.89, new THREE.Vector3());
    reflectionViewpoint.y = terrain.height(reflectionViewpoint.x, reflectionViewpoint.z) + 0.055;
    this.observationAnchors.reflectionViewpoint = reflectionViewpoint;
  }

  _listeningRidge(terrain, trail, g) {
    const ridgeStoneSpecs = [
      [0.12, -6.8, 2.4, 1.8], [0.20, 7.5, 3.6, 2.1],
      [0.31, -8.2, 4.8, 2.5], [0.39, 6.7, 2.8, 1.7],
      [0.51, 8.8, 5.2, 2.6], [0.58, -7.2, 3.5, 2.0],
      [0.70, -9.0, 5.8, 2.8], [0.78, 7.4, 4.1, 2.1],
    ];
    ridgeStoneSpecs.forEach(([t, side, height, width], index) => {
      const p = trail.pointAt(t, new THREE.Vector3());
      const tangent = trail.tangentAt(t, new THREE.Vector3()).normalize();
      p.x += -tangent.z * side;
      p.z += tangent.x * side;
      p.y = terrain.height(p.x, p.z);
      place(g.stone, g.box, [p.x, p.y + height * 0.42, p.z],
        [0.12 + index * 0.035, index * 0.83, side > 0 ? 0.18 : -0.16],
        [width, height, width * (0.48 + (index % 3) * 0.12)]);
    });

    const y = terrain.height(0, -365);
    const z = -366;
    for (const x of [-4.0, 4.0]) {
      place(g.stone, g.cylinder, [x, y + 7.0, z], [0, 0, 0], [2.0, 14.0, 2.0]);
      place(g.stone, g.box, [x, y + 14.0, z], [0, 0, 0], [3.8, 0.75, 3.8]);
      place(g.alloy, g.ring, [x, y + 9.0, z + 1.94], [0, 0, 0], [1.0, 1.0, 1.0]);
      place(g.patina, g.ring, [x, y + 9.0, z + 2.0], [0, 0, 0], [0.70, 0.70, 0.70]);
    }
    marker({ terrain, trail, t: 0.42, side: -2.7, stone: g.stone, alloy: g.alloy,
      anchor: this.observationAnchors.westResonator = new THREE.Vector3() });
    marker({ terrain, trail, t: 0.68, side: 2.8, stone: g.stone, alloy: g.alloy,
      anchor: this.observationAnchors.eastResonator = new THREE.Vector3() });
    this.observationAnchors.listeningAxis = new THREE.Vector3(0, y + 9.0, z + 1.9);
    const listeningViewpoint = trail.pointAt(0.90, new THREE.Vector3());
    listeningViewpoint.y = terrain.height(listeningViewpoint.x, listeningViewpoint.z) + 0.055;
    this.observationAnchors.listeningViewpoint = listeningViewpoint;
  }

  _sourceEngine(terrain, trail, g) {
    const channelSpecs = [[0.24, -2.35, 13], [0.43, 2.35, 16], [0.65, -2.35, 15], [0.80, 2.35, 12]];
    channelSpecs.forEach(([t, side, length]) => {
      const p = trail.pointAt(t, new THREE.Vector3());
      const tangent = trail.tangentAt(t, new THREE.Vector3()).normalize();
      p.x += -tangent.z * side;
      p.z += tangent.x * side;
      p.y = terrain.height(p.x, p.z);
      const yaw = Math.atan2(tangent.x, tangent.z);
      place(g.stone, g.box, [p.x, p.y + 0.25, p.z], [0, yaw, 0], [0.42, 0.50, length]);
      place(g.alloy, g.box,
        [p.x + -tangent.z * Math.sign(side) * 0.23, p.y + 0.52,
          p.z + tangent.x * Math.sign(side) * 0.23],
        [0, yaw, 0], [0.055, 0.05, length * 0.94]);
    });

    const y = terrain.height(0, -375);
    const z = -375;
    for (const x of [-6.6, 6.6]) {
      place(g.stone, g.box, [x, y + 0.45, z], [0, 0, 0], [8.8, 1.35, 6.0]);
    }
    for (const x of [-9.2, -4.6, 4.6, 9.2]) {
      const height = 9.6 - Math.abs(x) * 0.13;
      place(g.stone, g.box, [x, y + height * 0.5 + 1.0, z], [0, 0, x * 0.004], [2.25, height, 2.35]);
      place(g.alloy, g.box, [x, y + height * 0.68 + 1.0, z + 1.21], [0, 0, 0], [0.18, 2.4, 0.06]);
    }
    for (const radius of [2.1, 3.5, 5.0]) {
      place(g.alloy, g.ring, [0, y + 7.4, z + 1.35], [0, 0, 0], [radius, radius, radius]);
    }
    place(g.patina, g.ring, [0, y + 7.4, z + 1.42], [0, 0, 0], [4.25, 4.25, 4.25]);
    for (const x of [-6.8, 0, 6.8]) {
      place(g.alloy, g.box, [x, y + 2.08, z + 3.9], [0, 0, 0], [0.13, 0.10, 6.5]);
    }
    marker({ terrain, trail, t: 0.35, side: 2.8, stone: g.stone, alloy: g.alloy,
      anchor: this.observationAnchors.intakeRing = new THREE.Vector3() });
    marker({ terrain, trail, t: 0.64, side: -2.7, stone: g.stone, alloy: g.alloy,
      anchor: this.observationAnchors.balanceChannel = new THREE.Vector3(), ringScale: 0.88 });
    this.observationAnchors.sourceOrder = new THREE.Vector3(0, y + 7.4, z + 1.45);
    const sourceViewpoint = trail.pointAt(0.90, new THREE.Vector3());
    sourceViewpoint.y = terrain.height(sourceViewpoint.x, sourceViewpoint.z) + 0.055;
    this.observationAnchors.sourceViewpoint = sourceViewpoint;
  }

  dispose() {
    this.root.traverse((object) => object.geometry?.dispose?.());
    this.materials.forEach((material) => material.dispose());
  }
}
