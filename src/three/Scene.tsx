import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CharacterView from './CharacterView';
import PaintController from './PaintController';
import PaintBlobs from './PaintBlobs';
import PhotoBoard from './PhotoBoard';
import { brushHover } from './brushHover';
import { cameraRig } from './cameraRig';
import { usePaintStore } from '../store/usePaintStore';
import { useStageStore } from '../store/useStageStore';

// Stable reference for OrbitControls' `target` prop. R3F re-applies a prop
// whenever its reference changes, and Scene re-renders often (spaceDown,
// shiftDown, tool, paintMode); an inline `[0, 0.9, 0]` literal would be a new
// array every render, so OrbitControls kept snapping the target back to this
// value and silently erasing any pan the instant something else re-rendered.
const ORBIT_TARGET: [number, number, number] = [0, 0.9, 0];

// PhotoBoard is a flat, single-sided plane — orbiting far enough around it
// reveals its blank backface (or an edge-on sliver at exactly 90°). Clamping
// azimuth keeps the camera on the side that's actually showing the photo.
// The default camera start position [3.5, ..., 5.5] sits at this azimuth
// (three.js Spherical measures theta from +Z toward +X), so centering the
// clamp there keeps the default view untouched.
const BACKDROP_AZIMUTH_0 = Math.atan2(3.5, 5.5);
const BACKDROP_ORBIT_RANGE = Math.PI / 4; // ±45°

// 3D brush cursor that sits ON the surface and tilts to the surface normal:
// a thin ring marks the exact brush size, and a small filled dot at dead
// center marks the exact point that will be painted — in the actual paint
// color, so the cursor doubles as a live preview of the dab about to land.
// The old crosshair ("+") only marked a rough area (two long lines crossing
// somewhere near the middle); a single dot is unambiguous about where paint
// actually lands, and looking like a dab of paint reads more like a brush.
function BrushDecal() {
  const ref = useRef<THREE.Group>(null);
  // Ring: white for brush, amber for eraser, so the two tools are
  // unmistakable at a glance, not just by the center dot's color.
  const light = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const dark = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#181613',
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  // Center dot: the actual paint color for the brush (a true preview of what
  // will land), amber to match the ring for the eraser (nothing to preview).
  const dot = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const dotOutline = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#181613',
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const q = useRef(new THREE.Quaternion());
  const up = useRef(new THREE.Vector3(0, 0, 1));

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const ps = usePaintStore.getState();
    const isEraser = ps.tool === 'eraser';
    const show = ps.paintMode && (ps.tool === 'brush' || isEraser) && brushHover.active;
    g.visible = show;
    if (!show) return;
    g.position.copy(brushHover.point).addScaledVector(brushHover.normal, 0.008);
    q.current.setFromUnitVectors(up.current, brushHover.normal);
    g.quaternion.copy(q.current);
    const r = 0.06 + ps.brushSize * 0.6;
    g.scale.set(r, r, r);
    light.color.set(isEraser ? '#e8913a' : '#ffffff');
    dot.color.set(isEraser ? '#e8913a' : ps.color);
  });

  return (
    <group ref={ref} visible={false}>
      <mesh material={dark} renderOrder={998}>
        <ringGeometry args={[0.8, 1.06, 48]} />
      </mesh>
      <mesh material={light} renderOrder={999}>
        <ringGeometry args={[0.85, 1.0, 48]} />
      </mesh>
      <mesh material={dotOutline} renderOrder={998}>
        <circleGeometry args={[0.17, 24]} />
      </mesh>
      <mesh material={dot} renderOrder={999}>
        <circleGeometry args={[0.12, 24]} />
      </mesh>
    </group>
  );
}

function CamoSurface({
  position,
  rotation,
  size,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  color: string;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      ref={(m) => {
        if (m) {
          m.userData.sampleColor = () => color;
        }
      }}
    >
      <planeGeometry args={size} />
      {/* unlit + tone-mapping off so the wall shows its exact hex — the same
          color the eyedropper reports and the brush paints. */}
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

// Applies character position + turntable rotation from the stage store without
// re-rendering on every change.
function CharacterRig() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { charX, charY, charZ, charRotY, charScale } = useStageStore.getState();
    g.position.x = charX;
    g.position.y = charY;
    g.position.z = charZ;
    g.rotation.y = charRotY;
    g.scale.setScalar(charScale);
  });
  return (
    <group ref={ref}>
      <CharacterView />
    </group>
  );
}

type Props = {
  captureRef: { current: (() => string | null) | null };
};

export default function Scene({ captureRef }: Props) {
  const bgImage = useStageStore((s) => s.bgImage);
  const paintMode = usePaintStore((s) => s.paintMode);
  const tool = usePaintStore((s) => s.tool);
  const resizingTool = paintMode && (tool === 'brush' || tool === 'eraser');
  const hasBackdrop = !!bgImage;

  // Hold Space to pan — the same convention as Figma/Photoshop/Illustrator,
  // which reads more natural than a Shift-modifier or middle-click (not every
  // mouse/trackpad has a reliable middle button).
  const [spaceDown, setSpaceDown] = useState(false);
  useEffect(() => {
    const typing = () => {
      const a = document.activeElement;
      return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing()) return;
      e.preventDefault(); // stop the page from scrolling
      setSpaceDown(true);
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Hold Shift to orbit while painting — middle-drag fills the same role but
  // most trackpads have no middle button at all, so this is the accessible
  // fallback (same "modifier + drag" pattern as Space for pan).
  const [shiftDown, setShiftDown] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === 'Shift' && setShiftDown(true);
    const up = (e: KeyboardEvent) => e.key === 'Shift' && setShiftDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return (
    <Canvas
      flat
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      camera={{ position: [3.5, 2.2, 5.5], fov: 36 }}
      dpr={[1, 2]}
      onCreated={(state) => {
        // The backdrop (PhotoBoard) is a real 3D mesh now, already part of the
        // WebGL render, so capturing a PFP is just reading the canvas.
        captureRef.current = () => state.gl.domElement.toDataURL('image/png');
      }}
    >
      {/* Always set: a photo/stock backdrop is a finite plane, so orbiting or
          panning far enough can reveal empty space past its edges — without
          this it renders as a jarring black void instead of a neutral fill. */}
      <color attach="background" args={['#e9e4d8']} />
      {/* Ambient dominates so painted colors stay close to their exact hex;
          the soft directional light (no shadow map) only adds a whisper of
          gradient across the form so the 3D shape still reads up close. */}
      <ambientLight intensity={2.4} />
      <directionalLight position={[2, 3.2, 2.6]} intensity={0.7} />

      {!hasBackdrop && (
        <>
          <CamoSurface position={[0, 0, -1.4]} rotation={[0, 0, 0]} size={[6, 4]} color="#7fa893" />
          <CamoSurface position={[0, -0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[6, 6]} color="#b89766" />
        </>
      )}
      {bgImage && <PhotoBoard imageUrl={bgImage} />}

      <CharacterRig />

      <PaintController />
      <PaintBlobs />
      <BrushDecal />

      <OrbitControls
        makeDefault
        ref={(c) => {
          cameraRig.controls = (c as unknown as typeof cameraRig.controls) ?? null;
        }}
        target={ORBIT_TARGET}
        minDistance={0.4}
        maxDistance={30}
        zoomSpeed={1.4}
        enablePan
        screenSpacePanning
        panSpeed={1.1}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI * 0.85}
        minAzimuthAngle={hasBackdrop ? BACKDROP_AZIMUTH_0 - BACKDROP_ORBIT_RANGE : -Infinity}
        maxAzimuthAngle={hasBackdrop ? BACKDROP_AZIMUTH_0 + BACKDROP_ORBIT_RANGE : Infinity}
        mouseButtons={{
          // Drag orbits the camera — the single primary gesture. In paint
          // mode, left-drag paints instead, so right-drag orbits there —
          // except with the brush/eraser, where right-drag resizes the brush
          // instead (matching the reference game). That leaves no free button
          // for orbit while a paint tool is selected, so middle-drag becomes
          // orbit there instead of pan (Space+drag already covers pan in
          // every mode, so the middle button isn't needed for that here).
          // Shift+drag also orbits while painting — the trackpad-friendly
          // alternative to middle-drag, since most trackpads have no middle
          // button to hold at all. Quirk: three-stdlib's OrbitControls has a
          // hardcoded rule that auto-swaps ROTATE<->PAN whenever Shift/Ctrl/
          // Meta is held, regardless of the mapping below — so to make Shift
          // actually RESULT in orbit, we must hand it PAN here and let that
          // built-in swap flip it to rotate for us (passing ROTATE directly
          // would immediately get swapped back to pan, which was the bug).
          LEFT: (spaceDown
            ? THREE.MOUSE.PAN
            : paintMode
              ? shiftDown
                ? THREE.MOUSE.PAN
                : -1
              : THREE.MOUSE.ROTATE) as THREE.MOUSE,
          MIDDLE: (resizingTool ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN) as THREE.MOUSE,
          RIGHT: (resizingTool ? -1 : THREE.MOUSE.ROTATE) as THREE.MOUSE,
        }}
      />
      <GrabCursor active={spaceDown} />
    </Canvas>
  );
}

// Swaps the canvas cursor to an open/closed hand while Space is held, so
// panning has the same visual feedback users expect from design tools.
function GrabCursor({ active }: { active: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    const dom = gl.domElement;
    if (!active) {
      dom.style.cursor = '';
      return;
    }
    dom.style.cursor = 'grab';
    const down = () => (dom.style.cursor = 'grabbing');
    const up = () => (dom.style.cursor = 'grab');
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => {
      dom.style.cursor = '';
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [active, gl]);
  return null;
}
