import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { markPicturesLoaded } from './components/PortfolioItem';
import { TopNav, SourceMode } from './components/TopNav';
import { Intro } from './components/Intro';
import { AboutModal } from './components/AboutModal';
import { PortfolioItem, ActiveFilter } from './types';
import { dealRoom, followThread, signatureOf, standInFor, ShelfItem } from './shelf';

type Theme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'slowerstranger:theme';
const SOURCE_STORAGE_KEY = 'slowerstranger:sourceMode';

/**
 * Target visible artworks per refresh. Per SPEC.md: finite, curated,
 * not infinite. Twenty-four works in a looped 6x4 room keeps the
 * viewport full on tall screens without adding new content as you drag.
 *
 * Rooms are dealt from the shelf (src/shelf), which is gathered ahead
 * of time, so a visit never waits on a museum's data service.
 */
const HANDFUL = 24;

const GRID = {
  itemsPerRow: 6,
  itemWidth: 200,
  itemHeight: 200,
  gap: 40,
};

/**
 * Lay out a list of items in a centered grid around (0, 0). The drag
 * canvas uses the loop dimensions to wrap, so positioning relative to
 * origin keeps the visible set on screen for the first paint.
 */
const layoutCentered = (raw: Array<ShelfItem | PortfolioItem>): PortfolioItem[] => {
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
 * Fetch a room's wall pictures before it is hung, so the old room stays
 * up until the new one is ready and then the whole wall changes at
 * once. Pictures that are slow or refused are not waited on past
 * `timeoutMs`; their tiles load (or hang a stand-in) as usual.
 */
const fetchPictures = (items: PortfolioItem[], timeoutMs = 3000): Promise<string[]> => {
  const urls = [...new Set(items.map((i) => i.thumbnailUrl || i.imageUrl).filter((u): u is string => !!u))];
  const ready: string[] = [];
  const each = urls.map(
    (url) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ready.push(url);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      }),
  );
  return Promise.race([Promise.all(each), new Promise((r) => setTimeout(r, timeoutMs))]).then(() => [...ready]);
};

/**
 * Session variety: remember which works have already hung on the wall
 * this visit, and drop them from later rooms. sessionStorage, not
 * localStorage — tomorrow's visit starts clean, which suits a daily
 * ritual better than a permanent ledger.
 *
 * Signature is (imageUrl || url) rather than item.id because adapters
 * assign id by array index — every refresh the first item is id=0
 * regardless of which artwork it actually is.
 */
const SEEN_KEY = 'slowerstranger:seenThisSession';
const SEEN_CAP = 500;

const loadSeen = (): Set<string> => {
  try {
    return new Set<string>(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const rememberSeen = (items: PortfolioItem[]) => {
  try {
    const seen = loadSeen();
    for (const it of items) seen.add(signatureOf(it));
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-SEEN_CAP)));
  } catch {
    // Storage unavailable — variety degrades gracefully.
  }
};

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

  // Curatorial lens. Mixed is the default experience; the other pills
  // are lenses over multiple archives, never per-archive tabs.
  const [sourceMode, setSourceMode] = useState<SourceMode>(() => {
    const saved = localStorage.getItem(SOURCE_STORAGE_KEY);
    // Older builds stored per-archive ids; map them onto lenses so a
    // returning visitor lands in the equivalent room.
    const legacy: Record<string, SourceMode> = {
      'met-design': 'design',
      'vam': 'design',
      'harvard-design': 'design',
      'art-institute': 'art',
      'harvard': 'photo',
    };
    const candidate = (saved && legacy[saved]) || saved;
    const valid: SourceMode[] = ['mixed', 'design', 'art', 'photo'];
    return valid.includes(candidate as SourceMode) ? (candidate as SourceMode) : 'mixed';
  });

  // Session-wide set of artwork signatures already shown. Prevents the
  // same artwork reappearing across refreshes / category switches.
  // Seeded from sessionStorage so variety survives a reload within the
  // same visit; each API has a finite popular-page bias, so without
  // this the user sees the same hero pieces over and over.
  const seenSignaturesRef = useRef<Set<string>>(loadSeen());

  // Whether a room has been hung yet this visit (see loadHandful).
  const hasHungRef = useRef(false);

  // Stand-ins taken by the current room, for handleImageDead below.
  const standInsRef = useRef({ count: 0, handled: new Set<string>(), onWall: new Set<string>() });

  useEffect(() => {
    let cancelled = false;

    const loadHandful = async () => {
      // The opening screen belongs to arriving. After that, a refresh or
      // a lens change keeps the current room up while the next one is
      // fetched, then changes the whole wall at once.
      const arriving = !hasHungRef.current;
      if (arriving) {
        setItems([]);
        setLoading(true);
      }
      setError(null);

      try {
        const room = await dealRoom(sourceMode, HANDFUL, seenSignaturesRef.current);
        if (cancelled) return;
        if (room.length === 0) throw new Error('The shelf is empty. Try refreshing.');

        const placed = layoutCentered(room);
        if (!arriving) {
          markPicturesLoaded(await fetchPictures(placed));
          if (cancelled) return;
        }

        for (const item of room) seenSignaturesRef.current.add(signatureOf(item));
        standInsRef.current = { count: 0, handled: new Set(), onWall: new Set(room.map(signatureOf)) };
        rememberSeen(placed);
        hasHungRef.current = true;
        setItems(placed);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load room:', err);
        setError(err instanceof Error ? err.message : 'Couldn’t open the shelf.');
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

  // A tile reports that none of its picture addresses loaded: hang a
  // stand-in from a different archive at the same spot, so the wall
  // never shows a hole. Looped copies of a tile all report the same
  // failure, so only the first report for a given work acts. The cap
  // stops a visitor who is offline from cycling the whole shelf.
  const MAX_STAND_INS = 40;
  const handleImageDead = useCallback(async (dead: PortfolioItem) => {
    const sig = signatureOf(dead);
    const state = standInsRef.current;
    if (state.handled.has(sig) || state.count >= MAX_STAND_INS) return;
    state.handled.add(sig);
    state.count += 1;

    const standIn = await standInFor(dead, state.onWall, seenSignaturesRef.current).catch(() => null);
    if (!standIn || standInsRef.current !== state) return;

    seenSignaturesRef.current.add(signatureOf(standIn));
    setItems((current) => {
      const index = current.findIndex((i) => signatureOf(i) === sig);
      if (index === -1) return current;
      const next = [...current];
      next[index] = { ...standIn, id: current[index].id, x: current[index].x, y: current[index].y };
      return next;
    });
  }, []);

  const handleSourceChange = (mode: SourceMode) => {
    setSourceMode(mode);
    localStorage.setItem(SOURCE_STORAGE_KEY, mode);
    setActiveFilter({ mode: 'collection' });
  };

  const handleRefresh = () => {
    setActiveFilter({ mode: 'collection' });
    setRefreshSeed((n) => n + 1);
  };

  // Clicking a tag in the detail view ("more by this maker", etc.)
  // follows that thread across the whole shelf, whatever lens is open.
  // A thread is a thread, follow it where it leads.
  const handleTagClick = async (tagLabel: string, category?: string) => {
    setActiveFilter({
      mode: 'tag-filter',
      tagLabel,
      scope: 'all',
      resultCount: 0,
      canExpandScope: false,
    });

    try {
      const found = await followThread(tagLabel, category, HANDFUL);
      standInsRef.current = { count: 0, handled: new Set(), onWall: new Set(found.map(signatureOf)) };
      const placed = layoutCentered(found);
      markPicturesLoaded(await fetchPictures(placed));

      setItems(placed);
      setActiveFilter({
        mode: 'tag-filter',
        tagLabel,
        scope: 'all',
        resultCount: placed.length,
        canExpandScope: false,
      });
    } catch (err) {
      console.error('Thread search failed:', err);
      setItems([]);
    }
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
            <h2 className="type-panel-title" style={{ color: 'var(--text-2)' }}>
              The archive couldn&rsquo;t open
            </h2>
            <p className="type-body" style={{ color: 'var(--text-3)' }}>{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="type-control transition-colors"
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
            <h2 className="type-panel-title" style={{ color: 'var(--text-2)' }}>
              Nothing for &ldquo;{activeFilter.tagLabel}&rdquo;
            </h2>
            <p className="type-body" style={{ color: 'var(--text-3)' }}>
              The thread doesn&rsquo;t lead anywhere in these archives.
            </p>
          </div>
          <button
            onClick={handleClearFilter}
            className="type-control transition-colors"
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
            <InfiniteCanvas items={items} onTagClick={handleTagClick} onImageDead={handleImageDead} />
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
          className="fixed bottom-6 left-6 z-40 type-small transition-colors"
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
