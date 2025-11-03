import { useMemo } from 'react';
import { PortfolioItem, CanvasOffset, ViewportBounds } from '../types';

interface UseViewportItemsProps {
  items: PortfolioItem[];
  offset: CanvasOffset;
  itemWidth?: number;
  itemHeight?: number;
  buffer?: number;
}

/**
 * Hook to calculate which items are visible in the current viewport
 * Includes buffer zone for smoother transitions
 */
export const useViewportItems = ({
  items,
  offset,
  itemWidth = 200,
  itemHeight = 200,
  buffer = 500, // Buffer zone in pixels
}: UseViewportItemsProps): PortfolioItem[] => {
  const visibleItems = useMemo(() => {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate visible bounds with buffer
    const bounds: ViewportBounds = {
      left: -offset.x - buffer,
      right: -offset.x + viewportWidth + buffer,
      top: -offset.y - buffer,
      bottom: -offset.y + viewportHeight + buffer,
    };

    // Filter items that intersect with the visible bounds
    return items.filter((item) => {
      const itemLeft = item.x;
      const itemRight = item.x + itemWidth;
      const itemTop = item.y;
      const itemBottom = item.y + itemHeight;

      // Check if item intersects with viewport bounds
      return (
        itemRight >= bounds.left &&
        itemLeft <= bounds.right &&
        itemBottom >= bounds.top &&
        itemTop <= bounds.bottom
      );
    });
  }, [items, offset.x, offset.y, itemWidth, itemHeight, buffer]);

  return visibleItems;
};
