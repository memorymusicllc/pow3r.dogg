import { ReactNode, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

interface Renderer3DProps {
  children: ReactNode;
  className?: string;
  cameraPosition?: [number, number, number];
  enableControls?: boolean;
}

export default function Renderer3D({
  children,
  className = '',
  cameraPosition = [0, 0, 5],
  enableControls = true,
}: Renderer3DProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={cameraPosition} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={null}>{children}</Suspense>
        {enableControls && <OrbitControls />}
      </Canvas>
    </div>
  );
}

