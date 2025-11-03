import { useMemo } from 'react';
import { PortfolioItem } from '../types';

interface UseViewportCullingProps {
  items: PortfolioItem[];
  offset: { x: number; y: number };
  itemSize: number;
  buffer?: number;
}

/**
 * Only render items that are visible in viewport + buffer
 * Much better performance than rendering everything
 */
export const useViewportCulling = ({
  items,
  offset,
  itemSize,
  buffer = 500,
}: UseViewportCullingProps): PortfolioItem[] => {
  return useMemo(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate visible bounds with buffer
    const minX = -offset.x - buffer;
    const maxX = -offset.x + viewportWidth + buffer;
    const minY = -offset.y - buffer;
    const maxY = -offset.y + viewportHeight + buffer;

    // Filter items that intersect with viewport
    return items.filter((item) => {
      const itemRight = item.x + itemSize;
      const itemBottom = item.y + itemSize;

      return (
        itemRight >= minX &&
        item.x <= maxX &&
        itemBottom >= minY &&
        item.y <= maxY
      );
    });
  }, [items, offset.x, offset.y, itemSize, buffer]);
};
