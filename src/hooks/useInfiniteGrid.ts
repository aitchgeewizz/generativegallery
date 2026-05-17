import { useMemo } from 'react';
import { PortfolioItem, CanvasOffset } from '../types';

interface UseInfiniteGridProps {
  baseItems: PortfolioItem[];
  offset: CanvasOffset;
  gridWidth: number;
  gridHeight: number;
}

/**
 * Below this count, looping is disabled. A tag search that returns
 * one or two items shouldn't render 9 copies of the same image in a
 * grid pattern — it just looks like a wallpaper bug.
 */
const MIN_ITEMS_TO_LOOP = 4;

/**
 * Hook to create a looping grid by repeating the base pattern.
 * Renders a 3x3 tile pattern around the current drag offset to give
 * a seamless wraparound illusion.
 *
 * Special case: when the result set is small (<= 3), we skip the loop
 * entirely and just render the items once at their world positions.
 * Otherwise a single tag-search hit would be tiled into nine
 * identical copies, which reads as a bug.
 */
export const useInfiniteGrid = ({
  baseItems,
  offset,
  gridWidth,
  gridHeight,
}: UseInfiniteGridProps): PortfolioItem[] => {
  const infiniteItems = useMemo(() => {
    // Small result sets: don't tile. The items are already centred by
    // layoutCentered upstream and will sit where they are.
    if (baseItems.length < MIN_ITEMS_TO_LOOP) {
      return baseItems.map((item) => ({
        ...item,
        id: `${item.id}-solo`,
      }));
    }

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
