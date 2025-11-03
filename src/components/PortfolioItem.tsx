import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PortfolioItem as PortfolioItemType } from '../types';

interface PortfolioItemProps {
  item: PortfolioItemType;
  onClick: (item: PortfolioItemType) => void;
}

/**
 * Lightweight portfolio item - SVG shapes, images, or GIFs
 * Much better performance than canvas-based rendering
 */
// Global cache for loaded images (shared across all duplicate items)
const imageLoadedCache = new Map<string, boolean>();
const imageErrorCache = new Map<string, boolean>();

export const PortfolioItem = ({ item, onClick }: PortfolioItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const imageUrl = item.imageUrl;

  // Check cache first for instant rendering of duplicates
  const [imageLoaded, setImageLoaded] = useState(() => imageUrl ? imageLoadedCache.get(imageUrl) || false : false);
  const [imageError, setImageError] = useState(() => imageUrl ? imageErrorCache.get(imageUrl) || false : false);
  const [currentImageUrl, setCurrentImageUrl] = useState(item.imageUrl);

  // Update image URL when item changes (important for looped grid)
  useEffect(() => {
    if (item.imageUrl) {
      setCurrentImageUrl(item.imageUrl);
      // Use cached state if available
      setImageLoaded(imageLoadedCache.get(item.imageUrl) || false);
      setImageError(imageErrorCache.get(item.imageUrl) || false);
    }
  }, [item.imageUrl, item.id]);

  const renderContent = () => {
    // If item has an image/gif URL, try to render it
    if (item.imageUrl) {
      return (
        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}
          {!imageError && (
            <img
              src={currentImageUrl}
              alt={item.title}
              className="w-full h-full object-cover pointer-events-none select-none"
              style={{
                imageRendering: item.pixelated ? 'pixelated' : 'auto',
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
              onLoad={() => {
                setImageLoaded(true);
                setImageError(false);
                // Cache the success for duplicates
                if (currentImageUrl) {
                  imageLoadedCache.set(currentImageUrl, true);
                  imageErrorCache.set(currentImageUrl, false);
                }
              }}
              onError={() => {
                // Try fallback if available and not already tried
                if (item.fallbackUrl && currentImageUrl !== item.fallbackUrl) {
                  setCurrentImageUrl(item.fallbackUrl);
                  setImageLoaded(false);
                } else {
                  // Both primary and fallback failed - show SVG shape instead
                  setImageError(true);
                  // Cache the error for duplicates
                  if (currentImageUrl) {
                    imageErrorCache.set(currentImageUrl, true);
                    imageLoadedCache.set(currentImageUrl, false);
                  }
                }
              }}
              loading="eager"
              draggable={false}
            />
          )}
          {imageError && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
              {renderSVGShape()}
            </div>
          )}
        </div>
      );
    }

    // If no image URL, render SVG shape
    return (
      <div className="relative w-full h-full bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center">
        {renderSVGShape()}
      </div>
    );
  };

  const renderSVGShape = () => {
    const size = 140;
    const color = item.color;

    switch (item.shape) {
      case 'box':
        // Dithered square pattern
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <defs>
              <pattern id={`dither-${item.id}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="2" height="2" fill={color} />
                <rect x="2" y="2" width="2" height="2" fill={color} />
              </pattern>
            </defs>
            <rect x="15" y="15" width="70" height="70" fill={`url(#dither-${item.id})`} />
            <rect x="15" y="15" width="70" height="70" fill="none" stroke={color} strokeWidth="3" />
          </svg>
        );

      case 'sphere':
        // Gradient circle
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <defs>
              <radialGradient id={`grad-${item.id}`}>
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.3" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="35" fill={`url(#grad-${item.id})`} />
          </svg>
        );

      case 'torus':
        // Concentric circles
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="35" fill="none" stroke={color} strokeWidth="8" />
            <circle cx="50" cy="50" r="20" fill="none" stroke={color} strokeWidth="5" />
          </svg>
        );

      case 'cone':
        // Triangle with stripes
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <defs>
              <pattern id={`stripes-${item.id}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect x="0" y="0" width="4" height="8" fill={color} />
              </pattern>
            </defs>
            <polygon points="50,20 15,80 85,80" fill={`url(#stripes-${item.id})`} />
            <polygon points="50,20 15,80 85,80" fill="none" stroke={color} strokeWidth="3" />
          </svg>
        );

      case 'cylinder':
        // Pill shape
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <rect x="30" y="25" width="40" height="50" rx="20" fill={color} />
            <rect x="32" y="27" width="36" height="46" rx="18" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
          </svg>
        );

      case 'octahedron':
        // Star/sparkle
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <polygon points="50,15 60,45 90,50 60,55 50,85 40,55 10,50 40,45" fill={color} />
            <circle cx="50" cy="50" r="8" fill="white" opacity="0.8" />
          </svg>
        );

      default:
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <rect x="25" y="25" width="50" height="50" fill={color} />
          </svg>
        );
    }
  };

  return (
    <div
      className="absolute cursor-pointer"
      style={{
        left: item.x,
        top: item.y,
        width: 200,
        height: 200,
      }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={() => onClick(item)}
    >
      <motion.div
        className="w-full h-full flex items-center justify-center relative"
        whileHover={{
          scale: 1.05,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        {/* Main content */}
        <div className="relative w-full h-full flex items-center justify-center">
          {renderContent()}
        </div>

        {/* Hover effect */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: `radial-gradient(circle at center, ${item.color}30 0%, transparent 70%)`,
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />
        )}
      </motion.div>
    </div>
  );
};
