import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { TopNav, SourceMode } from './components/TopNav';
import { Intro } from './components/Intro';
import { AboutModal } from './components/AboutModal';
import { collections, getCollection } from './collections/registry';
import { PortfolioItem, ActiveFilter } from './types';

type Theme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'slowerstranger:theme';

/**
 * Target visible artworks per refresh. Per SPEC.md: finite, curated,
 * not infinite. 24 in a 6x4 loop tile reads as a small gallery wall.
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
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
};

const SOURCE_STORAGE_KEY = 'slowerstranger:sourceMode';

function App() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({ mode: 'collection' });
  const [aboutOpen, setAboutOpen] = useState(false);

  // Theme: dark is the default identity (gallery feel), light is a
  // reading-mode alternative. Persisted to localStorage.
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  // Apply theme to <html> via the `.dark` class (Tailwind darkMode:'class')
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleThemeToggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Source mode: Mixed (default) or a single archive. Persisted so a
  // visitor's preference survives refresh.
  const [sourceMode, setSourceMode] = useState<SourceMode>(() => {
    const saved = localStorage.getItem(SOURCE_STORAGE_KEY);
    const valid: SourceMode[] = ['mixed', 'art-institute', 'met-design', 'harvard'];
    return (valid.includes(saved as SourceMode) ? (saved as SourceMode) : 'mixed');
  });

  useEffect(() => {
    let cancelled = false;

    const loadHandful = async () => {
      setItems([]);
      setLoading(true);
      setError(null);

      try {
        let raw: PortfolioItem[];

        if (sourceMode === 'mixed') {
          console.log(`🔄 Loading mixed handful (${HANDFUL}) from ${collections.length} archives…`);
          const perSource = await Promise.all(
            collections.map(async (c) => {
              try {
                return await c.fetchItems(PER_SOURCE);
              } catch (err) {
                console.warn(`⚠️ ${c.name} failed:`, err);
                return [] as PortfolioItem[];
              }
            }),
          );
          raw = interleave(perSource).slice(0, HANDFUL);
        } else {
          const c = getCollection(sourceMode);
          if (!c) throw new Error(`Unknown source: ${sourceMode}`);
          console.log(`🔄 Loading ${HANDFUL} from ${c.name}…`);
          raw = await c.fetchItems(HANDFUL);
          raw = raw.slice(0, HANDFUL);
        }

        if (cancelled) return;

        if (raw.length === 0) {
          throw new Error('No items returned — try refreshing.');
        }

        const placed = layoutCentered(raw);
        console.log(`✅ Loaded ${placed.length} items (${sourceMode})`);
        setItems(placed);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('❌ Failed to load handful:', err);
        setError(err instanceof Error ? err.message : 'Couldn’t load the archives.');
        setLoading(false);
      }
    };

    if (activeFilter.mode === 'collection') {
      loadHandful();
    }

    return () => {
      cancelled = true;
    };
  }, [refreshSeed, activeFilter.mode, sourceMode]);

  const handleSourceChange = (mode: SourceMode) => {
    setSourceMode(mode);
    localStorage.setItem(SOURCE_STORAGE_KEY, mode);
    setActiveFilter({ mode: 'collection' });
  };

  const handleRefresh = () => {
    setActiveFilter({ mode: 'collection' });
    setRefreshSeed((n) => n + 1);
  };

  // Clicking a tag in the detail view ("more by this maker", etc.) searches
  // across all sources in parallel regardless of current source mode —
  // a thread is a thread, follow it where it leads.
  //
  // The `category` parameter (when present) lets us tighten the results.
  // For maker tags the museum APIs' broad `q=` search returns anything
  // containing the words anywhere, so "Trent Bozeman" can match a place
  // name or unrelated description. We post-filter to items where the
  // maker is actually credited.
  const handleTagClick = async (tagLabel: string, category?: string) => {
    console.log(`🏷️ Following the thread: ${tagLabel} (category=${category || 'unspecified'})`);

    setActiveFilter({
      mode: 'tag-filter',
      tagLabel,
      scope: 'all',
      resultCount: 0,
      canExpandScope: false,
    });

    setLoading(true);

    try {
      // Over-fetch when we're going to post-filter, so we still land
      // on a reasonable count after weeding out non-matches.
      const perSourceForSearch = category === 'maker' ? PER_SOURCE * 3 : PER_SOURCE;
      const results = await Promise.all(
        collections.map((c) =>
          c.searchByTag(tagLabel, perSourceForSearch).catch(() => [] as PortfolioItem[]),
        ),
      );

      let mixed = interleave(results);

      // Maker-tag filter: keep only items where the maker name we
      // searched is actually credited (in participants or description).
      // Substring match, case-insensitive, so "Vincent van Gogh"
      // matches "Van Gogh, Vincent" and similar variants.
      if (category === 'maker') {
        const needle = tagLabel.toLowerCase().trim();
        mixed = mixed.filter((item) => {
          const inParticipants = item.participants?.some((p) =>
            (p.name || '').toLowerCase().includes(needle),
          );
          if (inParticipants) return true;
          const inDescription = (item.description || '').toLowerCase().includes(needle);
          return inDescription;
        });
        console.log(`🎯 Maker filter kept ${mixed.length} of the matched items`);
      }

      mixed = mixed.slice(0, HANDFUL);
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
      <div className="w-full h-screen flex items-center justify-center bg-[var(--bg)] gallery-grain">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-4">
          <div className="space-y-3">
            <h2 className="text-xl font-display tracking-wide" style={{ color: 'var(--text-2)' }}>
              The archive couldn&rsquo;t open
            </h2>
            <p className="text-sm font-display" style={{ color: 'var(--text-3)' }}>{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="text-sm font-display tracking-wide transition-colors"
            style={{ color: 'var(--text-2)' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state after a tag search
  if (!loading && items.length === 0 && activeFilter.mode === 'tag-filter') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[var(--bg)] gallery-grain">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-4">
          <div className="space-y-3">
            <h2 className="text-xl font-display tracking-wide" style={{ color: 'var(--text-2)' }}>
              Nothing for &ldquo;{activeFilter.tagLabel}&rdquo;
            </h2>
            <p className="text-sm font-display" style={{ color: 'var(--text-3)' }}>
              The thread doesn&rsquo;t lead anywhere in these archives.
            </p>
          </div>
          <button
            onClick={handleClearFilter}
            className="text-sm font-display tracking-wide transition-colors"
            style={{ color: 'var(--text-2)' }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-[var(--bg)] relative gallery-grain">
      <AnimatePresence mode="wait">
        {loading ? (
          <Intro key="intro" />
        ) : (
          <motion.div
            key="canvas"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <InfiniteCanvas items={items} onTagClick={handleTagClick} />
          </motion.div>
        )}
      </AnimatePresence>

      <TopNav
        sourceMode={sourceMode}
        onSourceChange={handleSourceChange}
        onRefresh={handleRefresh}
        onAboutOpen={() => setAboutOpen(true)}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />

      {activeFilter.mode === 'tag-filter' && !loading && (
        <button
          onClick={handleClearFilter}
          className="fixed bottom-6 left-6 z-40 text-sm font-display tracking-wide transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          &larr; Back to the wall
        </button>
      )}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

export default App;
