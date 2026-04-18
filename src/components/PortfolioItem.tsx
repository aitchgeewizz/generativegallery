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
        <div className="relative w-full h-full bg-[#111] rounded-sm overflow-hidden">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-[#111]" />
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
          {imageError && renderFallbackCard()}
        </div>
      );
    }

    // If no image URL, render fallback card
    return renderFallbackCard();
  };

  const renderFallbackCard = () => {
    const color = item.color === '#000000' || item.color === '#FFFFFF' ? '#6366F1' : item.color;
    return (
      <div
        className="absolute inset-0 rounded-sm overflow-hidden flex flex-col justify-end p-4"
        style={{
          background: `linear-gradient(145deg, ${color}18 0%, ${color}08 50%, ${color}20 100%)`,
          border: `1px solid ${color}30`,
        }}
      >
        <div
          className="absolute top-3 right-3 w-2 h-2 rounded-full"
          style={{ backgroundColor: `${color}60` }}
        />
        <p
          className="text-white/70 text-xs font-medium leading-tight line-clamp-3 font-display"
          style={{ fontSize: '11px' }}
        >
          {item.title}
        </p>
        {item.description && (
          <p className="text-white/35 text-[9px] mt-1 leading-tight line-clamp-1">
            {item.description}
          </p>
        )}
      </div>
    );
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
            className="absolute inset-0 rounded-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: `radial-gradient(circle at center, ${item.color}15 0%, transparent 70%)`,
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />
        )}
      </motion.div>
    </div>
  );
};
