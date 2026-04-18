import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import { PortfolioItem } from '../types';
import { extractTags, extractArtistName } from '../utils/tagExtractor';
import { useEnrichment } from '../hooks/useEnrichment';

/** Strip HTML tags from museum API text */
const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

interface ArtworkDetailProps {
  item: PortfolioItem | null;
  allItems: PortfolioItem[];
  onClose: () => void;
  onSelectItem: (item: PortfolioItem) => void;
  onTagClick?: (tagLabel: string) => void;
}

type DrawerState = 'closed' | 'peeked' | 'full';

/**
 * Cinematic full-screen artwork detail view
 * Wall label is part of the drawer — always visible, drag up to reveal details
 * Inspired by the museum gallery experience — minimal by default, detailed on demand
 */
export const ArtworkDetail = ({ item, allItems, onClose, onSelectItem, onTagClick }: ArtworkDetailProps) => {
  const [drawerState, setDrawerState] = useState<DrawerState>('closed');
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [direction, setDirection] = useState(0);
  const [mainImageError, setMainImageError] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const drawerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const currentThumbRef = useRef<HTMLButtonElement>(null);
  const dragControls = useDragControls();

  // Extract tags and artist from current item
  const tags = item ? extractTags(item) : [];
  const artistName = item ? extractArtistName(item) : null;

  // Enrichment data (on-demand fetching)
  const enrichment = useEnrichment(item);

  // Filter items by active tag if set
  const navigationItems = tagFilter
    ? allItems.filter(i => extractTags(i).some(t => t.label === tagFilter))
    : allItems;

  const currentIndex = item ? navigationItems.findIndex(i => i.id === item.id) : -1;

  // Reset state when item changes
  useEffect(() => {
    setMainImageError(false);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [item?.id]);

  // Reset drawer and enrichment when item changes
  useEffect(() => {
    if (item) {
      setDrawerState('closed');
      setExpandedSections(new Set());
      enrichment.reset();
    }
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
    [prevIdx, nextIdx].forEach(i => {
      const url = navigationItems[i]?.imageUrl;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [item?.id, navigationItems, currentIndex]);

  const navigate = useCallback((dir: 1 | -1) => {
    if (!item || navigationItems.length < 2) return;
    setDirection(dir);
    const idx = currentIndex;
    const newIdx = (idx + dir + navigationItems.length) % navigationItems.length;
    onSelectItem(navigationItems[newIdx]);
  }, [item, navigationItems, currentIndex, onSelectItem]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigate(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === 'Escape') {
        if (drawerState !== 'closed') {
          setDrawerState('closed');
        } else if (zoom > 1) {
          setZoom(1);
          setPanOffset({ x: 0, y: 0 });
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, navigate, onClose, drawerState, zoom]);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (drawerState !== 'closed') return;
    e.stopPropagation();
    const newZoom = Math.max(1, Math.min(4, zoom - e.deltaY * 0.002));
    setZoom(newZoom);
    if (newZoom <= 1) setPanOffset({ x: 0, y: 0 });
  }, [zoom, drawerState]);

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (drawerState !== 'closed') return;
    if (zoom > 1) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  }, [zoom, drawerState]);

  // Drawer drag handling
  const handleDrawerDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 300 || offset > 100) {
      // Swiped down — close one level
      if (drawerState === 'full') setDrawerState('peeked');
      else setDrawerState('closed');
    } else if (velocity < -300 || offset < -100) {
      // Swiped up — open one level
      if (drawerState === 'closed') setDrawerState('peeked');
      else if (drawerState === 'peeked') setDrawerState('full');
    }
  };

  const cycleDrawer = () => {
    if (drawerState === 'closed') setDrawerState('peeked');
    else if (drawerState === 'peeked') setDrawerState('full');
    else setDrawerState('closed');
  };

  const handleTagClickInDrawer = (tagLabel: string) => {
    // Filter navigation within the detail view
    if (tagFilter === tagLabel) {
      setTagFilter(null); // Toggle off
    } else {
      setTagFilter(tagLabel);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
        // Trigger fetch on first expand
        if (section === 'artist') enrichment.loadArtistInfo();
        if (section === 'artwork') enrichment.loadArtworkContext();
        if (section === 'related') enrichment.loadRelatedWorks();
      }
      return next;
    });
  };

  const handleSearchAllCollections = (tagLabel: string) => {
    if (onTagClick) {
      onClose();
      onTagClick(tagLabel);
    }
  };

  // Download handler for public domain images
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
      // CORS fallback — open image in new tab
      window.open(item.imageUrl, '_blank');
    }
  }, [item?.imageUrl, item?.title]);

  const canDownload = item?.copyrightStatus === 'public_domain' || item?.copyrightStatus === 'no_known_copyright';

  if (!item) return null;

  // Get short text for the peeked drawer state
  const rawShortText = item.galleryText || item.shortDescription || item.labelText;
  const shortText = rawShortText ? stripHtml(rawShortText) : null;

  // Drawer Y positions — closed shows wall label at bottom (~200px visible)
  const drawerVariants = {
    closed: { y: 'calc(100% - 200px)' },
    peeked: { y: '55%' },
    full: { y: '8%' },
  };

  // Participant filtering (same as before — creative roles only)
  const creativeParticipants = item.participants?.filter(p => {
    const role = p.role?.toLowerCase() || '';
    return !role.includes('donated') && !role.includes('donor') &&
           !role.includes('previously owned') && !role.includes('owned by');
  }) || [];

  // Copyright status text
  const copyrightText = item.copyrightStatus === 'public_domain'
    ? 'Public Domain — Free to use'
    : item.copyrightStatus === 'no_known_copyright'
      ? 'No known copyright restrictions'
      : 'Copyright status unknown';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black z-50 gallery-grain"
      >
        {/* Spotlight glow from artwork color */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${item.color}0A 0%, transparent 65%)`,
          }}
        />

        {/* Image Stage — offset right to clear thumbnail rail */}
        <div
          ref={imageContainerRef}
          className="absolute top-0 right-0 bottom-0 left-14 md:left-16 flex items-center justify-center"
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
        >
          <AnimatePresence mode="wait">
            {item.imageUrl && !mainImageError ? (
              <motion.img
                key={item.id}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                src={item.imageUrl}
                alt={item.title}
                className="max-w-[85vw] max-h-[85vh] object-contain select-none"
                style={{
                  transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center center',
                }}
                onError={() => setMainImageError(true)}
                draggable={false}
                onPointerDown={(e) => {
                  if (zoom > 1) {
                    setIsPanning(true);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }
                }}
                onPointerMove={(e) => {
                  if (isPanning && zoom > 1) {
                    setPanOffset(prev => ({
                      x: prev.x + e.movementX / zoom,
                      y: prev.y + e.movementY / zoom,
                    }));
                  }
                }}
                onPointerUp={() => setIsPanning(false)}
              />
            ) : (
              <motion.div
                key={`${item.id}-fallback`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-72 h-72 rounded-lg flex flex-col items-center justify-center p-8 text-center"
                style={{
                  background: `linear-gradient(145deg, ${item.color}15 0%, ${item.color}08 50%, ${item.color}20 100%)`,
                  border: `1px solid ${item.color}30`,
                }}
              >
                <h2 className="text-white/60 text-xl font-display leading-tight mb-3">{item.title}</h2>
                {item.description && (
                  <p className="text-white/30 text-sm">{item.description}</p>
                )}
                <p className="text-white/20 text-xs mt-6">Image unavailable</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ Vertical thumbnail rail — left edge ═══ */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute left-0 top-0 bottom-0 w-14 md:w-16 z-40 flex flex-col items-center pt-4 pb-4"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all backdrop-blur-sm shrink-0 mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Up arrow */}
          <button
            onClick={() => navigate(-1)}
            className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-full hover:bg-white/5 shrink-0 mb-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>

          {/* Scrollable thumbnail column */}
          <div
            className="flex-1 flex flex-col items-center gap-2 overflow-y-auto py-1 min-h-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {navigationItems.map((navItem, idx) => {
              const isCurrent = navItem.id === item.id;
              const distance = Math.min(
                Math.abs(idx - currentIndex),
                navigationItems.length - Math.abs(idx - currentIndex)
              );
              if (distance > 6) return null;

              return (
                <button
                  key={navItem.id}
                  ref={isCurrent ? currentThumbRef : undefined}
                  onClick={() => { setDirection(idx > currentIndex ? 1 : -1); onSelectItem(navItem); }}
                  className={`shrink-0 rounded-md overflow-hidden transition-all duration-200 ${
                    isCurrent
                      ? 'w-10 h-10 md:w-11 md:h-11 ring-2 ring-white/60 opacity-100'
                      : 'w-8 h-8 md:w-9 md:h-9 opacity-40 hover:opacity-80 hover:scale-110'
                  }`}
                >
                  {navItem.imageUrl ? (
                    <img src={navItem.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                  ) : (
                    <div className="w-full h-full" style={{ background: navItem.color }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Down arrow */}
          <button
            onClick={() => navigate(1)}
            className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-full hover:bg-white/5 shrink-0 mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Counter */}
          <span className="text-white/50 text-[10px] font-display tabular-nums tracking-wide mt-2 shrink-0">
            {currentIndex >= 0 ? currentIndex + 1 : '?'}/{navigationItems.length}
          </span>
        </motion.div>

        {/* Download button — floating, for public domain items */}
        {canDownload && drawerState === 'closed' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleDownload}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/40 hover:text-white transition-all z-40 backdrop-blur-sm"
            title="Download image (Public Domain)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </motion.button>
        )}

        {/* Zoom indicator */}
        {zoom > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-6 right-6 text-white/30 text-xs font-body tracking-wide z-20"
          >
            {Math.round(zoom * 100)}% — scroll to zoom, double-click to reset
          </motion.div>
        )}

        {/* Tag filter badge */}
        {tagFilter && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-40 flex items-center gap-2"
            style={{
              bottom: drawerState === 'closed' ? 210 : 48,
              left: 'calc(50% + 1.75rem)',
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-white/50 text-xs font-body">Filtering:</span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-body flex items-center gap-2">
              {tagFilter}
              <button
                onClick={() => setTagFilter(null)}
                className="text-white/40 hover:text-white/70"
              >
                x
              </button>
            </span>
          </motion.div>
        )}

        {/* ═══ Unified Drawer — wall label + metadata ═══ */}
        <motion.div
          ref={drawerRef}
          initial={{ y: 'calc(100% - 200px)' }}
          animate={drawerVariants[drawerState]}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDrawerDragEnd}
          className="absolute inset-x-0 bottom-0 z-30 flex flex-col"
          style={{
            height: 'calc(92vh + 200px)',
            background: drawerState === 'closed'
              ? 'linear-gradient(transparent 0%, rgba(0,0,0,0.6) 25%, rgba(0,0,0,0.95) 50%)'
              : 'rgba(0,0,0,0.95)',
            borderRadius: drawerState !== 'closed' ? '16px 16px 0 0' : '0',
            boxShadow: drawerState !== 'closed' ? '0 -8px 40px rgba(0,0,0,0.5)' : 'none',
            backdropFilter: drawerState !== 'closed' ? 'blur(24px)' : 'none',
          }}
        >
          {/* Drag handle — grab area for swiping */}
          <div
            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <motion.div
              className={`w-12 h-1.5 rounded-full transition-colors ${drawerState === 'closed' ? 'bg-white/25' : 'bg-white/35'}`}
              initial={{ scaleX: 0.8 }}
              animate={{ scaleX: [0.8, 1.1, 1] }}
              transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          {/* Wall label — always visible */}
          <div
            className="pl-20 md:pl-24 pr-8 pb-4 pt-2 shrink-0 cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => dragControls.start(e)}
          >
            {/* Artist — clickable to search */}
            {artistName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSearchAllCollections(artistName);
                }}
                className="text-white/70 text-sm font-display tracking-wide uppercase mb-1 hover:text-white/90 transition-colors block hover:underline underline-offset-2"
              >
                {artistName}
              </button>
            )}

            {/* Title — italic per art convention */}
            <h1 className="text-white text-2xl md:text-3xl font-display italic leading-tight mb-2">
              {item.title}
            </h1>

            {/* Medium — one line */}
            {item.medium && (
              <p className="text-white/55 text-sm line-clamp-1 font-body">{item.medium}</p>
            )}

            {/* Collection source */}
            {item.collectionSource && (
              <p className="text-white/40 text-xs mt-3 font-display tracking-wider uppercase">
                {item.collectionSource}
              </p>
            )}

            {/* Swipe hint — only in closed state */}
            {drawerState === 'closed' && (
              <button
                onClick={cycleDrawer}
                className="mt-4 text-white/50 text-xs uppercase tracking-[0.2em] hover:text-white/70 transition-colors flex items-center gap-2 group"
              >
                <span>Details</span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="transform -rotate-180 group-hover:-translate-y-0.5 transition-transform"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>

          {/* Scrollable drawer content — visible when peeked/full */}
          {drawerState !== 'closed' && (
            <div className="flex-1 overflow-y-auto drawer-scroll pl-20 md:pl-24 pr-8 pb-24">
              {/* Drawer header with close button */}
              <div className="flex items-center justify-end pb-2 shrink-0">
                <button
                  onClick={() => setDrawerState('closed')}
                  className="text-white/40 hover:text-white/70 transition-colors p-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              {/* Tier 1: Tags */}
              {tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                      <button
                        key={i}
                        onClick={() => handleTagClickInDrawer(tag.label)}
                        className={`
                          px-3 py-1.5 rounded-full text-xs font-medium transition-all
                          ${tag.color} border
                          ${tagFilter === tag.label
                            ? 'border-white/40 ring-1 ring-white/20'
                            : 'border-white/10 hover:border-white/30'
                          }
                          cursor-pointer
                        `}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                  {tagFilter && (
                    <button
                      onClick={() => handleSearchAllCollections(tagFilter)}
                      className="mt-3 text-white/40 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
                    >
                      Search "{tagFilter}" across all collections
                    </button>
                  )}
                </div>
              )}

              {/* Tier 1: Brief description */}
              {shortText && (
                <div className="mb-8">
                  <p className="text-white/70 text-sm leading-relaxed font-body max-w-lg">
                    {shortText}
                  </p>
                </div>
              )}

              {/* ── Enrichment Sections (on-demand deep dive) ── */}
              <div className="space-y-1 mb-8">

                {/* About the Artist */}
                {artistName && (
                  <div>
                    <button
                      onClick={() => toggleSection('artist')}
                      className="w-full flex items-center justify-between py-3 text-left group"
                    >
                      <span className="text-xs uppercase tracking-wider text-white/50 font-display group-hover:text-white/70 transition-colors">
                        About the Artist
                      </span>
                      <motion.svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                        className="text-white/35 group-hover:text-white/60 transition-colors"
                        animate={{ rotate: expandedSections.has('artist') ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </motion.svg>
                    </button>
                    <AnimatePresence>
                      {expandedSections.has('artist') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pb-4">
                            {enrichment.artistLoading && (
                              <div className="space-y-3 animate-pulse">
                                <div className="h-3 bg-white/5 rounded w-3/4" />
                                <div className="h-3 bg-white/5 rounded w-full" />
                                <div className="h-3 bg-white/5 rounded w-5/6" />
                                <div className="h-3 bg-white/5 rounded w-2/3" />
                              </div>
                            )}
                            {enrichment.artistFetched && !enrichment.artistInfo && !enrichment.artistLoading && (
                              <div className="space-y-3">
                                <p className="text-white/40 text-sm font-body italic">
                                  No additional information available for this artist.
                                </p>
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(artistName + ' artist')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-white/40 text-xs hover:text-white/60 transition-colors"
                                >
                                  Search the web
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                                  </svg>
                                </a>
                              </div>
                            )}
                            {enrichment.artistInfo && (
                              <div className="space-y-4">
                                {/* Artist header with thumbnail */}
                                <div className="flex gap-4">
                                  {enrichment.artistInfo.thumbnailUrl && (
                                    <img
                                      src={enrichment.artistInfo.thumbnailUrl}
                                      alt={artistName}
                                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-white/80 text-sm font-display font-medium">{artistName}</p>
                                    {(enrichment.artistInfo.born || enrichment.artistInfo.died) && (
                                      <p className="text-white/50 text-xs mt-0.5">
                                        {enrichment.artistInfo.born && enrichment.artistInfo.died
                                          ? `${enrichment.artistInfo.born} – ${enrichment.artistInfo.died}`
                                          : enrichment.artistInfo.born
                                            ? `Born ${enrichment.artistInfo.born}`
                                            : `Died ${enrichment.artistInfo.died}`
                                        }
                                      </p>
                                    )}
                                    {enrichment.artistInfo.nationality && (
                                      <p className="text-white/50 text-xs mt-0.5">{enrichment.artistInfo.nationality}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Bio extract */}
                                {enrichment.artistInfo.summary && (
                                  <p className="text-white/70 text-sm leading-relaxed font-body max-w-lg">
                                    {enrichment.artistInfo.summary}
                                  </p>
                                )}

                                {/* Structured data pills */}
                                <div className="space-y-3">
                                  {enrichment.artistInfo.movements && enrichment.artistInfo.movements.length > 0 && (
                                    <div>
                                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Movements</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {enrichment.artistInfo.movements.map((m, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[11px] text-white/60">
                                            {m}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {enrichment.artistInfo.notableWorks && enrichment.artistInfo.notableWorks.length > 0 && (
                                    <div>
                                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Notable Works</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {enrichment.artistInfo.notableWorks.map((w, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[11px] text-white/60 italic">
                                            {w}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {enrichment.artistInfo.influencedBy && enrichment.artistInfo.influencedBy.length > 0 && (
                                    <div>
                                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Influenced by</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {enrichment.artistInfo.influencedBy.map((inf, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[11px] text-white/60">
                                            {inf}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Wikipedia link */}
                                {enrichment.artistInfo.wikiUrl && (
                                  <a
                                    href={enrichment.artistInfo.wikiUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block text-white/40 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
                                  >
                                    Read more on Wikipedia
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* About This Work */}
                <div>
                  <button
                    onClick={() => toggleSection('artwork')}
                    className="w-full flex items-center justify-between py-3 text-left group"
                  >
                    <span className="text-xs uppercase tracking-wider text-white/50 font-display group-hover:text-white/70 transition-colors">
                      About This Work
                    </span>
                    <motion.svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                      className="text-white/35 group-hover:text-white/60 transition-colors"
                      animate={{ rotate: expandedSections.has('artwork') ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </motion.svg>
                  </button>
                  <AnimatePresence>
                    {expandedSections.has('artwork') && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4">
                          {enrichment.artworkLoading && (
                            <div className="space-y-3 animate-pulse">
                              <div className="h-3 bg-white/5 rounded w-full" />
                              <div className="h-3 bg-white/5 rounded w-4/5" />
                              <div className="h-3 bg-white/5 rounded w-3/4" />
                            </div>
                          )}
                          {enrichment.artworkFetched && !enrichment.artworkContext && !enrichment.artworkLoading && (
                            <div className="space-y-3">
                              <p className="text-white/40 text-sm font-body italic">
                                No Wikipedia article found for this specific work.
                              </p>
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(
                                  (artistName ? artistName + ' ' : '') + item.title + ' artwork'
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-white/40 text-xs hover:text-white/60 transition-colors"
                              >
                                Search the web
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                                </svg>
                              </a>
                            </div>
                          )}
                          {enrichment.artworkContext && (
                            <div className="space-y-3">
                              <p className="text-white/70 text-sm leading-relaxed font-body max-w-lg">
                                {enrichment.artworkContext.summary}
                              </p>
                              {enrichment.artworkContext.wikiUrl && (
                                <a
                                  href={enrichment.artworkContext.wikiUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block text-white/40 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
                                >
                                  Read more on Wikipedia
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* More by this Artist */}
                {artistName && (
                  <div>
                    <button
                      onClick={() => toggleSection('related')}
                      className="w-full flex items-center justify-between py-3 text-left group"
                    >
                      <span className="text-xs uppercase tracking-wider text-white/50 font-display group-hover:text-white/70 transition-colors">
                        More by {artistName.split(' ').slice(-1)[0]}
                      </span>
                      <motion.svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                        className="text-white/35 group-hover:text-white/60 transition-colors"
                        animate={{ rotate: expandedSections.has('related') ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </motion.svg>
                    </button>
                    <AnimatePresence>
                      {expandedSections.has('related') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pb-4">
                            {enrichment.relatedLoading && (
                              <div className="flex gap-3 animate-pulse">
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="w-28 shrink-0">
                                    <div className="w-28 h-28 bg-white/5 rounded-lg" />
                                    <div className="h-2 bg-white/5 rounded mt-2 w-20" />
                                  </div>
                                ))}
                              </div>
                            )}
                            {enrichment.relatedFetched && enrichment.relatedWorks.length === 0 && !enrichment.relatedLoading && (
                              <p className="text-white/40 text-sm font-body italic">
                                No other works found in museum collections.
                              </p>
                            )}
                            {enrichment.relatedWorks.length > 0 && (
                              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                                {enrichment.relatedWorks.map((work, i) => (
                                  <a
                                    key={i}
                                    href={work.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-28 shrink-0 group/card"
                                  >
                                    <div className="w-28 h-28 rounded-lg overflow-hidden bg-white/5">
                                      <img
                                        src={work.imageUrl}
                                        alt={work.title}
                                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                      />
                                    </div>
                                    <p className="text-white/50 text-[10px] mt-1.5 line-clamp-2 leading-tight font-body group-hover/card:text-white/70 transition-colors">
                                      {work.title}
                                    </p>
                                    {work.date && (
                                      <p className="text-white/35 text-[9px] mt-0.5">{work.date}</p>
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Divider between enrichment and metadata */}
              <div className="h-px bg-white/8 mb-8" />

              {/* Tier 2: Full metadata — visible when scrolled or in full state */}
              <div className="space-y-6 text-white/60">
                {/* Participants */}
                {creativeParticipants.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-2">
                      {creativeParticipants.length === 1 ? 'Creator' : 'People'}
                    </p>
                    <div className="space-y-2">
                      {creativeParticipants.map((participant, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-white/50 text-sm font-body">{participant.role}:</span>
                          <div>
                            <p className="text-white/70 text-sm font-body">{participant.name}</p>
                            {participant.date && (
                              <p className="text-white/45 text-xs mt-0.5">{participant.date}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Object Type */}
                {item.objectType && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">Object Type</p>
                    <p className="text-white/70 font-body">{item.objectType}</p>
                  </div>
                )}

                {/* Full description if different from shortText */}
                {item.description && stripHtml(item.description) !== shortText && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">About</p>
                    <p className="text-white/70 text-sm leading-relaxed font-body max-w-lg">{stripHtml(item.description)}</p>
                  </div>
                )}

                {/* Gallery Text if not already shown */}
                {item.galleryText && stripHtml(item.galleryText) !== shortText && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">About This Work</p>
                    <p className="text-white/70 text-sm leading-relaxed font-body max-w-lg">{stripHtml(item.galleryText)}</p>
                  </div>
                )}

                {/* Label Text if not already shown */}
                {item.labelText && stripHtml(item.labelText) !== shortText && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">Museum Label</p>
                    <p className="text-white/70 text-sm leading-relaxed font-body max-w-lg">{stripHtml(item.labelText)}</p>
                  </div>
                )}

                {/* Medium (full) */}
                {item.medium && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">Medium</p>
                    <p className="text-white/70 font-body">{item.medium}</p>
                  </div>
                )}

                {/* Dimensions */}
                {item.dimensions && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">Dimensions</p>
                    <p className="text-white/70 font-body">{item.dimensions}</p>
                  </div>
                )}

                {/* Markings */}
                {item.markings && item.markings !== 'null' && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">Markings</p>
                    <p className="text-white/70 text-sm font-body">{item.markings}</p>
                  </div>
                )}

                {/* Signed */}
                {item.signed && item.signed !== 'null' && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">Signed</p>
                    <p className="text-white/70 text-sm font-body">{item.signed}</p>
                  </div>
                )}

                {/* Inscribed */}
                {item.inscribed && item.inscribed !== 'null' && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">Inscribed</p>
                    <p className="text-white/70 text-sm font-body">{item.inscribed}</p>
                  </div>
                )}

                {/* Credit Line */}
                {item.creditLine && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-1">Credit</p>
                    <p className="text-white/60 text-sm font-body">{item.creditLine}</p>
                  </div>
                )}

                {/* Style Tags */}
                {item.styleTitles && item.styleTitles.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-2">Style</p>
                    <div className="flex flex-wrap gap-2">
                      {item.styleTitles.map((style, i) => (
                        <span key={i} className="px-2 py-1 bg-white/5 rounded-full text-xs text-white/60 font-body">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subject Tags */}
                {item.subjectTitles && item.subjectTitles.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45 font-display mb-2">Subjects</p>
                    <div className="flex flex-wrap gap-2">
                      {item.subjectTitles.slice(0, 8).map((subject, i) => (
                        <span key={i} className="px-2 py-1 bg-white/5 rounded-full text-xs text-white/60 font-body">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider before links */}
                <div className="h-px bg-white/8" />

                {/* Collection + Copyright + Links */}
                <div className="flex items-center justify-between">
                  <div>
                    {item.collectionSource && (
                      <p className="text-white/40 text-xs font-display tracking-wider uppercase">
                        {item.collectionSource}
                      </p>
                    )}
                    <p className="text-white/35 text-xs mt-1">{copyrightText}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {canDownload && (
                      <button
                        onClick={handleDownload}
                        className="text-white/40 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
                      >
                        Download image
                      </button>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/40 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
                      >
                        View original
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
