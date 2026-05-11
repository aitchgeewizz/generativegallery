import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { collections } from './collections/registry';
import { PortfolioItem, ActiveFilter } from './types';

/**
 * Target visible artworks per refresh. Per SPEC.md: finite, curated,
 * not infinite. 24 in a 6x4 loop tile reads as a small gallery wall.
 * (12, the previous setting, read as sparse — Hannah's call.)
 *
 * PER_SOURCE is intentionally a bit higher than HANDFUL/3 so that
 * after we filter out items lacking images and interleave the rest,
 * we still land on ~24 even when one museum returns a partial set.
 */
const HANDFUL = 24;
const PER_SOURCE = 10;

const GRID = {
  itemsPerRow: 6,
  itemWidth: 200,
  itemHeight: 200,
  gap: 80,
};

/**
 * Lay out a list of items in a centered grid around (0, 0). The drag
 * canvas uses the loop dimensions to wrap, so positioning relative to
 * origin keeps the visible set on screen for the first paint.
 */
const layoutCentered = (raw: PortfolioItem[]): PortfolioItem[] => {
  const { itemsPerRow, itemWidth, itemHeight, gap } = GRID;
  const rows = Math.ceil(raw.length / itemsPerRow);
  const cols = Math.min(raw.length, itemsPerRow);
  const totalWidth = cols * itemWidth + Math.max(cols - 1, 0) * gap;
  const totalHeight = rows * itemHeight + Math.max(rows - 1, 0) * gap;
  const offsetX = -totalWidth / 2;
  const offsetY = -totalHeight / 2;

  return raw.map((item, i) => ({
    ...item,
    id: i,
    x: (i % itemsPerRow) * (itemWidth + gap) + offsetX,
    y: Math.floor(i / itemsPerRow) * (itemHeight + gap) + offsetY,
  }));
};

/**
 * Interleave one item at a time from each input list so source mixing
 * is visible even in a short list (e.g. Fine Art / Design / Photo / Fine Art / ...).
 */
const interleave = <T,>(lists: T[][]): T[] => {
  const out: T[] = [];
  const max = Math.max(...lists.map(l => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
};

function App() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({ mode: 'collection' });

  // Mixed load: a handful from each source, interleaved, laid out together.
  useEffect(() => {
    let cancelled = false;

    const loadHandful = async () => {
      setItems([]);
      setLoading(true);
      setError(null);

      console.log(`🔄 Loading a handful (${HANDFUL}) from ${collections.length} archives…`);

      try {
        const perSource = await Promise.all(
          collections.map(async (c) => {
            try {
              return await c.fetchItems(PER_SOURCE);
            } catch (err) {
              console.warn(`⚠️ ${c.name} failed:`, err);
              return [];
            }
          }),
        );

        if (cancelled) return;

        const mixed = interleave(perSource).slice(0, HANDFUL);
        if (mixed.length === 0) {
          throw new Error('No items returned from any source — try refreshing.');
        }

        const placed = layoutCentered(mixed);
        console.log(`✅ Loaded ${placed.length} items (mixed from ${collections.length} sources)`);
        setItems(placed);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('❌ Failed to load handful:', err);
        setError(err instanceof Error ? err.message : 'Couldn’t load the archives.');
        setLoading(false);
      }
    };

    // Only do the mixed-load when not in a tag-filter view; tag clicks
    // own their own loading flow below.
    if (activeFilter.mode === 'collection') {
      loadHandful();
    }

    return () => {
      cancelled = true;
    };
  }, [refreshSeed, activeFilter.mode]);

  const handleRefresh = () => {
    setActiveFilter({ mode: 'collection' });
    setRefreshSeed((n) => n + 1);
  };

  // Clicking a tag in the detail view ("more by this maker", etc.) searches
  // across all sources in parallel. There is no "current collection" to
  // scope to — the experience is unified.
  const handleTagClick = async (tagLabel: string) => {
    console.log(`🏷️ Following the thread: ${tagLabel}`);

    setActiveFilter({
      mode: 'tag-filter',
      tagLabel,
      scope: 'all',
      resultCount: 0,
      canExpandScope: false,
    });

    setLoading(true);

    try {
      const results = await Promise.all(
        collections.map((c) =>
          c.searchByTag(tagLabel, PER_SOURCE).catch(() => [] as PortfolioItem[]),
        ),
      );

      const mixed = interleave(results).slice(0, HANDFUL);
      const placed = layoutCentered(mixed);

      setItems(placed);
      setActiveFilter({
        mode: 'tag-filter',
        tagLabel,
        scope: 'all',
        resultCount: placed.length,
        canExpandScope: false,
      });
      console.log(`✅ Found ${placed.length} items for "${tagLabel}"`);
    } catch (err) {
      console.error('❌ Tag search failed:', err);
      setItems([]);
    }

    setLoading(false);
  };

  const handleClearFilter = () => {
    setActiveFilter({ mode: 'collection' });
    setRefreshSeed((n) => n + 1);
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-4">
          <div className="space-y-3">
            <h2 className="text-xl font-display text-white/60 tracking-wide">
              The archive couldn&rsquo;t open
            </h2>
            <p className="text-white/25 text-sm">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
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
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-white/50 text-lg font-display tracking-wide"
        >
          {activeFilter.mode === 'tag-filter' ? activeFilter.tagLabel : 'A moment…'}
        </motion.p>
      </div>
    );
  }

  // Empty state after a tag search
  if (items.length === 0 && activeFilter.mode === 'tag-filter') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-4">
          <div className="space-y-3">
            <h2 className="text-xl font-display text-white/60 tracking-wide">
              Nothing for &ldquo;{activeFilter.tagLabel}&rdquo;
            </h2>
            <p className="text-white/25 text-sm">
              The thread doesn&rsquo;t lead anywhere in these archives.
            </p>
          </div>
          <button
            onClick={handleClearFilter}
            className="text-white/40 hover:text-white/70 transition-colors text-sm font-display tracking-wide"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-[#0a0a0a] relative gallery-grain">
      <InfiniteCanvas items={items} onTagClick={handleTagClick} />

      {/* Bottom-right controls — a single refresh, no collection picker.
          See SPEC.md: no collection-picker as primary nav for v1. */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {activeFilter.mode === 'tag-filter' && (
          <button
            onClick={handleClearFilter}
            className="text-white/40 hover:text-white/70 transition-colors text-sm font-display tracking-wide"
          >
            &larr; Back
          </button>
        )}
        <button
          onClick={handleRefresh}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-all"
          title="A new handful"
          aria-label="Refresh for a new handful"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default App;
