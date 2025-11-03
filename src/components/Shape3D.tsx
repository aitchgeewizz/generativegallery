import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { ShapeType } from '../types';

interface Shape3DProps {
  shape: ShapeType;
  color: string;
  isHovered: boolean;
}

/**
 * Renders different 3D geometric shapes with rotation animation
 */
export const Shape3D = ({ shape, color, isHovered }: Shape3DProps) => {
  const meshRef = useRef<Mesh>(null);

  // Rotate on every frame when hovered
  useFrame((state, delta) => {
    if (meshRef.current && isHovered) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.5;
    } else if (meshRef.current) {
      // Slow idle rotation when not hovered
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  const renderShape = () => {
    const commonProps = {
      ref: meshRef,
      scale: isHovered ? 1.1 : 1,
    };

    switch (shape) {
      case 'box':
        return (
          <mesh {...commonProps}>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case 'sphere':
        return (
          <mesh {...commonProps}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case 'torus':
        return (
          <mesh {...commonProps}>
            <torusGeometry args={[0.8, 0.4, 16, 32]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case 'cone':
        return (
          <mesh {...commonProps}>
            <coneGeometry args={[1, 2, 32]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case 'cylinder':
        return (
          <mesh {...commonProps}>
            <cylinderGeometry args={[0.8, 0.8, 2, 32]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      case 'octahedron':
        return (
          <mesh {...commonProps}>
            <octahedronGeometry args={[1.2]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      default:
        return (
          <mesh {...commonProps}>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
    }
  };

  return <>{renderShape()}</>;
};
