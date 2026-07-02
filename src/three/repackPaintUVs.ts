import * as THREE from 'three';

// This rig's UV atlas packs body parts tightly enough that different limbs'
// islands actually overlap in UV space (e.g. LeftShoulder and RightLeg share
// pixels) — a property of the source asset, not of how we raycast/paint. A
// canvas-per-mesh paint texture samples whatever UV the surface reports, so
// painting one limb visibly "leaks" onto whichever other limb shares that
// UV region. Fixed by giving each body-part group its own exclusive cell in
// a fresh UV layout at load time, so no two parts can ever share a pixel
// again — done once, before the mesh is registered for painting.

const REGION_BONES: Record<string, string[]> = {
  head: ['Head_05', 'Neck_04', 'HeadTop_End_06'],
  torso: ['Root_00', 'Spine_01', 'Spine1_02', 'Spine2_03'],
  leftArm: ['LeftShoulder_07', 'LeftArm_08', 'LeftForeArm_09', 'LeftHand_010'],
  rightArm: ['RightShoulder_011', 'RightArm_012', 'RightForeArm_013', 'RightHand_014'],
  leftLeg: ['LeftUpLeg_015', 'LeftLeg_016', 'LeftFoot_017'],
  rightLeg: ['RightUpLeg_018', 'RightLeg_019', 'RightFoot_020'],
};

// 3x2 grid — six regions, each gets an exclusive rectangle of the atlas.
const GRID_COLS = 3;
const CELL_PAD = 0.01; // a hair of margin so a brush right at a region's edge can't bleed into the next cell
const REGIONS = Object.keys(REGION_BONES);

export function repackPaintUVs(mesh: THREE.SkinnedMesh): void {
  const geom = mesh.geometry;
  const uv = geom.attributes.uv as THREE.BufferAttribute | undefined;
  const skinIndex = geom.attributes.skinIndex as THREE.BufferAttribute | undefined;
  const skinWeight = geom.attributes.skinWeight as THREE.BufferAttribute | undefined;
  const skeleton = mesh.skeleton;
  if (!uv || !skinIndex || !skinWeight || !skeleton) return;

  const boneNames = skeleton.bones.map((b) => b.name);
  const regionOfBone = new Map<string, string>();
  for (const region of REGIONS) {
    for (const name of REGION_BONES[region]) regionOfBone.set(name, region);
  }

  // dominant-bone region per vertex, and original UV bounds per region
  const vertexCount = uv.count;
  const vertexRegion = new Array<string>(vertexCount);
  const bounds: Record<string, { minU: number; maxU: number; minV: number; maxV: number }> = {};
  for (const region of REGIONS) bounds[region] = { minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity };

  for (let i = 0; i < vertexCount; i++) {
    let bestBoneIdx = 0;
    let bestWeight = -1;
    for (let k = 0; k < 4; k++) {
      const w = skinWeight.getComponent(i, k);
      if (w > bestWeight) {
        bestWeight = w;
        bestBoneIdx = skinIndex.getComponent(i, k);
      }
    }
    const boneName = boneNames[bestBoneIdx];
    const region = (boneName && regionOfBone.get(boneName)) || 'torso'; // fallback: unmapped bones (e.g. root) join torso
    vertexRegion[i] = region;
    const u = uv.getX(i);
    const v = uv.getY(i);
    const b = bounds[region];
    if (u < b.minU) b.minU = u;
    if (u > b.maxU) b.maxU = u;
    if (v < b.minV) b.minV = v;
    if (v > b.maxV) b.maxV = v;
  }

  // assign each region a cell in a simple grid — correctness (no overlap)
  // matters far more here than packing efficiency.
  const cellOf: Record<string, { x: number; y: number; w: number; h: number }> = {};
  const rows = Math.ceil(REGIONS.length / GRID_COLS);
  const cellW = 1 / GRID_COLS;
  const cellH = 1 / rows;
  REGIONS.forEach((region, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    cellOf[region] = { x: col * cellW, y: row * cellH, w: cellW, h: cellH };
  });

  for (let i = 0; i < vertexCount; i++) {
    const region = vertexRegion[i];
    const b = bounds[region];
    const cell = cellOf[region];
    const spanU = b.maxU - b.minU || 1;
    const spanV = b.maxV - b.minV || 1;
    const localU = (uv.getX(i) - b.minU) / spanU;
    const localV = (uv.getY(i) - b.minV) / spanV;
    const pad = CELL_PAD;
    const newU = cell.x + pad + localU * (cell.w - pad * 2);
    const newV = cell.y + pad + localV * (cell.h - pad * 2);
    uv.setXY(i, newU, newV);
  }
  uv.needsUpdate = true;
}
