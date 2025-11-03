import { useCallback, useState, useEffect } from 'react';
import { PortfolioItem as PortfolioItemType } from '../types';
import { useSmoothDrag } from '../hooks/useSmoothDrag';
import { useInfiniteGrid } from '../hooks/useInfiniteGrid';
import { getGridDimensions } from '../data/placeholderItems';
import { PortfolioItem } from './PortfolioItem';
import { ArtworkDetail } from './ArtworkDetail';

interface InfiniteCanvasProps {
  items: PortfolioItemType[];
  onTagClick?: (tagLabel: string) => void;
}

/**
 * Main infinite canvas component with buttery smooth drag and seamless looping
 * Rebuilt from scratch for world-class performance
 */
export const InfiniteCanvas = ({ items, onTagClick }: InfiniteCanvasProps) => {
  // New smooth drag hook with momentum
  const { position, isDragging, handlePointerDown, isClick } = useSmoothDrag();

  // Selected artwork for detail view
  const [selectedItem, setSelectedItem] = useState<PortfolioItemType | null>(null);

  // Get grid dimensions for 8x4 layout
  const gridDimensions = getGridDimensions();

  // Get seamlessly looping items using 3x3 tile pattern
  const loopedItems = useInfiniteGrid({
    baseItems: items,
    offset: position,
    gridWidth: gridDimensions.width,
    gridHeight: gridDimensions.height,
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
        background: '#0a0a0a',
        touchAction: 'none', // Prevent default touch behaviors
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Items layer - GPU-accelerated transform */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          // Use translate3d for GPU acceleration
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

      {/* Info overlay */}
      <div className="absolute bottom-6 left-6 text-white/50 text-sm pointer-events-none select-none">
        <p>Click and drag to explore • Click artwork to view details • {items.length} unique artworks</p>
      </div>

      {/* Artwork Detail View */}
      {selectedItem && (
        <ArtworkDetail
          item={selectedItem}
          allItems={items}
          onClose={handleCloseDetail}
          onSelectItem={setSelectedItem}
          onTagClick={onTagClick}
        />
      )}
    </div>
  );
};
