import React, { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Polaroids } from './Polaroids';
import { TreeState } from '../types';
import { COLORS } from '../constants';

// Add type augmentation to fix JSX intrinsic elements errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      spotLight: any;
    }
  }
}

interface SceneProps {
  treeState: TreeState;
  handX: number;
  handY: number;
}

const CameraController: React.FC<{ handX: number; handY: number; isFormed: boolean }> = ({ handX, handY, isFormed }) => {
  useFrame((state) => {
    const targetX = (handX - 0.5) * -10; 
    const targetY = (handY - 0.5) * 5 + 2; 

    if (isFormed) {
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.03);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.max(0, targetY + 4), 0.03);
      state.camera.lookAt(0, 0, 0);
    } else {
        const t = state.clock.getElapsedTime();
        state.camera.position.x = Math.sin(t * 0.2) * 25;
        state.camera.position.z = Math.cos(t * 0.2) * 25;
        state.camera.lookAt(0, 0, 0);
    }
  });
  return null;
};

// Component to handle the Lerp logic in the R3F loop
const LerpController = ({ sharedLerp, treeState }: { sharedLerp: { value: number }, treeState: TreeState }) => {
    useFrame((_, delta) => {
        const target = treeState === TreeState.FORMED ? 1 : 0;
        // Damp the value for smooth transition
        sharedLerp.value = THREE.MathUtils.damp(sharedLerp.value, target, 1.5, delta);
    });
    return null;
}

export const Scene: React.FC<SceneProps> = ({ treeState, handX, handY }) => {
  const sharedLerp = useMemo(() => ({ value: 0 }), []);
  
  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 20], fov: 45 }}
      gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
      dpr={[1, 1.5]} 
    >
      <LerpController sharedLerp={sharedLerp} treeState={treeState} />
      <CameraController handX={handX} handY={handY} isFormed={treeState === TreeState.FORMED} />
      
      <Environment preset="lobby" />
      <ambientLight intensity={0.2} color={COLORS.DEEP_GREEN} />
      <pointLight position={[10, 10, 10]} intensity={1} color={COLORS.GOLD} />
      <spotLight 
        position={[0, 20, 0]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#fff" 
        castShadow 
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={500} scale={20} size={4} speed={0.4} opacity={0.5} color={COLORS.GOLD} />

      <Foliage sharedLerp={sharedLerp} />
      <Ornaments sharedLerp={sharedLerp} />
      <Polaroids sharedLerp={sharedLerp} />

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.7} 
          mipmapBlur 
          intensity={1.0} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </Canvas>
  );
};