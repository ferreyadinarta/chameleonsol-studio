import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import CharacterView from './CharacterView';
import PaintController from './PaintController';
import PaintBlobs from './PaintBlobs';
import { usePaintStore } from '../store/usePaintStore';
import { usePoseStore } from '../store/usePoseStore';
import { useStageStore } from '../store/useStageStore';

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
      receiveShadow
      ref={(m) => {
        if (m) {
          m.userData.sampleColor = () => color;
        }
      }}
    >
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
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
    const { charX, charY, charZ, charRotY } = useStageStore.getState();
    g.position.x = charX;
    g.position.y = charY;
    g.position.z = charZ;
    g.rotation.y = charRotY;
  });
  return (
    <group ref={ref}>
      <CharacterView />
    </group>
  );
}

// Left-drag (when not painting / wheel closed) spins the character on its Y
// axis only — the constrained turntable feel from Meccha Chameleon.
function TurntableDrag() {
  const { gl } = useThree();
  useEffect(() => {
    const dom = gl.domElement;
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (usePaintStore.getState().paintMode) return;
      if (usePoseStore.getState().wheelOpen) return;
      dragging = true;
      lastX = e.clientX;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      useStageStore.getState().nudgeRotY(dx * 0.01);
    };
    const up = () => {
      dragging = false;
    };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl]);
  return null;
}

type Props = {
  captureRef: { current: (() => string | null) | null };
};

export default function Scene({ captureRef }: Props) {
  const bgImage = useStageStore((s) => s.bgImage);

  return (
    <Canvas
      shadows
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      camera={{ position: [3.5, 2.2, 5.5], fov: 36 }}
      dpr={[1, 2]}
      onCreated={(state) => {
        // Composite the flat HTML backdrop (if any) under the WebGL render so
        // a saved PFP includes the reference background.
        captureRef.current = () => {
          const glCanvas = state.gl.domElement;
          const bg = document.getElementById('stage-bg') as HTMLImageElement | null;
          if (!bg || !bg.complete || !bg.naturalWidth) return glCanvas.toDataURL('image/png');
          const out = document.createElement('canvas');
          out.width = glCanvas.width;
          out.height = glCanvas.height;
          const ctx = out.getContext('2d')!;
          // cover-fit the background
          const cr = out.width / out.height;
          const ir = bg.naturalWidth / bg.naturalHeight;
          let dw = out.width;
          let dh = out.height;
          if (ir > cr) dw = out.height * ir;
          else dh = out.width / ir;
          ctx.drawImage(bg, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
          ctx.drawImage(glCanvas, 0, 0, out.width, out.height);
          return out.toDataURL('image/png');
        };
      }}
    >
      {!bgImage && <color attach="background" args={['#e9e4d8']} />}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[2.5, 4, 2]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Environment preset="city" />

      {!bgImage && (
        <>
          <CamoSurface position={[0, 0, -1.4]} rotation={[0, 0, 0]} size={[6, 4]} color="#7fa893" />
          <CamoSurface position={[0, -0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[6, 6]} color="#b89766" />
        </>
      )}

      <CharacterRig />

      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={4} blur={2} far={2} />

      <PaintController />
      <PaintBlobs />
      <TurntableDrag />

      <OrbitControls
        makeDefault
        target={[0, 0.9, 0]}
        minDistance={1.2}
        maxDistance={6}
        enablePan={false}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI * 0.85}
        mouseButtons={{
          LEFT: -1 as unknown as THREE.MOUSE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
    </Canvas>
  );
}
