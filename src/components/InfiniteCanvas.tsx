import { useCallback, useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PortfolioItem as PortfolioItemType } from '../types';
import { useSmoothDrag } from '../hooks/useSmoothDrag';
import { useInfiniteGrid } from '../hooks/useInfiniteGrid';
import { PortfolioItem } from './PortfolioItem';
import { ArtworkDetail } from './ArtworkDetail';

interface InfiniteCanvasProps {
  items: PortfolioItemType[];
  onTagClick?: (tagLabel: string) => void;
}

/**
 * Compute the canvas loop tile from the actual items rather than a
 * static assumption. This means the wraparound always hugs the real
 * content — if a refresh returns 14 items instead of 24, we tile every
 * 14 items, not every 24, so the canvas never shows half-empty rows of
 * void between repeats.
 *
 * Items come in pre-laid-out (see App.tsx#layoutCentered), so we read
 * their bounding box rather than re-deriving it from a row/column rule.
 */
const computeLoopBounds = (items: PortfolioItemType[]): { width: number; height: number } => {
  if (items.length === 0) return { width: 1, height: 1 };
  // Item tile size = 200 + 80 gap; matches App.tsx#GRID.
  const TILE = 280;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const it of items) {
    if (it.x < minX) minX = it.x;
    if (it.y < minY) minY = it.y;
    if (it.x > maxX) maxX = it.x;
    if (it.y > maxY) maxY = it.y;
  }
  // Add one tile of trailing space so the right/bottom edge of the last
  // item plus its gap completes the cell before the loop repeats.
  return { width: maxX - minX + TILE, height: maxY - minY + TILE };
};

export const InfiniteCanvas = ({ items, onTagClick }: InfiniteCanvasProps) => {
  // New smooth drag hook with momentum
  const { position, isDragging, handlePointerDown, isClick } = useSmoothDrag();

  // Selected artwork for detail view
  const [selectedItem, setSelectedItem] = useState<PortfolioItemType | null>(null);

  // Loop tile sized to actual items — see computeLoopBounds above.
  const loopBounds = useMemo(() => computeLoopBounds(items), [items]);

  // Get seamlessly looping items using 3x3 tile pattern
  const loopedItems = useInfiniteGrid({
    baseItems: items,
    offset: position,
    gridWidth: loopBounds.width,
    gridHeight: loopBounds.height,
  });

  const handleItemClick = useCallback(
    (item: PortfolioItemType) => {
      // Only trigger click if it wasn't a drag
      if (isClick()) {
        console.log('🖱️ Item clicked:', {
          clickedId: item.id,
          clickedTitle: item.title,
          clickedImageUrl: item.imageUrl,
        });

        // Find the original base item by extracting the base ID from composite ID
        // Looped items have IDs like "5-1-0", we need to extract "5"
        const baseId = typeof item.id === 'string'
          ? parseInt(item.id.split('-')[0])
          : item.id;

        console.log('🔍 Looking for base ID:', baseId);

        const baseItem = items.find(i => i.id === baseId);

        if (baseItem) {
          console.log('✅ Found base item:', {
            id: baseItem.id,
            title: baseItem.title,
            imageUrl: baseItem.imageUrl,
          });
          setSelectedItem(baseItem);
        } else {
          console.log('⚠️ Base item not found, using clicked item');
          setSelectedItem(item);
        }
      }
    },
    [isClick, items]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Handle ESC key to close detail view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        background: 'var(--bg)',
        touchAction: 'none', // Prevent default touch behaviors
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Items layer - GPU-accelerated transform.
          The leading translate(50%, 50%) puts world-origin (0,0) at the
          viewport centre on first paint, so a centered grid laid out
          around (0,0) sits in the middle of the screen instead of
          bleeding off the top-left. */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate(50%, 50%) translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
      >
        {loopedItems.map((item) => (
          <PortfolioItem
            key={item.id}
            item={item}
            onClick={handleItemClick}
          />
        ))}
      </div>

      {/* Info overlay — thesis-aligned: no count claim, no "click-bait", just orientation */}
      <div
        className="absolute bottom-6 left-6 text-xs pointer-events-none select-none font-display tracking-wide"
        style={{ color: 'var(--text-3)' }}
      >
        <p>Drag to look around &middot; Click a piece to read about it</p>
      </div>

      {/* Artwork Detail View — wrapped in AnimatePresence so the
          exit animation actually fires when selectedItem becomes null.
          Without this wrapper, the component unmounts immediately
          and the close feels abrupt. */}
      <AnimatePresence>
        {selectedItem && (
          <ArtworkDetail
            key="detail"
            item={selectedItem}
            allItems={items}
            onClose={handleCloseDetail}
            onSelectItem={setSelectedItem}
            onTagClick={onTagClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
