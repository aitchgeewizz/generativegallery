import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { CollectionSwitcher } from './components/CollectionSwitcher';
import { collections, getCollection, defaultCollectionId } from './collections/registry';
import { PortfolioItem, ActiveFilter } from './types';

function App() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCollection, setCurrentCollection] = useState<string>(() => {
    const saved = localStorage.getItem('currentCollection');
    if (saved && getCollection(saved)) return saved;
    return defaultCollectionId;
  });

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({
    mode: 'collection',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCollection = async (collectionId: string) => {
      setItems([]);
      setLoading(true);
      setError(null);

      const collection = getCollection(collectionId);
      if (!collection) {
        setError(`Unknown collection: ${collectionId}`);
        setLoading(false);
        return;
      }

      console.log(`🔄 Loading ${collection.name} collection...`);

      try {
        const collectionItems = await collection.fetchItems(32);

        if (!cancelled) {
          if (collectionItems.length > 0) {
            console.log(`✅ Loaded ${collectionItems.length} items for ${collection.name}`);
            setItems(collectionItems);
            setLoading(false);
          } else {
            throw new Error('No items returned from API - try refreshing again');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`❌ Failed to load ${collection.name}:`, err);
          setError(err instanceof Error ? err.message : 'Failed to load collection');
          setLoading(false);
        }
      }
    };

    loadCollection(currentCollection);

    return () => {
      cancelled = true;
    };
  }, [currentCollection]);

  const handleCollectionChange = (collectionId: string) => {
    console.log(`🔀 Switching to ${collectionId}`);
    setCurrentCollection(collectionId);
    localStorage.setItem('currentCollection', collectionId);
    setActiveFilter({ mode: 'collection' });
  };

  const handleExpandScope = () => {
    if (activeFilter.tagLabel) {
      handleTagClick(activeFilter.tagLabel, true);
    }
  };

  const handleTagClick = async (tagLabel: string, expandToAll: boolean = false) => {
    const collectionToSearch = activeFilter.mode === 'tag-filter' && activeFilter.previousCollection
      ? activeFilter.previousCollection
      : currentCollection;

    console.log(`🏷️ Filtering by tag: ${tagLabel}${expandToAll ? ' (all collections)' : ` (${collectionToSearch})`}`);

    setActiveFilter({
      mode: 'tag-filter',
      tagLabel,
      previousCollection: collectionToSearch,
      scope: expandToAll ? 'all' : 'current',
      resultCount: 0,
      canExpandScope: false,
    });

    setLoading(true);

    let filteredItems: PortfolioItem[] = [];

    try {
      if (expandToAll) {
        console.log('🌐 Searching all collections in parallel...');
        const perCollection = Math.ceil(32 / collections.length);
        const results = await Promise.all(
          collections.map(c => c.searchByTag(tagLabel, perCollection))
        );

        // Interleave results from all collections
        const combined: PortfolioItem[] = [];
        const maxLength = Math.max(...results.map(r => r.length));
        for (let i = 0; i < maxLength; i++) {
          for (const result of results) {
            if (i < result.length) combined.push(result[i]);
          }
        }

        filteredItems = combined.slice(0, 32);
        console.log(`✅ Found ${filteredItems.length} items across all collections`);

        // Reposition in centered grid
        const itemsPerRow = 8;
        const itemWidth = 200;
        const itemHeight = 200;
        const gap = 100;
        const rows = Math.ceil(filteredItems.length / itemsPerRow);
        const cols = Math.min(filteredItems.length, itemsPerRow);
        const totalWidth = cols * itemWidth + (cols - 1) * gap;
        const totalHeight = rows * itemHeight + (rows - 1) * gap;
        const offsetX = -totalWidth / 2;
        const offsetY = -totalHeight / 2;

        filteredItems = filteredItems.map((item, i) => ({
          ...item,
          id: i,
          x: (i % itemsPerRow) * (itemWidth + gap) + offsetX,
          y: Math.floor(i / itemsPerRow) * (itemHeight + gap) + offsetY,
        }));
      } else {
        const collection = getCollection(collectionToSearch);
        if (collection) {
          filteredItems = await collection.searchByTag(tagLabel, 32);
        }
        console.log(`✅ Found ${filteredItems.length} items in ${collectionToSearch}`);
      }
    } catch (err) {
      console.error('❌ Tag filtering failed:', err);
      filteredItems = [];
    }

    setItems(filteredItems);
    setActiveFilter({
      mode: 'tag-filter',
      tagLabel,
      previousCollection: collectionToSearch,
      scope: expandToAll ? 'all' : 'current',
      resultCount: filteredItems.length,
      canExpandScope: !expandToAll && filteredItems.length < 32,
    });

    setLoading(false);
  };

  const handleClearFilter = async () => {
    const collectionToLoad = activeFilter.previousCollection || currentCollection;
    console.log(`🔙 Clearing filter, returning to ${collectionToLoad}`);

    setActiveFilter({ mode: 'collection' });
    setCurrentCollection(collectionToLoad);
    localStorage.setItem('currentCollection', collectionToLoad);

    setLoading(true);
    const collection = getCollection(collectionToLoad);
    if (collection) {
      try {
        const collectionItems = await collection.fetchItems(32);
        setItems(collectionItems);
      } catch {
        setItems([]);
      }
    }
    setLoading(false);
  };

  const currentCol = getCollection(currentCollection);

  // Error state
  if (error && !loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-4">
          <div className="space-y-3">
            <h2 className="text-xl font-display text-white/60 tracking-wide">
              Couldn't load this collection
            </h2>
            <p className="text-white/25 text-sm">
              {error}
            </p>
          </div>
          <button
            onClick={() => {
              setError(null);
              const temp = currentCollection;
              setCurrentCollection(defaultCollectionId);
              setTimeout(() => setCurrentCollection(temp), 0);
            }}
            className="text-white/40 hover:text-white/70 transition-colors text-sm font-display tracking-wide"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0a]">
        <motion.p
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-white/50 text-lg font-display tracking-wide"
        >
          {activeFilter.mode === 'tag-filter'
            ? activeFilter.tagLabel
            : currentCol?.name || 'Loading'
          }
        </motion.p>
      </div>
    );
  }

  // Empty state after filtering
  if (items.length === 0 && activeFilter.mode === 'tag-filter') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-4">
          <div className="space-y-3">
            <h2 className="text-xl font-display text-white/60 tracking-wide">
              No results for &ldquo;{activeFilter.tagLabel}&rdquo;
            </h2>
            <p className="text-white/25 text-sm">
              {activeFilter.scope === 'current'
                ? `Nothing in ${currentCol?.name || 'this collection'}.`
                : 'Nothing across all collections.'
              }
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {activeFilter.scope === 'current' && (
              <button
                onClick={handleExpandScope}
                className="text-white/40 hover:text-white/70 transition-colors text-sm font-display tracking-wide"
              >
                Search all collections
              </button>
            )}
            <button
              onClick={handleClearFilter}
              className="text-white/30 hover:text-white/50 transition-colors text-sm"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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
