import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Image, Text } from '@react-three/drei';
import { CONFIG, POLAROID_IMAGES } from '../constants';

// Add type augmentation to fix JSX intrinsic elements errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
    }
  }
}

interface PolaroidItemProps {
  url: string;
  sharedLerp: { value: number };
  targetPos: THREE.Vector3;
  chaosPos: THREE.Vector3;
}

const PolaroidItem: React.FC<PolaroidItemProps> = ({ url, sharedLerp, targetPos, chaosPos }) => {
  const groupRef = useRef<THREE.Group>(null);
  const speedOffset = useMemo(() => Math.random(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    let t = sharedLerp.value;
    t = THREE.MathUtils.clamp(t * 1.2 - 0.2 + (speedOffset * 0.1), 0, 1);
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    groupRef.current.position.lerpVectors(chaosPos, targetPos, easeT);
    
    if (easeT > 0.8) {
        groupRef.current.lookAt(0, targetPos.y, 0);
        groupRef.current.rotateY(Math.PI);
    } else {
        groupRef.current.rotation.x = state.clock.elapsedTime * 0.2 * speedOffset;
        groupRef.current.rotation.z = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[1.2, 1.5, 0.02]} />
        <meshStandardMaterial color="#fffff0" roughness={0.8} />
      </mesh>
      <Image url={url} position={[0, 0.15, 0.01]} scale={[1, 1, 1]} transparent />
      <Text
        position={[0, -0.55, 0.02]}
        fontSize={0.1}
        color="black"
        font="https://fonts.gstatic.com/s/sacramento/v12/BuW3pS0zWgCFJ2tP5S9J.woff"
      >
        Grand Luxury
      </Text>
    </group>
  );
};

export const Polaroids = ({ sharedLerp }: { sharedLerp: { value: number } }) => {
  const items = useMemo(() => {
    return new Array(CONFIG.polaroidCount).fill(0).map((_, i) => {
      const r = 20 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const chaosPos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const spiralHeight = CONFIG.treeHeight - 1;
      const h = (i / CONFIG.polaroidCount) * spiralHeight - (spiralHeight / 2);
      const currentRadius = (1 - (h + spiralHeight/2) / CONFIG.treeHeight) * CONFIG.treeRadius + 0.5;
      const angle = i * 0.8; 
      const targetPos = new THREE.Vector3(
        currentRadius * Math.cos(angle),
        h,
        currentRadius * Math.sin(angle)
      );

      return {
        id: i,
        url: POLAROID_IMAGES[i % POLAROID_IMAGES.length],
        chaosPos,
        targetPos
      };
    });
  }, []);

  return (
    <group>
      {items.map((item) => (
        <PolaroidItem 
            key={item.id} 
            url={item.url} 
            sharedLerp={sharedLerp}
            chaosPos={item.chaosPos} 
            targetPos={item.targetPos} 
        />
      ))}
    </group>
  );
};