import { useCallback, useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { PortfolioItem as PortfolioItemType } from '../types';
import { useSmoothDrag } from '../hooks/useSmoothDrag';
import { useInfiniteGrid, MIN_ITEMS_TO_LOOP } from '../hooks/useInfiniteGrid';
import { PortfolioItem } from './PortfolioItem';
import { ArtworkDetail } from './ArtworkDetail';

interface InfiniteCanvasProps {
  items: PortfolioItemType[];
  onTagClick?: (tagLabel: string, category?: string) => void;
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
  // Drag offset lives in Framer Motion values, not React state — the
  // transform below updates outside the render cycle entirely.
  const { x, y, handlePointerDown, isClick } = useSmoothDrag();

  // Selected artwork for detail view
  const [selectedItem, setSelectedItem] = useState<PortfolioItemType | null>(null);

  // The orientation hint retires itself once the visitor has actually
  // dragged — after that it is furniture.
  const [hasDragged, setHasDragged] = useState(false);
  const reduceMotion = useReducedMotion();

  // Loop tile sized to actual items — see computeLoopBounds above.
  const loopBounds = useMemo(() => computeLoopBounds(items), [items]);

  // The 3x3 loop only cares which loop-tile the viewport sits in, not
  // the exact pixel offset. Tile indices are the sole drag-derived
  // React state: the subscriptions below fire on every moved pixel but
  // only setState when Math.floor crosses a boundary, so dragging
  // within a tile re-renders nothing.
  const [tile, setTile] = useState({ x: 0, y: 0 });
  const shouldLoop = items.length >= MIN_ITEMS_TO_LOOP;

  useMotionValueEvent(x, 'change', (latest) => {
    if (!shouldLoop) return;
    const tileX = Math.floor(-latest / loopBounds.width);
    setTile((prev) => (prev.x === tileX ? prev : { x: tileX, y: prev.y }));
  });

  useMotionValueEvent(y, 'change', (latest) => {
    if (!shouldLoop) return;
    const tileY = Math.floor(-latest / loopBounds.height);
    setTile((prev) => (prev.y === tileY ? prev : { x: prev.x, y: tileY }));
  });

  // Re-derive the tile when a new set loads: the drag offset persists
  // across refreshes but the loop bounds resize, which moves every
  // tile boundary under the unchanged offset.
  useEffect(() => {
    const tileX = Math.floor(-x.get() / loopBounds.width);
    const tileY = Math.floor(-y.get() / loopBounds.height);
    setTile((prev) =>
      prev.x === tileX && prev.y === tileY ? prev : { x: tileX, y: tileY }
    );
  }, [loopBounds, x, y]);

  // Get seamlessly looping items using 3x3 tile pattern
  const loopedItems = useInfiniteGrid({
    baseItems: items,
    tileX: tile.x,
    tileY: tile.y,
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
        // Resting cursor only — useSmoothDrag flips it to 'grabbing'
        // imperatively so a drag never has to touch React state.
        cursor: 'grab',
        background: 'var(--bg)',
        touchAction: 'none', // Prevent default touch behaviors
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={() => {
        if (!hasDragged && !isClick()) setHasDragged(true);
      }}
    >
      {/* Items layer - GPU-accelerated transform driven directly by the
          motion values (no re-render per frame).
          The leading translate(50%, 50%) puts world-origin (0,0) at the
          viewport centre on first paint, so a centered grid laid out
          around (0,0) sits in the middle of the screen instead of
          bleeding off the top-left. transformTemplate re-applies it in
          front of whatever transform x/y generate. */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ x, y }}
        transformTemplate={(_, generated) => `translate(50%, 50%) ${generated}`}
      >
        {loopedItems.map((item) => (
          <PortfolioItem
            key={item.id}
            item={item}
            onClick={handleItemClick}
          />
        ))}
      </motion.div>

      {/* Info overlay — thesis-aligned: no count claim, no "click-bait",
          just orientation. Sits on a theme scrim so it stays legible over
          artwork, and fades away for good after the first real drag. */}
      <motion.div
        className="absolute bottom-6 left-6 text-xs pointer-events-none select-none font-display tracking-wide px-3 py-1.5 rounded-full backdrop-blur-sm"
        style={{ color: 'var(--text-2)', background: 'var(--scrim-top)' }}
        animate={{ opacity: hasDragged ? 0 : 1 }}
        transition={{ duration: reduceMotion ? 0 : 1.2, ease: 'easeOut' }}
      >
        <p>Drag to look around &middot; Click a piece to read about it</p>
      </motion.div>

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
