import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { TopNav, SourceMode } from './components/TopNav';
import { Intro } from './components/Intro';
import { AboutModal } from './components/AboutModal';
import { collections } from './collections/registry';
import { PortfolioItem, ActiveFilter } from './types';
import { isAbortError } from './utils/abort';
import { extractArtistName } from './utils/tagExtractor';

type Theme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'slowerstranger:theme';
const SOURCE_STORAGE_KEY = 'slowerstranger:sourceMode';

/**
 * Target visible artworks per refresh. Per SPEC.md: finite, curated,
 * not infinite. Twenty-four works in a looped 6x4 room keeps the
 * viewport full on tall screens without adding new content as you drag.
 *
 * The design lens gets reserved presence because design archives are
 * central to the project, while art and photo fill the room around it.
 */
const HANDFUL = 24;
const DESIGN_RESERVED = 8;
const PER_SUPPORTING_SOURCE = 12;
const SOURCE_TIMEOUT_MS = 8500;

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

const withTimeout = async <T,>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`${label} timed out after ${ms}ms`);
      resolve(fallback);
    }, ms);
  });

  const result = await Promise.race([promise, timeout]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
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

const signatureOf = (i: PortfolioItem): string =>
  i.imageUrl || i.url || String(i.id);

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

/**
 * At most `max` works by any one maker per room. Archives sometimes
 * return a whole print portfolio in one page (eight plates of the same
 * cycle), which turns a varied wall into one artist's slideshow.
 * Unattributed works are exempt — the cap is about repetition of a
 * hand, not about anonymity.
 */
const capPerMaker = (items: PortfolioItem[], max = 2): PortfolioItem[] => {
  const byMaker = new Map<string, number>();
  const out: PortfolioItem[] = [];
  for (const item of items) {
    const maker = extractArtistName(item)?.toLowerCase().trim();
    if (!maker) {
      out.push(item);
      continue;
    }
    const n = byMaker.get(maker) ?? 0;
    if (n >= max) continue;
    byMaker.set(maker, n + 1);
    out.push(item);
  }
  return out;
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

  useEffect(() => {
    let cancelled = false;
    // Abort in-flight archive fetches when the effect re-runs (rapid
    // refresh, source switch) or unmounts — StrictMode's dev double-mount
    // was silently running the whole fetch storm twice.
    const controller = new AbortController();

    /** Drop items the user has already been served this session, AND
     *  add the kept items' signatures to the seen-set so a follow-up
     *  fetch in the same load (the "second pass") won't return them. */
    const filterAndMarkUnseen = (items: PortfolioItem[]): PortfolioItem[] => {
      const out: PortfolioItem[] = [];
      for (const item of items) {
        const sig = signatureOf(item);
        if (seenSignaturesRef.current.has(sig)) continue;
        seenSignaturesRef.current.add(sig);
        out.push(item);
      }
      return out;
    };

    const loadHandful = async () => {
      setItems([]);
      setLoading(true);
      setError(null);

      try {
        let raw: PortfolioItem[];
        // Everything fetched this load, pre seen-filter. If the session
        // has already seen every fetchable work, repeats beat an empty
        // room — this pool is the fallback.
        let fallbackPool: PortfolioItem[] = [];

        /** Fetch every archive in a lens in parallel and interleave the
         *  pages so no single archive dominates the room. Each member's
         *  count scales by its lensWeight, and registry order leads the
         *  interleave — Cooper Hewitt carries Design. */
        const fetchLensGroup = async (
          lens: 'design' | 'art' | 'photo',
          perMember: number,
        ): Promise<PortfolioItem[]> => {
          const members = collections.filter((c) => c.lens === lens);
          const pages = await Promise.all(
            members.map((c) =>
              withTimeout(
                c.fetchItems(
                  Math.max(2, Math.round(perMember * (c.lensWeight ?? 1))),
                  controller.signal,
                ),
                SOURCE_TIMEOUT_MS,
                [] as PortfolioItem[],
                c.name,
              ).catch((err) => {
                if (!isAbortError(err)) console.warn(`${c.name} failed:`, err);
                return [] as PortfolioItem[];
              }),
            ),
          );
          return interleave(pages);
        };

        if (sourceMode === 'mixed') {
          console.log(`Loading mixed room (${HANDFUL}) from ${collections.length} archives`);

          // Design keeps reserved presence (the thesis: design archives
          // are central) — drawn from the whole design lens, so Cooper
          // Hewitt leads and the V&A and Bauhaus threads deepen it.
          const supportingPromise = Promise.all(
            collections
              .filter((c) => c.lens !== 'design')
              .map(async (c) => {
                try {
                  return await c.fetchItems(PER_SUPPORTING_SOURCE, controller.signal);
                } catch (err) {
                  if (!isAbortError(err)) console.warn(`${c.name} failed:`, err);
                  return [] as PortfolioItem[];
                }
              }),
          );

          const [designItems, supportingItems] = await Promise.all([
            fetchLensGroup('design', DESIGN_RESERVED),
            supportingPromise,
          ]);

          const supportingPool = interleave(supportingItems);
          fallbackPool = interleave([designItems, supportingPool]);

          const freshDesign = capPerMaker(filterAndMarkUnseen(designItems)).slice(0, DESIGN_RESERVED);
          const freshSupporting = capPerMaker(filterAndMarkUnseen(supportingPool)).slice(
            0,
            HANDFUL - freshDesign.length,
          );

          raw = interleave([freshDesign, freshSupporting]).slice(0, HANDFUL);
        } else {
          const members = collections.filter((c) => c.lens === sourceMode);
          if (members.length === 0) throw new Error(`Unknown lens: ${sourceMode}`);
          console.log(
            `Loading ${HANDFUL} from the ${sourceMode} lens (${members.length} ${members.length === 1 ? 'archive' : 'archives'})`,
          );
          const perMember = Math.ceil(HANDFUL / members.length) + 4;
          fallbackPool = await fetchLensGroup(sourceMode, perMember);
          raw = capPerMaker(filterAndMarkUnseen(fallbackPool)).slice(0, HANDFUL);
        }

        // If APIs return stale or sparse data, kick a second pass. This
        // keeps the wall finite while avoiding a half-empty first room.
        if (!cancelled && raw.length > 0 && raw.length < HANDFUL * 0.7) {
          console.log(`Only ${raw.length} unseen works; fetching a second pass`);
          const second = sourceMode === 'mixed'
            ? interleave(
                await Promise.all(
                  collections.map((c) =>
                    c.fetchItems(PER_SUPPORTING_SOURCE, controller.signal).catch(() => [] as PortfolioItem[]),
                  ),
                ),
              )
            : await fetchLensGroup(sourceMode, HANDFUL);
          fallbackPool = [...fallbackPool, ...second];
          const moreUnseen = capPerMaker(filterAndMarkUnseen(second));
          raw = [...raw, ...moreUnseen].slice(0, HANDFUL);
        }

        // Session has seen everything the archives returned: hang
        // repeats rather than an error. Tomorrow starts clean anyway.
        if (raw.length === 0 && fallbackPool.length > 0) {
          console.log('All fetched works already seen this session; hanging repeats');
          raw = capPerMaker(fallbackPool).slice(0, HANDFUL);
        }

        if (cancelled) return;

        if (raw.length === 0) {
          throw new Error('No items returned. Try refreshing.');
        }

        const placed = layoutCentered(raw);
        rememberSeen(placed);
        console.log(`Loaded ${placed.length} items (${sourceMode}, seen=${seenSignaturesRef.current.size})`);
        setItems(placed);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load room:', err);
        setError(err instanceof Error ? err.message : 'Couldn’t load the archives.');
        setLoading(false);
      }
    };

    if (activeFilter.mode === 'collection') {
      loadHandful();
    }

    return () => {
      cancelled = true;
      controller.abort();
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
    console.log(`Following the thread: ${tagLabel} (category=${category || 'unspecified'})`);

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
      const perSourceForSearch = category === 'maker'
        ? PER_SUPPORTING_SOURCE * 3
        : PER_SUPPORTING_SOURCE;
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
        console.log(`Maker filter kept ${mixed.length} of the matched items`);
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
      console.log(`Found ${placed.length} items for "${tagLabel}"`);
    } catch (err) {
      console.error('Tag search failed:', err);
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
