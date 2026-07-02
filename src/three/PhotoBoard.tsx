import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { photoBoardRig } from './photoBoardRig';

const MAX_WIDTH = 4.6;
const MAX_HEIGHT = 4.4;
const FRAME_MARGIN = 0.1; // how much the frame border shows past the photo
const BOARD_Z = -2.2;

// The uploaded/stock photo mounted as a real, flat 3D object — a "board" you
// can walk around, not a warped relief. It never distorts (it's just a flat
// plane), so orbit is fully free; from a steep angle you simply see its edge,
// like a real picture on a stand.
export default function PhotoBoard({ imageUrl }: { imageUrl: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(imageUrl, (tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      setAspect(tex.image.width / tex.image.height);
      setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  useEffect(() => () => texture?.dispose(), [texture]);

  const w = aspect >= MAX_WIDTH / MAX_HEIGHT ? MAX_WIDTH : MAX_HEIGHT * aspect;
  const h = aspect >= MAX_WIDTH / MAX_HEIGHT ? MAX_WIDTH / aspect : MAX_HEIGHT;

  // Lets a PFP capture crop to exactly this board's on-screen rectangle
  // instead of the whole viewport (see photoBoardRig / capturePfp).
  useEffect(() => {
    photoBoardRig.group = texture ? groupRef.current : null;
    photoBoardRig.width = w;
    photoBoardRig.height = h;
    return () => {
      photoBoardRig.group = null;
      photoBoardRig.width = 0;
      photoBoardRig.height = 0;
    };
  }, [texture, w, h]);

  if (!texture) return null;

  return (
    <group ref={groupRef} position={[0, h / 2 + 0.15, BOARD_Z]}>
      {/* frame */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w + FRAME_MARGIN * 2, h + FRAME_MARGIN * 2]} />
        <meshBasicMaterial color="#2c2a26" toneMapped={false} />
      </mesh>
      {/* photo */}
      <mesh ref={(m) => m && (m.userData.sampleColor = () => '#ffffff')}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
