import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const TEX_SIZE = 512;
export const CLAY_COLOR = '#f1ece1';
export const CLAY_ROUGHNESS = 0.85;
export const CLAY_METALNESS = 0.04;

export type PaintCanvases = {
  albedo: HTMLCanvasElement;
  orm: HTMLCanvasElement;
  albedoCtx: CanvasRenderingContext2D;
  ormCtx: CanvasRenderingContext2D;
};

export function resetCanvases(canvases: PaintCanvases) {
  canvases.albedoCtx.fillStyle = CLAY_COLOR;
  canvases.albedoCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  canvases.ormCtx.fillStyle = `rgb(0, ${Math.round(CLAY_ROUGHNESS * 255)}, ${Math.round(CLAY_METALNESS * 255)})`;
  canvases.ormCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
}

function makeCanvases(): PaintCanvases {
  const albedo = document.createElement('canvas');
  albedo.width = TEX_SIZE;
  albedo.height = TEX_SIZE;
  const albedoCtx = albedo.getContext('2d')!;

  const orm = document.createElement('canvas');
  orm.width = TEX_SIZE;
  orm.height = TEX_SIZE;
  const ormCtx = orm.getContext('2d')!;

  const canvases = { albedo, orm, albedoCtx, ormCtx };
  resetCanvases(canvases);
  return canvases;
}

export const paintableMeshes = new Set<THREE.Mesh>();

// Make an arbitrary (e.g. loaded GLB) mesh paintable: give it its own clay
// paint canvas, swap in a paint material, and register it for raycasting.
// Returns a cleanup that unregisters + disposes.
export function attachPaintToMesh(mesh: THREE.Mesh): () => void {
  const canvases = makeCanvases();
  const albedoTexture = new THREE.CanvasTexture(canvases.albedo);
  albedoTexture.colorSpace = THREE.SRGBColorSpace;
  const ormTexture = new THREE.CanvasTexture(canvases.orm);

  // Keep flipY at its default (true) so paint lands where the cursor is:
  // paintStroke writes at canvas y = (1 - uv.y), which a flipY=true texture
  // samples back to the same uv — matching the procedural parts.

  const material = new THREE.MeshStandardMaterial({
    map: albedoTexture,
    roughnessMap: ormTexture,
    metalnessMap: ormTexture,
    bumpMap: getClayBump(),
    bumpScale: 0.01,
    roughness: 1,
    metalness: 1,
  });

  const prevMaterial = mesh.material;
  mesh.material = material;
  mesh.userData.canvases = canvases;
  mesh.userData.albedoTexture = albedoTexture;
  mesh.userData.ormTexture = ormTexture;
  mesh.userData.paintable = true;
  paintableMeshes.add(mesh);

  return () => {
    paintableMeshes.delete(mesh);
    mesh.material = prevMaterial;
    material.dispose();
    albedoTexture.dispose();
    ormTexture.dispose();
  };
}

// Shared striated bump map — mimics the layered, hand-sculpted clay surface
// of the Meccha Chameleon figures. Stays under any paint the user applies.
let clayBumpTexture: THREE.CanvasTexture | null = null;
export function getClayBump(): THREE.CanvasTexture {
  if (clayBumpTexture) return clayBumpTexture;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 1) {
    const wobble = Math.sin(y * 0.7) * 6 + Math.sin(y * 0.21) * 10;
    const shade = 128 + wobble;
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    ctx.fillRect(0, y, size, 1);
  }
  // faint speckle for a matte hand-finished feel
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 128 + (Math.random() - 0.5) * 40;
    ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
    ctx.fillRect(x, y, 1, 1);
  }
  clayBumpTexture = new THREE.CanvasTexture(c);
  clayBumpTexture.wrapS = THREE.RepeatWrapping;
  clayBumpTexture.wrapT = THREE.RepeatWrapping;
  clayBumpTexture.repeat.set(3, 3);
  return clayBumpTexture;
}

export type PaintSnapshot = { albedo: string; orm: string }[];

// Serialize every paintable mesh's canvases to PNG data URLs (insertion order).
export function serializePaintState(): PaintSnapshot {
  return [...paintableMeshes].map((mesh) => {
    const c = mesh.userData.canvases as PaintCanvases;
    return { albedo: c.albedo.toDataURL('image/png'), orm: c.orm.toDataURL('image/png') };
  });
}

// Restore paint from a snapshot onto the current paintable meshes (same order).
export async function restorePaintState(data: PaintSnapshot): Promise<void> {
  const meshes = [...paintableMeshes];
  const drawInto = (url: string, ctx: CanvasRenderingContext2D) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
        ctx.drawImage(img, 0, 0, TEX_SIZE, TEX_SIZE);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });

  await Promise.all(
    meshes.map(async (mesh, i) => {
      const snap = data[i];
      if (!snap) return;
      const c = mesh.userData.canvases as PaintCanvases;
      await Promise.all([drawInto(snap.albedo, c.albedoCtx), drawInto(snap.orm, c.ormCtx)]);
      (mesh.userData.albedoTexture as THREE.CanvasTexture).needsUpdate = true;
      (mesh.userData.ormTexture as THREE.CanvasTexture).needsUpdate = true;
    }),
  );
}

export function paintStroke(
  canvases: PaintCanvases,
  uv: THREE.Vector2,
  color: string,
  metalness: number,
  roughness: number,
  brushSize: number,
  erase: boolean,
) {
  const x = uv.x * TEX_SIZE;
  const y = (1 - uv.y) * TEX_SIZE;
  const radius = Math.max(2, brushSize * TEX_SIZE * 0.5);

  canvases.albedoCtx.beginPath();
  canvases.albedoCtx.arc(x, y, radius, 0, Math.PI * 2);
  canvases.albedoCtx.fillStyle = erase ? CLAY_COLOR : color;
  canvases.albedoCtx.fill();

  canvases.ormCtx.beginPath();
  canvases.ormCtx.arc(x, y, radius, 0, Math.PI * 2);
  const r = erase ? CLAY_ROUGHNESS : roughness;
  const m = erase ? CLAY_METALNESS : metalness;
  canvases.ormCtx.fillStyle = `rgb(0, ${Math.round(r * 255)}, ${Math.round(m * 255)})`;
  canvases.ormCtx.fill();
}

export function sampleAlbedo(canvases: PaintCanvases, uv: THREE.Vector2): string {
  const x = Math.min(TEX_SIZE - 1, Math.max(0, Math.floor(uv.x * TEX_SIZE)));
  const y = Math.min(TEX_SIZE - 1, Math.max(0, Math.floor((1 - uv.y) * TEX_SIZE)));
  const data = canvases.albedoCtx.getImageData(x, y, 1, 1).data;
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(data[0])}${toHex(data[1])}${toHex(data[2])}`;
}

type Props = {
  geometry: THREE.BufferGeometry;
};

export default function PaintablePart({ geometry }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const canvases = useMemo(() => makeCanvases(), []);
  const albedoTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvases.albedo);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [canvases]);
  const ormTexture = useMemo(() => new THREE.CanvasTexture(canvases.orm), [canvases]);
  const bumpTexture = useMemo(() => getClayBump(), []);

  return (
    <mesh
      ref={(m) => {
        if (m) {
          m.userData.canvases = canvases;
          m.userData.albedoTexture = albedoTexture;
          m.userData.ormTexture = ormTexture;
          m.userData.paintable = true;
          paintableMeshes.add(m);
        } else if (meshRef.current) {
          paintableMeshes.delete(meshRef.current);
        }
        meshRef.current = m;
      }}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        map={albedoTexture}
        roughnessMap={ormTexture}
        metalnessMap={ormTexture}
        bumpMap={bumpTexture}
        bumpScale={0.012}
        roughness={1}
        metalness={1}
      />
    </mesh>
  );
}

export { TEX_SIZE };
