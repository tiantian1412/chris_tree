import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';

// Add type augmentation to fix JSX intrinsic elements errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      shaderMaterial: any;
    }
  }
}

const vertexShader = `
  uniform float uTime;
  uniform float uLerp;
  
  attribute vec3 aTargetPos;
  attribute vec3 aChaosPos;
  attribute float aRandom;
  
  varying float vAlpha;

  void main() {
    float t = uLerp;
    float smoothT = t * t * (3.0 - 2.0 * t);
    vec3 pos = mix(aChaosPos, aTargetPos, smoothT);
    
    if (uLerp > 0.8) {
      pos.x += sin(uTime * 2.0 + pos.y) * 0.05 * smoothT;
      pos.z += cos(uTime * 1.5 + pos.y) * 0.05 * smoothT;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (4.0 * aRandom + 2.0) * (20.0 / -mvPosition.z);
    vAlpha = 0.6 + 0.4 * smoothT; 
  }
`;

const fragmentShader = `
  varying float vAlpha;
  uniform vec3 uColor;
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;
    vec3 color = mix(uColor, uColor * 1.5, 1.0 - dist * 2.0);
    gl_FragColor = vec4(color, vAlpha);
  }
`;

// Accepting a Mutable Ref Object for lerpFactor to avoid Re-renders
export const Foliage = ({ sharedLerp }: { sharedLerp: { value: number } }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = CONFIG.foliageCount;

  const { chaosPos, targetPos, randoms } = useMemo(() => {
    const chaos = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const rands = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 1/3) * 15;
      chaos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      chaos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      chaos[i * 3 + 2] = r * Math.cos(phi);

      const h = Math.random() * CONFIG.treeHeight; 
      const y = h - CONFIG.treeHeight / 2;
      const currentRadius = (1 - h / CONFIG.treeHeight) * CONFIG.treeRadius;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * currentRadius;

      target[i * 3] = radius * Math.cos(angle);
      target[i * 3 + 1] = y;
      target[i * 3 + 2] = radius * Math.sin(angle);
      rands[i] = Math.random();
    }
    return { chaosPos: chaos, targetPos: target, randoms: rands };
  }, [count]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Read directly from the shared object, no React render needed
      materialRef.current.uniforms.uLerp.value = sharedLerp.value; 
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={chaosPos} itemSize={3} />
        <bufferAttribute attach="attributes-aChaosPos" count={count} array={chaosPos} itemSize={3} />
        <bufferAttribute attach="attributes-aTargetPos" count={count} array={targetPos} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uLerp: { value: 0 },
          uColor: { value: new THREE.Color(COLORS.EMERALD) }
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};