import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import Character from './Character';
import PaintController from './PaintController';
import { usePaintStore } from '../store/usePaintStore';

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

type Props = {
  captureRef: { current: (() => string | null) | null };
};

export default function Scene({ captureRef }: Props) {
  const paintMode = usePaintStore((s) => s.paintMode);

  return (
    <Canvas
      shadows
      gl={{ preserveDrawingBuffer: true }}
      camera={{ position: [3.5, 2.2, 5.5], fov: 36 }}
      dpr={[1, 2]}
      onCreated={(state) => {
        captureRef.current = () => state.gl.domElement.toDataURL('image/png');
      }}
    >
      <color attach="background" args={['#e9e4d8']} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[2.5, 4, 2]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Environment preset="city" />

      <CamoSurface position={[0, 0, -1.4]} rotation={[0, 0, 0]} size={[6, 4]} color="#7fa893" />
      <CamoSurface position={[0, -0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[6, 6]} color="#b89766" />

      <Character />

      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={4} blur={2} far={2} />

      <PaintController />

      <OrbitControls
        makeDefault
        target={[0, 0.68, 0]}
        minDistance={1.2}
        maxDistance={5}
        maxPolarAngle={Math.PI / 1.9}
        mouseButtons={{
          LEFT: (paintMode ? -1 : THREE.MOUSE.ROTATE) as THREE.MOUSE,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />
    </Canvas>
  );
}
