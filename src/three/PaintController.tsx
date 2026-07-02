import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { usePaintStore } from '../store/usePaintStore';
import { usePoseStore } from '../store/usePoseStore';
import { paintStroke, resetCanvases, paintableMeshes, getPaintableMeshArray, TEX_SIZE, type PaintCanvases } from './PaintablePart';
import { spawnPaintBlobs } from './PaintBlobs';
import { useStageStore } from '../store/useStageStore';
import { ensureBgSampler, sampleBgAt } from '../utils/bgSampler';
import { brushHover } from './brushHover';
import { cameraRig } from './cameraRig';
import { pushUndo, popUndo, clearPaintUndo, type PaintGesture } from '../utils/undoStack';

type GestureSnapshot = PaintGesture;

const BRUSH_MIN = 0.02;
const BRUSH_MAX = 0.35;

export default function PaintController() {
  const { gl, camera, scene } = useThree();
  const paintingRef = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const currentGestureRef = useRef<GestureSnapshot | null>(null);
  // Raw pointermove events just queue points here; the actual raycast + canvas
  // draw work happens once per rendered frame (see useFrame below). Without
  // this, a high-poll-rate mouse (500-1000Hz on many Windows machines, vs.
  // ~60-125Hz for most trackpads) fires the same expensive work many times
  // between two rendered frames for zero visual benefit — only the last state
  // before a render is ever seen — which was the source of paint-mode lag,
  // worse the weaker the CPU.
  const pendingPointsRef = useRef<{ x: number; y: number }[]>([]);
  const drainRef = useRef<() => void>(() => {});

  useFrame(() => {
    if (pendingPointsRef.current.length) drainRef.current();
  });

  useEffect(() => {
    const dom = gl.domElement;
    let lastPaintX = 0;
    let lastPaintY = 0;

    // Space is reserved for camera pan and Shift for orbit (matches Scene's
    // OrbitControls mapping) — tracked locally so paint never fights those.
    let spaceDown = false;
    let shiftDown = false;
    const spaceKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown = true;
      if (e.key === 'Shift') shiftDown = true;
    };
    const spaceKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown = false;
      if (e.key === 'Shift') shiftDown = false;
    };
    window.addEventListener('keydown', spaceKeyDown);
    window.addEventListener('keyup', spaceKeyUp);

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
      const entry = popUndo();
      if (!entry) return;
      if (entry.kind === 'paint') {
        entry.gesture.forEach((snap, mesh) => {
          const canvases = mesh.userData.canvases as PaintCanvases;
          canvases.albedoCtx.putImageData(snap.albedo, 0, 0);
          canvases.ormCtx.putImageData(snap.orm, 0, 0);
          markDirty(mesh);
        });
      } else {
        const st = useStageStore.getState();
        st.setCharX(entry.prev.charX);
        st.setCharY(entry.prev.charY);
        st.setCharZ(entry.prev.charZ);
        st.setCharRotY(entry.prev.charRotY);
        st.setCharScale(entry.prev.charScale);
        usePoseStore.getState().setLockedPose(entry.prev.lockedPoseId);
      }
    });

    const unsubClear = usePaintStore.subscribe((state, prev) => {
      if (state.clearSignal === prev.clearSignal) return;
      paintableMeshes.forEach((mesh) => {
        resetCanvases(mesh.userData.canvases as PaintCanvases);
        markDirty(mesh);
      });
      clearPaintUndo();
    });

    // Brush/eraser only need the paintable meshes — a flat, non-recursive
    // raycast against ~16 meshes instead of walking the whole scene graph
    // (lights, environment, shadows) on every pointer move.
    const castPaintable = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect();
      pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, camera);
      const hits = raycaster.current.intersectObjects(getPaintableMeshArray(), false);
      return hits[0];
    };

    // Eyedropper is a rare, single click — fine to walk the full scene so it
    // can also sample the backdrop/floor colors.
    const castAny = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect();
      pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, camera);
      const hits = raycaster.current.intersectObjects(scene.children, true);
      return hits.find((h) => h.object.userData.paintable || h.object.userData.sampleColor);
    };

    // Right-drag resizes the brush — matches the reference game: drag right
    // to grow, left to shrink. The 3D ring cursor is frozen at the point
    // where the drag started so you can watch it grow/shrink in place.
    // Pointer Lock hides the OS cursor and reports only relative movement
    // for the duration of the drag, so the cursor doesn't visibly fly across
    // the screen and jump to a new spot once you release the button.
    let resizing = false;
    let resizeAccumX = 0;
    let resizeStartSize = 0;

    const onDown = (e: PointerEvent) => {
      const { paintMode, tool } = usePaintStore.getState();
      if (!paintMode) return;
      const resizable = tool === 'brush' || tool === 'eraser';

      if (e.button === 2 && resizable) {
        e.preventDefault();
        resizing = true;
        resizeAccumX = 0;
        resizeStartSize = usePaintStore.getState().brushSize;
        const hit = castPaintable(e.clientX, e.clientY);
        if (hit) setBrushHoverFromHit(hit);
        else fallbackBrushHover();
        // Best-effort: resizing works fine off relative movementX even if the
        // browser refuses the lock (e.g. no genuine user gesture context).
        void dom.requestPointerLock?.()?.catch?.(() => {});
        return;
      }

      if (e.button !== 0 || spaceDown || shiftDown) return; // Space/Shift+drag are reserved for camera controls

      if (tool === 'eyedropper') {
        const hex = sampleAt(e.clientX, e.clientY);
        if (hex) usePaintStore.getState().setColor(hex);
        return;
      }

      const hit = castPaintable(e.clientX, e.clientY);
      if (hit && hit.uv) {
        paintingRef.current = true;
        currentGestureRef.current = new Map();
        pendingPointsRef.current.length = 0;
        lastPaintX = e.clientX;
        lastPaintY = e.clientY;
        applyStroke(hit.object as THREE.Mesh, hit.uv, hit);
      }
    };

    // Reads the exact rendered pixel from the WebGL framebuffer (requires
    // preserveDrawingBuffer, already on for PFP capture). This is what makes
    // the eyedropper accurate: sampling the underlying paint texture directly
    // would return the flat, unlit hex, which can visibly differ from what's
    // on screen once shading/gradient is applied to the model.
    const pixelBuf = new Uint8Array(4);
    const readGLPixel = (clientX: number, clientY: number): string => {
      const rect = dom.getBoundingClientRect();
      const px = Math.round(((clientX - rect.left) / rect.width) * dom.width);
      const py = Math.round(((clientY - rect.top) / rect.height) * dom.height);
      const ctx = gl.getContext();
      ctx.readPixels(px, dom.height - py - 1, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixelBuf);
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(pixelBuf[0])}${toHex(pixelBuf[1])}${toHex(pixelBuf[2])}`;
    };

    let hoverScheduled = false;
    const sampleAt = (clientX: number, clientY: number): string | null => {
      const hit = castAny(clientX, clientY);
      if (hit) return readGLPixel(clientX, clientY);
      // missed the 3D scene — sample the uploaded background image if present
      const bg = useStageStore.getState().bgImage;
      if (bg) {
        ensureBgSampler(bg);
        return sampleBgAt(clientX, clientY, dom.getBoundingClientRect());
      }
      return null;
    };

    const sampleHover = (clientX: number, clientY: number) => {
      const hex = sampleAt(clientX, clientY);
      usePaintStore.getState().setEyedropperHover(hex ? { x: clientX, y: clientY, color: hex } : null);
    };

    // Derives world units per unit of UV distance at the hit triangle — the
    // same tangent-basis math used for normal-map tangents. The brush paints
    // a fixed-radius circle in UV space (see paintStroke), but UV texel
    // density varies hugely across the body, so this is what lets the cursor
    // honestly preview how big a mark will land at THIS spot, not a generic
    // guess for the whole figure.
    const _posA = new THREE.Vector3();
    const _posB = new THREE.Vector3();
    const _posC = new THREE.Vector3();
    const _uvA = new THREE.Vector2();
    const _uvB = new THREE.Vector2();
    const _uvC = new THREE.Vector2();
    const _edge1 = new THREE.Vector3();
    const _edge2 = new THREE.Vector3();
    const _dPdU = new THREE.Vector3();
    const _dPdV = new THREE.Vector3();
    const _worldScale = new THREE.Vector3();
    const uvToWorldScale = (hit: THREE.Intersection): number => {
      const face = hit.face;
      const mesh = hit.object as THREE.Mesh;
      const uvAttr = mesh.geometry.attributes.uv as THREE.BufferAttribute | undefined;
      const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
      if (!face || !uvAttr) return 1;
      _posA.fromBufferAttribute(posAttr, face.a);
      _posB.fromBufferAttribute(posAttr, face.b);
      _posC.fromBufferAttribute(posAttr, face.c);
      _uvA.fromBufferAttribute(uvAttr, face.a);
      _uvB.fromBufferAttribute(uvAttr, face.b);
      _uvC.fromBufferAttribute(uvAttr, face.c);

      const uv1x = _uvB.x - _uvA.x;
      const uv1y = _uvB.y - _uvA.y;
      const uv2x = _uvC.x - _uvA.x;
      const uv2y = _uvC.y - _uvA.y;
      const det = uv1x * uv2y - uv2x * uv1y;
      if (Math.abs(det) < 1e-9) return 1; // degenerate UV triangle — fall back

      _edge1.subVectors(_posB, _posA);
      _edge2.subVectors(_posC, _posA);
      const f = 1 / det;
      _dPdU.copy(_edge1).multiplyScalar(uv2y).addScaledVector(_edge2, -uv1y).multiplyScalar(f);
      _dPdV.copy(_edge2).multiplyScalar(uv1x).addScaledVector(_edge1, -uv2x).multiplyScalar(f);

      const localScale = (_dPdU.length() + _dPdV.length()) / 2;
      mesh.getWorldScale(_worldScale);
      const worldScale = (_worldScale.x + _worldScale.y + _worldScale.z) / 3; // uniform in practice
      return localScale * worldScale;
    };

    const setBrushHoverFromHit = (hit: THREE.Intersection) => {
      brushHover.active = true;
      brushHover.point.copy(hit.point);
      if (hit.face) brushHover.normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
      brushHover.uvToWorldScale = uvToWorldScale(hit);
    };

    // When the cursor isn't over the figure, place the brush on a camera-facing
    // plane at the orbit target's depth so it stays the SAME world (screen) size
    // as when it's on the surface. Reuses the ray set by the last castPaintable.
    const _plane = new THREE.Plane();
    const _planeN = new THREE.Vector3();
    const _target = new THREE.Vector3();
    const _hitP = new THREE.Vector3();
    const fallbackBrushHover = () => {
      _target.set(0, 0.9, 0);
      if (cameraRig.controls) _target.copy(cameraRig.controls.target);
      _planeN.copy(camera.position).sub(_target).normalize();
      _plane.setFromNormalAndCoplanarPoint(_planeN, _target);
      const p = raycaster.current.ray.intersectPlane(_plane, _hitP);
      if (p) {
        brushHover.active = true;
        brushHover.point.copy(_hitP);
        brushHover.normal.copy(_planeN);
      } else {
        brushHover.active = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      const { paintMode, tool } = usePaintStore.getState();
      if (!paintMode) return;

      if (resizing) {
        // Under pointer lock, clientX/Y stay frozen — movementX carries the
        // real relative motion regardless of lock, so use that exclusively.
        resizeAccumX += e.movementX;
        const next = resizeStartSize + (resizeAccumX / 260) * (BRUSH_MAX - BRUSH_MIN);
        usePaintStore.getState().setBrushSize(Math.min(BRUSH_MAX, Math.max(BRUSH_MIN, next)));
        return;
      }

      if (tool === 'eyedropper') {
        if (!hoverScheduled) {
          hoverScheduled = true;
          const { clientX, clientY } = e;
          requestAnimationFrame(() => {
            hoverScheduled = false;
            sampleHover(clientX, clientY);
          });
        }
        return;
      }

      // Painting: queue the point(s) along the actual path (using the
      // browser's coalesced events, so a fast swipe isn't missed between
      // dispatched events) — the raycast + draw work itself happens once per
      // rendered frame in drainPending, not here.
      if (paintingRef.current) {
        const events =
          typeof e.getCoalescedEvents === 'function' && e.getCoalescedEvents().length
            ? e.getCoalescedEvents()
            : [e];
        for (const ev of events) pendingPointsRef.current.push({ x: ev.clientX, y: ev.clientY });
        return;
      }

      // Hovering with brush/eraser: position the 3D cursor (throttled).
      if (!hoverScheduled) {
        hoverScheduled = true;
        const { clientX, clientY } = e;
        requestAnimationFrame(() => {
          hoverScheduled = false;
          const hit = castPaintable(clientX, clientY);
          if (hit) setBrushHoverFromHit(hit);
          else fallbackBrushHover();
        });
      }
    };

    const onLeave = () => {
      usePaintStore.getState().setEyedropperHover(null);
      if (!resizing) brushHover.active = false;
    };

    // Runs once per rendered frame (via useFrame above) instead of once per
    // raw pointermove/coalesced event — see pendingPointsRef comment.
    drainRef.current = () => {
      if (!paintingRef.current) {
        pendingPointsRef.current.length = 0;
        return;
      }
      const pts = pendingPointsRef.current;
      if (!pts.length) return;
      let lastHit: THREE.Intersection | null = null;
      for (const pt of pts) {
        const dx = pt.x - lastPaintX;
        const dy = pt.y - lastPaintY;
        const dist = Math.hypot(dx, dy);
        const steps = Math.min(8, Math.max(1, Math.round(dist / 10)));
        for (let i = 1; i <= steps; i++) {
          const x = lastPaintX + (dx * i) / steps;
          const y = lastPaintY + (dy * i) / steps;
          const hit = castPaintable(x, y);
          if (hit && hit.uv) {
            applyStroke(hit.object as THREE.Mesh, hit.uv, hit);
            lastHit = hit;
          }
        }
        lastPaintX = pt.x;
        lastPaintY = pt.y;
      }
      pts.length = 0;
      if (lastHit) setBrushHoverFromHit(lastHit);
    };

    const onUp = () => {
      if (resizing && document.pointerLockElement === dom) document.exitPointerLock();
      resizing = false;
      paintingRef.current = false;
      pendingPointsRef.current.length = 0;
      const gesture = currentGestureRef.current;
      currentGestureRef.current = null;
      if (gesture && gesture.size > 0) {
        pushUndo({ kind: 'paint', gesture });
      }
    };

    // The canvas is a paint surface, not a page — no native right-click menu.
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    // If the browser force-releases the lock mid-drag (e.g. Escape, or the
    // tab losing focus), stop resizing cleanly instead of getting stuck.
    const onPointerLockChange = () => {
      if (document.pointerLockElement !== dom) resizing = false;
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    function applyStroke(mesh: THREE.Mesh, uv: THREE.Vector2, hit: THREE.Intersection) {
      const gesture = currentGestureRef.current;
      if (gesture && !gesture.has(mesh)) {
        gesture.set(mesh, snapshotMesh(mesh));
      }
      const { tool, color, metalness, roughness, brushSize } = usePaintStore.getState();
      const canvases = mesh.userData.canvases as PaintCanvases;
      paintStroke(canvases, uv, color, metalness, roughness, brushSize, tool === 'eraser');
      markDirty(mesh);

      // Splatter: pop little paint blobs out of the surface (throttled).
      if (tool !== 'eraser') {
        const now = performance.now();
        if (now - lastBlobAt > 90) {
          lastBlobAt = now;
          const normal =
            hit.face && hit.object
              ? hit.face.normal.clone().transformDirection((hit.object as THREE.Object3D).matrixWorld)
              : new THREE.Vector3(0, 1, 0);
          spawnPaintBlobs(hit.point, normal, color, brushSize);
        }
      }
    }
    let lastBlobAt = 0;

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerleave', onLeave);
    dom.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointerup', onUp);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerleave', onLeave);
      dom.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', spaceKeyDown);
      window.removeEventListener('keyup', spaceKeyUp);
      unsubUndo();
      unsubClear();
      drainRef.current = () => {};
    };
  }, [gl, camera, scene]);

  return null;
}
