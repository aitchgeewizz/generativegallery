import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import { PortfolioItem } from '../types';
import { extractTags, extractArtistName } from '../utils/tagExtractor';
import { useEnrichment } from '../hooks/useEnrichment';

/** Strip HTML tags from museum API text */
const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

interface ArtworkDetailProps {
  item: PortfolioItem | null;
  allItems: PortfolioItem[];
  onClose: () => void;
  onSelectItem: (item: PortfolioItem) => void;
  onTagClick?: (tagLabel: string, category?: string) => void;
}

/** Width of the right-side info panel (px). The image stage occupies
 *  the rest of the viewport, minus the left thumbnail rail. */
const PANEL_W = 420;

/**
 * Full-screen artwork detail view — right-side panel layout.
 *
 * Per Hannah's feedback (Pass 2): the previous bottom-drawer pattern
 * blocked the image and made you click "Details" to see anything. This
 * layout keeps the image visible and responsive, with all the key info
 * (maker, title, source, short description, tags) sitting in a fixed
 * right panel where you don't have to ask for it.
 *
 * Deep-dive enrichment (Wikipedia, related works) stays in collapsible
 * sections within the panel — that content is genuinely optional, and
 * not surfacing it by default keeps the panel calm.
 */
export const ArtworkDetail = ({
  item,
  allItems,
  onClose,
  onSelectItem,
  onTagClick,
}: ArtworkDetailProps) => {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [direction, setDirection] = useState(0);
  const [mainImageError, setMainImageError] = useState(false);
  // Full-size stage image: starts at imageUrl, steps down to fallbackUrl
  // on error, then to the text card. While it loads, the tile-size
  // thumbnail (already in the browser cache from the wall) shows
  // blurred underneath — the blur-up keeps the stage from going blank.
  const [stageSrc, setStageSrc] = useState(item?.imageUrl);
  const [stageLoaded, setStageLoaded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // Hide the right panel for an image-only "full view". On desktop:
  // toggled by an icon or F key. On mobile: toggled by tapping the
  // image so visitors can swipe through pieces uninterrupted.
  const [panelHidden, setPanelHidden] = useState(false);
  const currentThumbRef = useRef<HTMLButtonElement>(null);
  // Mobile touch-swipe tracking for prev/next navigation.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchMoved = useRef(false);

  // Layout breakpoint — below md (768px) we stack image-over-panel
  // instead of the desktop rail+image+panel three-column.
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 767px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Derived
  const tags = item ? extractTags(item) : [];
  const artistName = item ? extractArtistName(item) : null;
  const enrichment = useEnrichment(item);

  const navigationItems = allItems;
  const currentIndex = item ? navigationItems.findIndex((i) => i.id === item.id) : -1;

  // Reset image state when item changes
  useEffect(() => {
    setMainImageError(false);
    setStageSrc(item?.imageUrl);
    setStageLoaded(false);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setExpandedSections(new Set());
    if (item) enrichment.reset();
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll current thumbnail into view
  useEffect(() => {
    currentThumbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [item?.id]);

  // Preload adjacent images
  useEffect(() => {
    if (!item || navigationItems.length < 2) return;
    const idx = currentIndex;
    const prevIdx = (idx - 1 + navigationItems.length) % navigationItems.length;
    const nextIdx = (idx + 1) % navigationItems.length;
    [prevIdx, nextIdx].forEach((i) => {
      const url = navigationItems[i]?.imageUrl;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [item?.id, navigationItems, currentIndex]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      if (!item || navigationItems.length < 2) return;
      setDirection(dir);
      const idx = currentIndex;
      const newIdx = (idx + dir + navigationItems.length) % navigationItems.length;
      onSelectItem(navigationItems[newIdx]);
    },
    [item, navigationItems, currentIndex, onSelectItem],
  );

  // Keyboard nav: arrows step through, Escape closes (or resets zoom first),
  // F toggles the right panel for an image-only "full view".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!item) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigate(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setPanelHidden((h) => !h);
      } else if (e.key === 'Escape') {
        if (zoom > 1) {
          setZoom(1);
          setPanOffset({ x: 0, y: 0 });
        } else if (panelHidden) {
          setPanelHidden(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, navigate, onClose, zoom, panelHidden]);

  // Zoom with scroll wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.stopPropagation();
      const newZoom = Math.max(1, Math.min(4, zoom - e.deltaY * 0.002));
      setZoom(newZoom);
      if (newZoom <= 1) setPanOffset({ x: 0, y: 0 });
    },
    [zoom],
  );

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  }, [zoom]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
        if (section === 'artist') enrichment.loadArtistInfo();
        if (section === 'artwork') enrichment.loadArtworkContext();
        if (section === 'related') enrichment.loadRelatedWorks();
      }
      return next;
    });
  };

  // Passing the tag's category lets App.tsx route the search correctly —
  // most importantly, maker-tag results get post-filtered to items where
  // the named maker is actually credited (the museum APIs' broad text
  // search isn't strict enough for proper-noun lookups).
  const handleSearchAllCollections = (tagLabel: string, category?: string) => {
    if (onTagClick) {
      onClose();
      onTagClick(tagLabel, category);
    }
  };

  // Download for public-domain items
  const handleDownload = useCallback(async () => {
    if (!item?.imageUrl) return;
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.imageUrl, '_blank');
    }
  }, [item?.imageUrl, item?.title]);

  const canDownload =
    item?.copyrightStatus === 'public_domain' || item?.copyrightStatus === 'no_known_copyright';

  if (!item) return null;

  // Short body text for the always-visible blurb
  const rawShortText = item.galleryText || item.shortDescription || item.labelText;
  const shortText = rawShortText ? stripHtml(rawShortText) : null;

  const creativeParticipants =
    item.participants?.filter((p) => {
      const role = p.role?.toLowerCase() || '';
      return (
        !role.includes('donated') &&
        !role.includes('donor') &&
        !role.includes('previously owned') &&
        !role.includes('owned by')
      );
    }) || [];

  const copyrightText =
    item.copyrightStatus === 'public_domain'
      ? 'Public Domain. Free to use.'
      : item.copyrightStatus === 'no_known_copyright'
        ? 'No known copyright restrictions'
        : 'Copyright status unknown';

  return (
    // No outer AnimatePresence here — the parent (InfiniteCanvas)
    // wraps us so the close animation fires when selectedItem goes
    // to null. We slow the exit slightly and add a small scale so
    // the close has weight.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed inset-0 z-50 gallery-grain"
      style={{ background: 'var(--bg)' }}
    >
        {/* Image Stage. On desktop (>=md): between left rail (~60px)
            and right panel (PANEL_W). On mobile: full width on top
            (or fullscreen when panelHidden), with the info panel
            taking the bottom portion otherwise.

            Mobile interactions:
              - swipe left/right on the image stage → next/prev artwork
              - tap the image itself → toggle fullscreen (hide panel)
              - tap the background → close the detail view */}
        <div
          className="absolute flex items-center justify-center transition-[right,bottom,top] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={
            isMobile
              ? panelHidden
                ? { top: 0, left: 0, right: 0, bottom: 0 }
                : { top: 0, left: 0, right: 0, bottom: '55vh' }
              : { top: 0, left: 56, bottom: 0, right: panelHidden ? 0 : PANEL_W }
          }
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          onTouchStart={(e) => {
            if (!isMobile || e.touches.length !== 1) return;
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
            touchMoved.current = false;
          }}
          onTouchMove={(e) => {
            if (!isMobile || touchStartX.current === null) return;
            const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
            const dy = Math.abs(e.touches[0].clientY - (touchStartY.current ?? 0));
            // Any move past a small threshold counts as a drag, not a tap.
            if (dx > 8 || dy > 8) touchMoved.current = true;
          }}
          onTouchEnd={(e) => {
            if (!isMobile || touchStartX.current === null) return;
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const dx = endX - touchStartX.current;
            const dy = endY - (touchStartY.current ?? 0);
            touchStartX.current = null;
            touchStartY.current = null;

            // Horizontal swipe (mostly horizontal, not vertical, and
            // beyond a reasonable threshold) navigates prev/next.
            const SWIPE_THRESHOLD = 50;
            if (
              Math.abs(dx) > SWIPE_THRESHOLD &&
              Math.abs(dx) > Math.abs(dy) * 1.5
            ) {
              navigate(dx < 0 ? 1 : -1);
              touchMoved.current = true; // suppress the tap handler below
            }
          }}
        >
          <AnimatePresence mode="wait">
            {item.imageUrl && !mainImageError ? (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                onClick={(e) => {
                  // Mobile: a clean tap on the image (not a swipe)
                  // toggles fullscreen so visitors can swipe through
                  // pieces uninterrupted. Desktop: do nothing here,
                  // the expand button at top-right does the same job.
                  if (isMobile && !touchMoved.current) {
                    e.stopPropagation();
                    setPanelHidden((h) => !h);
                  }
                }}
                className="relative max-w-full max-h-full p-3 md:p-0"
                style={{
                  transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center center',
                  cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
                }}
                onPointerDown={(e) => {
                  if (zoom > 1) {
                    setIsPanning(true);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }
                }}
                onPointerMove={(e) => {
                  if (isPanning && zoom > 1) {
                    setPanOffset((prev) => ({
                      x: prev.x + e.movementX / zoom,
                      y: prev.y + e.movementY / zoom,
                    }));
                  }
                }}
                onPointerUp={() => setIsPanning(false)}
              >
                {/* The tile-size thumbnail is the in-flow sizer: it is
                    already cached from the wall, so the stage takes the
                    work's true aspect immediately. Blurred until the
                    full image lands on top of it. */}
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    aria-hidden
                    className="max-w-full max-h-full object-contain select-none"
                    style={{
                      filter: stageLoaded ? 'none' : 'blur(14px)',
                      opacity: stageLoaded ? 0 : 1,
                      transition: 'opacity 0.35s ease',
                    }}
                    draggable={false}
                  />
                ) : null}
                <img
                  src={stageSrc}
                  alt={item.title}
                  className={
                    item.thumbnailUrl
                      ? 'absolute inset-3 md:inset-0 w-auto h-auto max-w-full max-h-full m-auto object-contain select-none'
                      : 'max-w-full max-h-full object-contain select-none'
                  }
                  style={{
                    opacity: stageLoaded || !item.thumbnailUrl ? 1 : 0,
                    transition: 'opacity 0.35s ease',
                  }}
                  onLoad={() => setStageLoaded(true)}
                  onError={() => {
                    // Step down: full detail size → blessed fallback → text card
                    if (item.fallbackUrl && stageSrc !== item.fallbackUrl) {
                      setStageSrc(item.fallbackUrl);
                    } else if (stageSrc !== item.imageUrl && item.imageUrl) {
                      setStageSrc(item.imageUrl);
                    } else {
                      setMainImageError(true);
                    }
                  }}
                  draggable={false}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`${item.id}-fallback`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-72 h-72 rounded-lg flex flex-col items-center justify-center p-8 text-center"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <h2 className="text-xl font-display leading-tight mb-3" style={{ color: 'var(--text-2)' }}>
                  {item.title}
                </h2>
                {item.description && (
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>{item.description}</p>
                )}
                <p className="text-xs mt-6" style={{ color: 'var(--text-4)' }}>Image unavailable</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Zoom indicator — top of image area, only when zoomed.
            Centered above the IMAGE STAGE (which on desktop is offset
            by the panel; on mobile it's the full width). */}
        {zoom > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-6 text-xs font-display tracking-wide z-20 pointer-events-none"
            style={{
              left: isMobile || panelHidden ? '50%' : `calc(50% - ${PANEL_W / 2}px)`,
              transform: 'translateX(-50%)',
              color: 'var(--text-4)',
            }}
          >
            {Math.round(zoom * 100)}% · scroll to zoom, double-click to reset
          </motion.div>
        )}

        {/* Expand-image toggle (desktop only — on mobile the panel
            is already below the image, so toggling adds no value). */}
        <motion.button
          onClick={() => setPanelHidden((h) => !h)}
          aria-label={panelHidden ? 'Show details panel' : 'View image only'}
          title={panelHidden ? 'Show details (F)' : 'View image only (F)'}
          className="hidden md:flex absolute top-5 z-[45] w-9 h-9 items-center justify-center rounded-full transition-colors"
          style={{ background: 'var(--surface)', color: 'var(--text-2)' }}
          animate={{ right: panelHidden ? 20 : PANEL_W + 16 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {panelHidden ? (
            // contract icon — bring panel back
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 4v6h6V4M9 20v-6h6v6M3 9h6M3 15h6M15 9h6M15 15h6" />
            </svg>
          ) : (
            // expand icon — image-only mode
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6" />
            </svg>
          )}
        </motion.button>

        {/* Position indicator — only when panel hidden, sits at bottom
            of the image stage so the viewer always knows where they
            are in the handful. */}
        {panelHidden && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 text-xs font-display tabular-nums tracking-[0.18em] uppercase pointer-events-none"
            style={{ color: 'var(--text-3)' }}
          >
            {currentIndex >= 0 ? currentIndex + 1 : '?'} / {navigationItems.length}
          </motion.div>
        )}

        {/* ── Left thumbnail rail (desktop only) ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="hidden md:flex absolute left-0 top-0 bottom-0 w-14 md:w-16 z-40 flex-col items-center pt-4 pb-4"
          style={{
            background:
              'linear-gradient(to right, var(--bg) 0%, var(--bg) 50%, transparent 100%)',
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors shrink-0 mb-4"
            style={{ background: 'var(--surface)', color: 'var(--text-2)' }}
            aria-label="Close detail view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Up arrow */}
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full transition-colors shrink-0 mb-1"
            style={{ color: 'var(--text-3)' }}
            aria-label="Previous artwork"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>

          {/* Thumbnails */}
          <div
            className="flex-1 flex flex-col items-center gap-2 overflow-y-auto py-1 min-h-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {navigationItems.map((navItem, idx) => {
              const isCurrent = navItem.id === item.id;
              const distance = Math.min(
                Math.abs(idx - currentIndex),
                navigationItems.length - Math.abs(idx - currentIndex),
              );
              if (distance > 6) return null;

              return (
                <button
                  key={navItem.id}
                  ref={isCurrent ? currentThumbRef : undefined}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    onSelectItem(navItem);
                  }}
                  className={`shrink-0 rounded-md overflow-hidden transition-all duration-200 ${
                    isCurrent
                      ? 'w-10 h-10 md:w-11 md:h-11 opacity-100'
                      : 'w-8 h-8 md:w-9 md:h-9 opacity-45 hover:opacity-90 hover:scale-110'
                  }`}
                  style={isCurrent ? { boxShadow: '0 0 0 2px var(--text)' } : undefined}
                >
                  {navItem.imageUrl || navItem.thumbnailUrl ? (
                    <img
                      src={navItem.thumbnailUrl || navItem.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: 'var(--surface)' }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Down arrow */}
          <button
            onClick={() => navigate(1)}
            className="p-1 rounded-full transition-colors shrink-0 mt-1"
            style={{ color: 'var(--text-3)' }}
            aria-label="Next artwork"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Counter */}
          <span
            className="text-[10px] font-display tabular-nums tracking-wide mt-2 shrink-0"
            style={{ color: 'var(--text-3)' }}
          >
            {currentIndex >= 0 ? currentIndex + 1 : '?'}/{navigationItems.length}
          </span>
        </motion.div>

        {/* ── Info panel ──
            Desktop: right-side panel (420px), slides out on F.
            Mobile: bottom drawer (55vh), always visible (no toggle). */}
        <motion.aside
          initial={isMobile ? { opacity: 0, y: 24 } : { opacity: 0, x: 24 }}
          animate={
            isMobile
              ? { opacity: 1, y: 0 }
              : { opacity: panelHidden ? 0 : 1, x: panelHidden ? PANEL_W : 0 }
          }
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute z-30 flex flex-col backdrop-blur-md"
          style={
            isMobile
              ? {
                  left: 0,
                  right: 0,
                  bottom: 0,
                  top: '45vh',
                  background: 'var(--bg)',
                  borderTop: '1px solid var(--border)',
                  pointerEvents: 'auto',
                }
              : {
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: PANEL_W,
                  background: 'var(--bg)',
                  borderLeft: '1px solid var(--border)',
                  pointerEvents: panelHidden ? 'none' : 'auto',
                }
          }
        >
          {/* Explicit close X — top-right corner of the panel. */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 z-10 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>

          {/* Scrollable inner content */}
          <div className="flex-1 overflow-y-auto drawer-scroll px-8 py-12">
            {/* Wall label — always visible */}
            <header>
              {/* Maker — clickable thread. Routed as 'maker' so App.tsx
                  filters results to items where this maker is actually
                  credited. */}
              {artistName && (
                <button
                  onClick={() => handleSearchAllCollections(artistName, 'maker')}
                  className="text-xs font-display tracking-[0.18em] uppercase transition-colors block text-left underline-offset-4 hover:underline mb-3"
                  style={{ color: 'var(--text-2)' }}
                >
                  {artistName}
                </button>
              )}

              {/* Title — roman, not italic (Hannah's call) */}
              <h1 className="text-3xl font-display leading-tight" style={{ color: 'var(--text)' }}>
                {item.title}
              </h1>

              {/* Medium / one-line metadata */}
              {item.medium && (
                <p className="text-sm mt-3 font-display" style={{ color: 'var(--text-2)' }}>{item.medium}</p>
              )}

              {/* Collection source */}
              {item.collectionSource && (
                <p
                  className="text-[11px] tracking-[0.18em] uppercase font-display mt-5"
                  style={{ color: 'var(--text-3)' }}
                >
                  {item.collectionSource}
                </p>
              )}
            </header>

            {/* Short description */}
            {shortText && (
              <p
                className="mt-6 text-sm leading-relaxed font-display"
                style={{ color: 'var(--text-2)' }}
              >
                {shortText}
              </p>
            )}

            {/* Tags — "follow a thread" (grayscale only, Displaay-style) */}
            {tags.length > 0 && (
              <div className="mt-7">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-display mb-3"
                  style={{ color: 'var(--text-3)' }}
                >
                  Follow a thread
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearchAllCollections(tag.label, tag.category)}
                      className="px-3 py-1.5 rounded-full text-xs font-display tracking-wide transition-colors"
                      style={{
                        color: 'var(--text-2)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="h-px my-8" style={{ background: 'var(--border)' }} />

            {/* ── Enrichment sections (on-demand) ── */}
            <div className="space-y-1">
              {/* About the Artist */}
              {artistName && (
                <ExpandableSection
                  title="About the Artist"
                  open={expandedSections.has('artist')}
                  onToggle={() => toggleSection('artist')}
                >
                  {enrichment.artistLoading && <SkeletonText lines={4} />}
                  {enrichment.artistFetched && !enrichment.artistInfo && !enrichment.artistLoading && (
                    <NoEnrichment query={`${artistName} artist`} label="Search the web" />
                  )}
                  {enrichment.artistInfo && (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        {enrichment.artistInfo.thumbnailUrl && (
                          <img
                            src={enrichment.artistInfo.thumbnailUrl}
                            alt={artistName}
                            className="w-14 h-14 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-display" style={{ color: 'var(--text)' }}>{artistName}</p>
                          {(enrichment.artistInfo.born || enrichment.artistInfo.died) && (
                            <p className="text-xs mt-0.5 font-display" style={{ color: 'var(--text-2)' }}>
                              {enrichment.artistInfo.born && enrichment.artistInfo.died
                                ? `Born ${enrichment.artistInfo.born}, died ${enrichment.artistInfo.died}`
                                : enrichment.artistInfo.born
                                  ? `Born ${enrichment.artistInfo.born}`
                                  : `Died ${enrichment.artistInfo.died}`}
                            </p>
                          )}
                          {enrichment.artistInfo.nationality && (
                            <p className="text-xs mt-0.5 font-display" style={{ color: 'var(--text-2)' }}>
                              {enrichment.artistInfo.nationality}
                            </p>
                          )}
                        </div>
                      </div>
                      {enrichment.artistInfo.summary && (
                        <p className="text-sm leading-relaxed font-display" style={{ color: 'var(--text-2)' }}>
                          {enrichment.artistInfo.summary}
                        </p>
                      )}
                      {enrichment.artistInfo.wikiUrl && (
                        <ExternalLink href={enrichment.artistInfo.wikiUrl}>
                          Read more on Wikipedia
                        </ExternalLink>
                      )}
                    </div>
                  )}
                </ExpandableSection>
              )}

              {/* About This Work */}
              <ExpandableSection
                title="About This Work"
                open={expandedSections.has('artwork')}
                onToggle={() => toggleSection('artwork')}
              >
                {enrichment.artworkLoading && <SkeletonText lines={3} />}
                {enrichment.artworkFetched && !enrichment.artworkContext && !enrichment.artworkLoading && (
                  <NoEnrichment
                    query={`${artistName ? artistName + ' ' : ''}${item.title} artwork`}
                    label="Search the web"
                  />
                )}
                {enrichment.artworkContext && (
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed font-display" style={{ color: 'var(--text-2)' }}>
                      {enrichment.artworkContext.summary}
                    </p>
                    {enrichment.artworkContext.wikiUrl && (
                      <ExternalLink href={enrichment.artworkContext.wikiUrl}>
                        Read more on Wikipedia
                      </ExternalLink>
                    )}
                  </div>
                )}
              </ExpandableSection>

              {/* More by Artist */}
              {artistName && (
                <ExpandableSection
                  title={`More by ${artistName.split(' ').slice(-1)[0]}`}
                  open={expandedSections.has('related')}
                  onToggle={() => toggleSection('related')}
                >
                  {enrichment.relatedLoading && (
                    <div className="flex gap-3 animate-pulse">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-28 shrink-0">
                          <div className="w-28 h-28 rounded-md" style={{ background: 'var(--surface)' }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {enrichment.relatedFetched && enrichment.relatedWorks.length === 0 && !enrichment.relatedLoading && (
                    <p className="text-sm font-display italic" style={{ color: 'var(--text-3)' }}>
                      No other works found in museum collections.
                    </p>
                  )}
                  {enrichment.relatedWorks.length > 0 && (
                    <div
                      className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      {enrichment.relatedWorks.map((work, i) => (
                        <a
                          key={i}
                          href={work.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-28 shrink-0 group/card"
                        >
                          <div className="w-28 h-28 rounded-md overflow-hidden" style={{ background: 'var(--surface)' }}>
                            <img
                              src={work.imageUrl}
                              alt={work.title}
                              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <p
                            className="text-xs mt-2 line-clamp-2 leading-snug font-display transition-colors"
                            style={{ color: 'var(--text)' }}
                          >
                            {work.title}
                          </p>
                          {work.date && (
                            <p
                              className="text-[11px] mt-0.5 font-display"
                              style={{ color: 'var(--text-3)' }}
                            >
                              {work.date}
                            </p>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </ExpandableSection>
              )}

              {/* Full metadata — collapsed by default since the basics are above */}
              <ExpandableSection
                title="Details"
                open={expandedSections.has('details')}
                onToggle={() => toggleSection('details')}
              >
                <div className="space-y-5 text-sm">
                  {creativeParticipants.length > 1 && (
                    <Field label={creativeParticipants.length === 1 ? 'Creator' : 'People'}>
                      <div className="space-y-1.5">
                        {creativeParticipants.map((p, i) => (
                          <div key={i}>
                            <span style={{ color: 'var(--text-3)' }}>{p.role}: </span>
                            <span style={{ color: 'var(--text) ' }}>{p.name}</span>
                            {p.date && (
                              <span className="text-xs ml-1" style={{ color: 'var(--text-3)' }}>({p.date})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </Field>
                  )}
                  {item.objectType && <Field label="Object Type">{item.objectType}</Field>}
                  {item.dimensions && <Field label="Dimensions">{item.dimensions}</Field>}
                  {item.markings && item.markings !== 'null' && (
                    <Field label="Markings">{item.markings}</Field>
                  )}
                  {item.signed && item.signed !== 'null' && (
                    <Field label="Signed">{item.signed}</Field>
                  )}
                  {item.inscribed && item.inscribed !== 'null' && (
                    <Field label="Inscribed">{item.inscribed}</Field>
                  )}
                  {item.creditLine && <Field label="Credit">{item.creditLine}</Field>}
                </div>
              </ExpandableSection>
            </div>

            {/* Bottom links: copyright + view original + download */}
            <div className="mt-10 pt-6 text-xs font-display" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="mb-3" style={{ color: 'var(--text-3)' }}>{copyrightText}</p>
              <div className="flex items-center gap-5">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors underline-offset-4 hover:underline text-sm"
                    style={{ color: 'var(--text)' }}
                  >
                    View at source
                  </a>
                )}
                {canDownload && (
                  <button
                    onClick={handleDownload}
                    className="transition-colors underline-offset-4 hover:underline text-sm"
                    style={{ color: 'var(--text)' }}
                  >
                    Download image
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.aside>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────

const ExpandableSection = ({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3.5 text-left group"
    >
      <span
        className="text-[11px] uppercase tracking-[0.18em] font-display transition-colors"
        style={{ color: 'var(--text-2)' }}
      >
        {title}
      </span>
      <motion.svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="transition-colors"
        style={{ color: 'var(--text-3)' }}
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <path d="M6 9l6 6 6-6" />
      </motion.svg>
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pb-5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p
      className="text-[10px] uppercase tracking-[0.18em] font-display mb-1"
      style={{ color: 'var(--text-3)' }}
    >
      {label}
    </p>
    <p className="font-display" style={{ color: 'var(--text)' }}>{children}</p>
  </div>
);

const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className="h-3 rounded"
        style={{ width: `${100 - (i % 3) * 12}%`, background: 'var(--surface)' }}
      />
    ))}
  </div>
);

const NoEnrichment = ({ query, label }: { query: string; label: string }) => (
  <div className="space-y-3">
    <p className="text-sm font-display italic" style={{ color: 'var(--text-3)' }}>
      No additional information available.
    </p>
    <a
      href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs transition-colors"
      style={{ color: 'var(--text-2)' }}
    >
      {label}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 17L17 7M17 7H7M17 7V17" />
      </svg>
    </a>
  </div>
);

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-xs transition-colors underline-offset-4 hover:underline"
    style={{ color: 'var(--text-2)' }}
  >
    {children}
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17L17 7M17 7H7M17 7V17" />
    </svg>
  </a>
);
