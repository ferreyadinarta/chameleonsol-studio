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
        roughness={1}
        metalness={1}
      />
    </mesh>
  );
}

export { TEX_SIZE };
