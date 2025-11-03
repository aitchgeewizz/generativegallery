import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PortfolioItem } from '../types';

interface CanvasItemProps {
  item: PortfolioItem;
  onClick: (item: PortfolioItem) => void;
}

/**
 * Enhanced canvas-based 2D shapes with gradients, shadows, and lighting effects
 */
export const CanvasItem = ({ item, onClick }: CanvasItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Animate rotation
  useEffect(() => {
    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const speed = isHovered ? 0.002 : 0.0005;
      setRotation(elapsed * speed);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isHovered]);

  // Draw shape on canvas with enhanced styling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 200 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, 200, 200);

    const centerX = 100;
    const centerY = 100;
    const size = isHovered ? 80 : 70;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Create gradients for 3D effect
    const createRadialGradient = (color: string) => {
      const gradient = ctx.createRadialGradient(-size / 4, -size / 4, 0, 0, 0, size);
      gradient.addColorStop(0, lightenColor(color, 40));
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, darkenColor(color, 30));
      return gradient;
    };

    const createLinearGradient = (color: string, angle: number = -45) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = Math.cos(rad) * size;
      const y1 = Math.sin(rad) * size;
      const gradient = ctx.createLinearGradient(-x1, -y1, x1, y1);
      gradient.addColorStop(0, lightenColor(color, 30));
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, darkenColor(color, 40));
      return gradient;
    };

    // Draw shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 10;

    // Draw based on shape type with gradients
    switch (item.shape) {
      case 'box':
        // 3D box effect
        ctx.fillStyle = createLinearGradient(item.color, -45);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        // Highlight edge
        ctx.strokeStyle = lightenColor(item.color, 50);
        ctx.lineWidth = 3;
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        break;

      case 'sphere':
        // Glossy sphere
        ctx.fillStyle = createRadialGradient(item.color);
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        const highlight = ctx.createRadialGradient(-size / 6, -size / 6, 0, 0, 0, size / 2);
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        highlight.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlight;
        ctx.fill();
        break;

      case 'torus':
        // Gradient torus
        ctx.strokeStyle = createLinearGradient(item.color, 90);
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2.5, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring highlight
        ctx.strokeStyle = lightenColor(item.color, 40);
        ctx.lineWidth = 8;
        ctx.stroke();
        break;

      case 'cone':
        // 3D cone with gradient
        const coneGradient = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
        coneGradient.addColorStop(0, lightenColor(item.color, 40));
        coneGradient.addColorStop(1, darkenColor(item.color, 30));
        ctx.fillStyle = coneGradient;
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.closePath();
        ctx.fill();
        // Edge highlight
        ctx.strokeStyle = lightenColor(item.color, 60);
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case 'cylinder':
        // 3D cylinder
        const cylGradient = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
        cylGradient.addColorStop(0, darkenColor(item.color, 40));
        cylGradient.addColorStop(0.5, lightenColor(item.color, 20));
        cylGradient.addColorStop(1, darkenColor(item.color, 40));
        ctx.fillStyle = cylGradient;
        ctx.fillRect(-size / 2.5, -size / 2, size / 1.3, size);
        // Top ellipse
        ctx.fillStyle = lightenColor(item.color, 30);
        ctx.beginPath();
        ctx.ellipse(0, -size / 2, size / 2.5, size / 8, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'octahedron':
        // Diamond shape with gradient
        const diamondGradient = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
        diamondGradient.addColorStop(0, lightenColor(item.color, 50));
        diamondGradient.addColorStop(0.5, item.color);
        diamondGradient.addColorStop(1, darkenColor(item.color, 40));
        ctx.fillStyle = diamondGradient;
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2, 0);
        ctx.lineTo(0, size / 2);
        ctx.lineTo(-size / 2, 0);
        ctx.closePath();
        ctx.fill();
        // Sparkle effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(0, -size / 4, 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      default:
        ctx.fillStyle = createLinearGradient(item.color, -45);
        ctx.fillRect(-size / 2, -size / 2, size, size);
    }

    ctx.restore();
  }, [item.color, item.shape, rotation, isHovered]);

  // Helper functions for color manipulation
  const lightenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + (255 * percent) / 100);
    const g = Math.min(255, ((num >> 8) & 0xff) + (255 * percent) / 100);
    const b = Math.min(255, (num & 0xff) + (255 * percent) / 100);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const darkenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) * (1 - percent / 100));
    const g = Math.max(0, ((num >> 8) & 0xff) * (1 - percent / 100));
    const b = Math.max(0, (num & 0xff) * (1 - percent / 100));
    return `rgb(${r}, ${g}, ${b})`;
  };

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
        scale: 1.15,
        transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }, // Bouncy ease
      }}
      animate={{
        y: isHovered ? -10 : 0,
      }}
      transition={{
        y: { duration: 0.3, ease: 'easeOut' },
      }}
    >
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        style={{
          width: '100%',
          height: '100%',
          filter: isHovered ? 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5))' : 'none',
        }}
      />

      {/* Enhanced glow effect on hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          style={{
            background: `radial-gradient(circle at center, ${item.color}60 0%, ${item.color}30 40%, transparent 70%)`,
            filter: 'blur(30px)',
          }}
        />
      )}

      {/* Particle effect ring on hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 0], rotate: 180 }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            borderRadius: '50%',
            border: `2px solid ${item.color}`,
            borderStyle: 'dashed',
          }}
        />
      )}
    </motion.div>
  );
};
