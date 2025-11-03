import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { CollectionSwitcher } from './components/CollectionSwitcher';
import { generateArtworkItems, searchArtworkItemsByTag } from './data/placeholderItems';
import { generateDesignItems, searchDesignItemsByTag } from './data/designItems';
import { PortfolioItem, CollectionType, ActiveFilter } from './types';
import { searchByTag } from './utils/tagExtractor';

function App() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [allItems, setAllItems] = useState<PortfolioItem[]>([]); // Store all items for tag filtering
  const [loading, setLoading] = useState(true);
  // Persist collection selection across refreshes using localStorage
  const [currentCollection, setCurrentCollection] = useState<CollectionType>(() => {
    const saved = localStorage.getItem('currentCollection');
    return (saved as CollectionType) || 'met-design';
  });

  // Filter state for tag-based filtering
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({
    mode: 'collection',
  });

  useEffect(() => {
    let cancelled = false;

    const loadCollection = async (collection: CollectionType) => {
      // Clear items immediately to prevent showing wrong collection
      setItems([]);
      setLoading(true);

      console.log(`🔄 Loading ${collection} collection...`);

      // Load exactly 32 items for seamless 8x4 grid loop
      let collectionItems: PortfolioItem[] = [];

      if (collection === 'art-institute') {
        console.log('🎨 Fetching Fine Art collection...');
        collectionItems = await generateArtworkItems(32);
      } else if (collection === 'met-design') {
        console.log('✨ Fetching Design collection...');
        collectionItems = await generateDesignItems(32);
      }

      // Only update if we got items and this request wasn't cancelled
      if (!cancelled && collectionItems.length > 0) {
        console.log(`✅ Loaded ${collectionItems.length} items for ${collection}`);
        setItems(collectionItems);
        setAllItems(collectionItems); // Store for tag filtering
        setLoading(false);
      } else if (!cancelled) {
        console.warn(`⚠️ No items loaded for ${collection}`);
        setLoading(false);
      }
    };

    loadCollection(currentCollection);

    // Cleanup function to cancel stale requests
    return () => {
      cancelled = true;
    };
  }, [currentCollection]);

  const handleCollectionChange = (collection: CollectionType) => {
    console.log(`🔀 Switching to ${collection}`);
    setCurrentCollection(collection);
    // Save to localStorage so it persists across refreshes
    localStorage.setItem('currentCollection', collection);
    // Reset filter when changing collections
    setActiveFilter({ mode: 'collection' });
  };

  // Handle tag click - SMART SCOPING with FULL API SEARCH
  // Searches the entire museum API, centers results, fills up to 32 items
  const handleTagClick = async (tagLabel: string, expandToAll: boolean = false) => {
    // Determine which collection to search
    // If we're already in a filtered state, use the previousCollection (original collection)
    // This prevents getting stuck in "all collections" mode
    const collectionToSearch = activeFilter.mode === 'tag-filter' && activeFilter.previousCollection
      ? activeFilter.previousCollection
      : currentCollection;

    console.log(`🏷️ Filtering by tag: ${tagLabel}${expandToAll ? ' (all collections)' : ` (${collectionToSearch})`}`);

    // Set filter state FIRST to fix race condition with loading message
    setActiveFilter({
      mode: 'tag-filter',
      tagLabel,
      previousCollection: collectionToSearch, // Use the determined collection
      scope: expandToAll ? 'all' : 'current',
      resultCount: 0,
      canExpandScope: false,
    });

    setLoading(true);

    let filteredItems: PortfolioItem[] = [];
    let searchError = false;

    try {
      if (expandToAll) {
        // EXPANDED SCOPE: Search both museum APIs and interleave results
        console.log('🌐 Searching all collections in parallel...');
        const [artItems, designItems] = await Promise.all([
          searchArtworkItemsByTag(tagLabel, 16),  // Get 16 from each
          searchDesignItemsByTag(tagLabel, 16),   // Total 32 when combined
        ]);

        // Interleave results from both collections for diversity
        const combined: PortfolioItem[] = [];
        const maxLength = Math.max(artItems.length, designItems.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < artItems.length) combined.push(artItems[i]);
          if (i < designItems.length) combined.push(designItems[i]);
        }

        filteredItems = combined.slice(0, 32);
        console.log(`✅ Found ${filteredItems.length} items across all collections (${artItems.length} art + ${designItems.length} design)`);

        // IMPORTANT: Reposition the interleaved items in a centered grid
        // This fixes the "weird grid formation" issue
        const itemsPerRow = 8;
        const itemWidth = 200;
        const itemHeight = 200;
        const gap = 100;

        const rows = Math.ceil(filteredItems.length / itemsPerRow);
        const cols = Math.min(filteredItems.length, itemsPerRow);

        // Calculate based on actual grid dimensions (better centering for partial grids)
        const totalWidth = cols * itemWidth + (cols - 1) * gap;
        const totalHeight = rows * itemHeight + (rows - 1) * gap;
        const offsetX = -totalWidth / 2;
        const offsetY = -totalHeight / 2;

        filteredItems = filteredItems.map((item, i) => {
          const row = Math.floor(i / itemsPerRow);
          const col = i % itemsPerRow;
          return {
            ...item,
            id: i, // Update ID for consistency
            x: col * (itemWidth + gap) + offsetX,
            y: row * (itemHeight + gap) + offsetY,
          };
        });

        console.log(`📐 Repositioned ${filteredItems.length} items in centered grid`);
      } else {
        // DEFAULT SCOPE: Search the original collection (not necessarily currentCollection)
        console.log(`🎯 Searching collection API: ${collectionToSearch}`);

        if (collectionToSearch === 'art-institute') {
          filteredItems = await searchArtworkItemsByTag(tagLabel, 32);
        } else if (collectionToSearch === 'met-design') {
          filteredItems = await searchDesignItemsByTag(tagLabel, 32);
        }

        console.log(`✅ Found ${filteredItems.length} items in ${collectionToSearch}`);
      }
    } catch (error) {
      console.error('❌ Tag filtering failed:', error);
      searchError = true;
      filteredItems = [];
    }

    // ALWAYS set filter state, even if search failed or returned no results
    // This ensures the empty state displays correctly
    setItems(filteredItems);
    setAllItems(filteredItems);
    setActiveFilter({
      mode: 'tag-filter',
      tagLabel,
      previousCollection: currentCollection,
      scope: expandToAll ? 'all' : 'current',
      resultCount: filteredItems.length,
      canExpandScope: !expandToAll && filteredItems.length < 32,
    });

    setLoading(false);

    // Log final state for debugging
    if (filteredItems.length === 0) {
      console.warn(`⚠️ No results found for "${tagLabel}" - showing empty state`);
    }
  };

  // Handle clearing filter - return to previous collection
  const handleClearFilter = async () => {
    console.log(`🔙 Clearing filter, returning to ${activeFilter.previousCollection || currentCollection}`);
    const collectionToLoad = activeFilter.previousCollection || currentCollection;

    // Reset filter state first
    setActiveFilter({ mode: 'collection' });

    // Force reload the collection
    setLoading(true);

    let collectionItems: PortfolioItem[] = [];

    if (collectionToLoad === 'art-institute') {
      console.log('🎨 Reloading Fine Art collection...');
      collectionItems = await generateArtworkItems(32);
    } else if (collectionToLoad === 'met-design') {
      console.log('✨ Reloading Design collection...');
      collectionItems = await generateDesignItems(32);
    }

    setItems(collectionItems);
    setAllItems(collectionItems);
    setCurrentCollection(collectionToLoad);
    localStorage.setItem('currentCollection', collectionToLoad);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-4xl"
          >
            {activeFilter.mode === 'tag-filter' ? '🔍' : '✨'}
          </motion.div>
          <div className="text-white/70 text-lg">
            {activeFilter.mode === 'tag-filter'
              ? `Searching for "${activeFilter.tagLabel}"...`
              : `Loading ${currentCollection === 'art-institute' ? 'Fine Art' : 'Design'} collection...`
            }
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no items found after filtering
  if (items.length === 0 && activeFilter.mode === 'tag-filter') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
          <div className="text-6xl">😔</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              No items found with "{activeFilter.tagLabel}"
            </h2>
            <p className="text-white/60">
              {activeFilter.scope === 'current'
                ? `No items matching this tag in the ${currentCollection === 'art-institute' ? 'Fine Art' : 'Design'} collection.`
                : 'No items matching this tag across all collections.'
              }
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {activeFilter.scope === 'current' && (
              <motion.button
                onClick={handleExpandScope}
                className="px-6 py-3 rounded-full bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-all text-purple-300 font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🔍 Search all collections instead
              </motion.button>
            )}
            <motion.button
              onClick={handleClearFilter}
              className="px-6 py-3 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-all text-white font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ← Back to Collections
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Handle expanding filter scope to all collections
  const handleExpandScope = () => {
    if (activeFilter.tagLabel) {
      handleTagClick(activeFilter.tagLabel, true);
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] relative">
      <InfiniteCanvas items={items} onTagClick={handleTagClick} />
      <CollectionSwitcher
        currentCollection={currentCollection}
        onSelectCollection={handleCollectionChange}
        activeFilter={activeFilter}
        onClearFilter={handleClearFilter}
        onExpandScope={handleExpandScope}
      />
    </div>
  );
}

export default App;
