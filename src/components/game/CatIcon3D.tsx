// CatIcon3D.tsx — drop-in replacement that renders a real GLB
import { Canvas } from "@react-three/fiber";
import { useGLTF, useAnimations, Environment, ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";

function Model({ animated }: { animated: boolean }) {
  const group = useRef<any>(null);
  const { scene, animations } = useGLTF("/models/cat.glb");
  const { actions } = useAnimations(animations, group);
  useEffect(() => {
    if (!animated) return;
    actions["Idle"]?.reset().fadeIn(0.25).play();
    return () => { actions["Idle"]?.fadeOut(0.25); };
  }, [actions, animated]);
  return <primitive ref={group} object={scene} scale={0.6} />;
}

export function CatIcon3D({ className = "", animated = true }: { className?: string; animated?: boolean }) {
  return (
    <div className={className} style={{ width: 128, height: 128 }}>
      <Canvas shadows camera={{ position: [0, 0.6, 3], fov: 35 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.4} castShadow />
        <Suspense fallback={null}>
          <Model animated={animated} />
          <Environment preset="apartment" />
          <ContactShadows position={[0, -0.5, 0]} opacity={0.4} blur={2.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}