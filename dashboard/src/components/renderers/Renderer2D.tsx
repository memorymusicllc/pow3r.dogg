import { ReactNode } from 'react';

interface Renderer2DProps {
  children: ReactNode;
  className?: string;
}

export default function Renderer2D({ children, className = '' }: Renderer2DProps) {
  return <div className={className}>{children}</div>;
}

