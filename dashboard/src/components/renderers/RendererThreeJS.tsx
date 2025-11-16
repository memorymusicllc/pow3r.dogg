import { ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';

interface RendererThreeJSProps {
  children: ReactNode;
  className?: string;
  cameraPosition?: [number, number, number];
  enableControls?: boolean;
  environment?: string;
}

export default function RendererThreeJS({
  children,
  className = '',
  cameraPosition = [0, 0, 5],
  enableControls = true,
  environment,
}: RendererThreeJSProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={cameraPosition} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} />
        {environment && <Environment preset={environment as 'night' | 'city' | 'sunset' | 'dawn' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'lobby' | 'park'} />}
        <Suspense fallback={null}>{children}</Suspense>
        {enableControls && <OrbitControls />}
      </Canvas>
    </div>
  );
}

