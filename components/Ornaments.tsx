import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../constants';

// Add type augmentation to fix JSX intrinsic elements errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
    }
  }
}

export const Ornaments = ({ sharedLerp }: { sharedLerp: { value: number } }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = CONFIG.ornamentCount;

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 10 + Math.random() * 10;
      const chaos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const h = Math.random() * CONFIG.treeHeight;
      const y = h - CONFIG.treeHeight / 2;
      const currentRadius = (1 - h / CONFIG.treeHeight) * CONFIG.treeRadius;
      const angle = Math.random() * Math.PI * 2;
      const radius = currentRadius + 0.2;

      const target = new THREE.Vector3(
        radius * Math.cos(angle),
        y,
        radius * Math.sin(angle)
      );

      const color = new THREE.Color().setHex(
        Math.random() > 0.5 ? 0xFFD700 : (Math.random() > 0.5 ? 0x800020 : 0xC0C0C0)
      );
      const scale = 0.2 + Math.random() * 0.3;
      return { chaos, target, color, scale, speedOffset: Math.random() };
    });
  }, [count]);

  useEffect(() => {
    if (meshRef.current) {
        data.forEach((d, i) => {
            meshRef.current!.setColorAt(i, d.color);
        });
        meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [data]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = sharedLerp.value;
    
    data.forEach((d, i) => {
      let localT = THREE.MathUtils.clamp(t * (1 + d.speedOffset * 0.5) - (d.speedOffset * 0.2), 0, 1);
      localT = localT * localT * (3 - 2 * localT);
      dummy.position.lerpVectors(d.chaos, d.target, localT);
      dummy.rotation.set(
          state.clock.elapsedTime * d.speedOffset,
          state.clock.elapsedTime * d.speedOffset,
          0
      );
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial roughness={0.1} metalness={0.9} envMapIntensity={1.5} />
    </instancedMesh>
  );
};