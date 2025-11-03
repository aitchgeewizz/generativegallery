import { useMemo } from 'react';
import { PortfolioItem, CanvasOffset } from '../types';

interface UseSeamlessLoopProps {
  baseItems: PortfolioItem[];
  offset: CanvasOffset;
  gridWidth: number;
  gridHeight: number;
}

/**
 * Creates a seamless looping grid by rendering the same items multiple times
 * in a 3x3 pattern around the current position
 */
export const useSeamlessLoop = ({
  baseItems,
  offset,
  gridWidth,
  gridHeight,
}: UseSeamlessLoopProps): PortfolioItem[] => {
  const loopedItems = useMemo(() => {
    const items: PortfolioItem[] = [];

    // Calculate which tile we're currently viewing
    const tileX = Math.floor(-offset.x / gridWidth);
    const tileY = Math.floor(-offset.y / gridHeight);

    // Render 3x3 grid of tiles around current position
    // This creates the seamless loop effect
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const currentTileX = tileX + dx;
        const currentTileY = tileY + dy;

        // Add all base items with tile offset
        baseItems.forEach((item) => {
          items.push({
            ...item,
            // Use modulo to create unique but consistent IDs
            id: item.id + (currentTileX * 10000) + (currentTileY * 100000),
            x: item.x + currentTileX * gridWidth,
            y: item.y + currentTileY * gridHeight,
          });
        });
      }
    }

    return items;
  }, [baseItems, offset.x, offset.y, gridWidth, gridHeight]);

  return loopedItems;
};
