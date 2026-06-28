import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { usePaintStore } from '../store/usePaintStore';
import { paintStroke, sampleAlbedo, resetCanvases, paintableMeshes, TEX_SIZE, type PaintCanvases } from './PaintablePart';

type GestureSnapshot = Map<THREE.Mesh, { albedo: ImageData; orm: ImageData }>;

const UNDO_LIMIT = 20;

export default function PaintController() {
  const { gl, camera, scene } = useThree();
  const paintingRef = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const undoStackRef = useRef<GestureSnapshot[]>([]);
  const currentGestureRef = useRef<GestureSnapshot | null>(null);

  useEffect(() => {
    const dom = gl.domElement;

    const markDirty = (mesh: THREE.Mesh) => {
      (mesh.userData.albedoTexture as THREE.CanvasTexture).needsUpdate = true;
      (mesh.userData.ormTexture as THREE.CanvasTexture).needsUpdate = true;
    };

    const snapshotMesh = (mesh: THREE.Mesh) => {
      const canvases = mesh.userData.canvases as PaintCanvases;
      return {
        albedo: canvases.albedoCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE),
        orm: canvases.ormCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE),
      };
    };

    const unsubUndo = usePaintStore.subscribe((state, prev) => {
      if (state.undoSignal === prev.undoSignal) return;
      const gesture = undoStackRef.current.pop();
      if (!gesture) return;
      gesture.forEach((snap, mesh) => {
        const canvases = mesh.userData.canvases as PaintCanvases;
        canvases.albedoCtx.putImageData(snap.albedo, 0, 0);
        canvases.ormCtx.putImageData(snap.orm, 0, 0);
        markDirty(mesh);
      });
    });

    const unsubClear = usePaintStore.subscribe((state, prev) => {
      if (state.clearSignal === prev.clearSignal) return;
      paintableMeshes.forEach((mesh) => {
        resetCanvases(mesh.userData.canvases as PaintCanvases);
        markDirty(mesh);
      });
      undoStackRef.current = [];
    });

    const castAt = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect();
      pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, camera);
      const hits = raycaster.current.intersectObjects(scene.children, true);
      return hits.find((h) => h.object.userData.paintable || h.object.userData.sampleColor);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const { paintMode, tool } = usePaintStore.getState();
      if (!paintMode) return;
      const hit = castAt(e.clientX, e.clientY);
      if (!hit) return;

      if (tool === 'eyedropper') {
        let hex: string | null = null;
        if (hit.object.userData.paintable && hit.uv) {
          hex = sampleAlbedo(hit.object.userData.canvases as PaintCanvases, hit.uv);
        } else if (hit.object.userData.sampleColor) {
          hex = hit.object.userData.sampleColor();
        }
        if (hex) usePaintStore.getState().setColor(hex);
        return;
      }

      if (hit.object.userData.paintable && hit.uv) {
        paintingRef.current = true;
        currentGestureRef.current = new Map();
        applyStroke(hit.object as THREE.Mesh, hit.uv);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!paintingRef.current) return;
      const hit = castAt(e.clientX, e.clientY);
      if (hit && hit.object.userData.paintable && hit.uv) {
        applyStroke(hit.object as THREE.Mesh, hit.uv);
      }
    };

    const onUp = () => {
      paintingRef.current = false;
      const gesture = currentGestureRef.current;
      currentGestureRef.current = null;
      if (gesture && gesture.size > 0) {
        undoStackRef.current.push(gesture);
        if (undoStackRef.current.length > UNDO_LIMIT) undoStackRef.current.shift();
      }
    };

    function applyStroke(mesh: THREE.Mesh, uv: THREE.Vector2) {
      const gesture = currentGestureRef.current;
      if (gesture && !gesture.has(mesh)) {
        gesture.set(mesh, snapshotMesh(mesh));
      }
      const { tool, color, metalness, roughness, brushSize } = usePaintStore.getState();
      const canvases = mesh.userData.canvases as PaintCanvases;
      paintStroke(canvases, uv, color, metalness, roughness, brushSize, tool === 'eraser');
      markDirty(mesh);
    }

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      unsubUndo();
      unsubClear();
    };
  }, [gl, camera, scene]);

  return null;
}
