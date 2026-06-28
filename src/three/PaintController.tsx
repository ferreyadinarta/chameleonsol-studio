import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { usePaintStore } from '../store/usePaintStore';
import { paintStroke, sampleAlbedo, type PaintCanvases } from './PaintablePart';

export default function PaintController() {
  const { gl, camera, scene } = useThree();
  const paintingRef = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  useEffect(() => {
    const dom = gl.domElement;

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
    };

    function applyStroke(mesh: THREE.Mesh, uv: THREE.Vector2) {
      const { tool, color, metalness, roughness, brushSize } = usePaintStore.getState();
      const canvases = mesh.userData.canvases as PaintCanvases;
      paintStroke(canvases, uv, color, metalness, roughness, brushSize, tool === 'eraser');
      (mesh.userData.albedoTexture as THREE.CanvasTexture).needsUpdate = true;
      (mesh.userData.ormTexture as THREE.CanvasTexture).needsUpdate = true;
    }

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl, camera, scene]);

  return null;
}
