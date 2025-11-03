import { useMemo } from 'react';
import { PortfolioItem, CanvasOffset } from '../types';

interface UseInfiniteGridProps {
  baseItems: PortfolioItem[];
  offset: CanvasOffset;
  gridWidth: number;
  gridHeight: number;
}

/**
 * Hook to create a truly infinite grid by repeating the base pattern
 * Only generates tiles that are visible in viewport + buffer
 * 3x3 tile pattern ensures seamless looping
 */
export const useInfiniteGrid = ({
  baseItems,
  offset,
  gridWidth,
  gridHeight,
}: UseInfiniteGridProps): PortfolioItem[] => {
  const infiniteItems = useMemo(() => {
    // Calculate which grid tile we're currently viewing
    const currentTileX = Math.floor(-offset.x / gridWidth);
    const currentTileY = Math.floor(-offset.y / gridHeight);

    const items: PortfolioItem[] = [];

    // Create a 3x3 grid of tiles around current position
    // This ensures seamless looping in any direction
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tileX = currentTileX + dx;
        const tileY = currentTileY + dy;

        // For each tile, add all base items with offset
        baseItems.forEach((item) => {
          items.push({
            ...item,
            // Create unique ID for each tile instance
            id: `${item.id}-${tileX}-${tileY}`,
            // Position in world space
            x: item.x + tileX * gridWidth,
            y: item.y + tileY * gridHeight,
          });
        });
      }
    }

    return items;
  }, [baseItems, offset.x, offset.y, gridWidth, gridHeight]);

  return infiniteItems;
};
