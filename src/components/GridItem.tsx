import { useState } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { PortfolioItem } from '../types';
import { Shape3D } from './Shape3D';

interface GridItemProps {
  item: PortfolioItem;
  onClick: (item: PortfolioItem) => void;
}

/**
 * Individual grid item - just the 3D shape, no card or title
 */
export const GridItem = ({ item, onClick }: GridItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: item.x,
        top: item.y,
        width: 200,
        height: 200,
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onClick(item)}
      whileHover={{
        scale: 1.1,
        transition: { duration: 0.3, ease: 'easeOut' },
      }}
    >
      {/* Three.js Canvas for 3D shape - full size, no container */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4488ff" />
        <spotLight
          position={[0, 10, 0]}
          angle={0.5}
          penumbra={1}
          intensity={0.8}
        />
        <Shape3D shape={item.shape} color={item.color} isHovered={isHovered} />
      </Canvas>

      {/* Subtle glow effect on hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: `radial-gradient(circle at center, ${item.color}30 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />
      )}
    </motion.div>
  );
};
