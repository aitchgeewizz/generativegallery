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
  // Prefer the small thumbnail variant for the 200×200 wall tile.
  // The detail view still pulls `imageUrl` (full size) for the stage.
  const tileUrl = item.thumbnailUrl || item.imageUrl;

  // Check cache first for instant rendering of duplicates
  const [imageLoaded, setImageLoaded] = useState(() => tileUrl ? imageLoadedCache.get(tileUrl) || false : false);
  const [imageError, setImageError] = useState(() => tileUrl ? imageErrorCache.get(tileUrl) || false : false);
  const [currentImageUrl, setCurrentImageUrl] = useState(tileUrl);

  // Update image URL when item changes (important for looped grid)
  useEffect(() => {
    if (tileUrl) {
      setCurrentImageUrl(tileUrl);
      // Use cached state if available
      setImageLoaded(imageLoadedCache.get(tileUrl) || false);
      setImageError(imageErrorCache.get(tileUrl) || false);
    }
  }, [tileUrl, item.id]);

  const renderContent = () => {
    // If item has an image/gif URL, try to render it
    if (tileUrl) {
      return (
        <div
          className="relative w-full h-full rounded-sm overflow-hidden"
          style={{ background: 'var(--bg-elev)' }}
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0" style={{ background: 'var(--bg-elev)' }} />
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
              loading="lazy"
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
    // Theme-aware, grayscale-only. Museum-card aesthetic instead of
    // per-item color tint. Title is the focus; description quiet.
    return (
      <div
        className="absolute inset-0 rounded-sm overflow-hidden flex flex-col justify-end p-4"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <p
          className="type-small line-clamp-3"
          style={{ color: 'var(--text-2)' }}
        >
          {item.title}
        </p>
        {item.description && (
          <p
            className="type-meta mt-1 line-clamp-1"
            style={{ color: 'var(--text-3)' }}
          >
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

        {/* Hover effect — a quiet white halo, theme-aware (the mix-blend
            behaves the same way on both light and dark). No per-item
            color tint per the grayscale design system. */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background:
                'radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </motion.div>
    </div>
  );
};
