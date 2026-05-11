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
  onTagClick?: (tagLabel: string) => void;
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const currentThumbRef = useRef<HTMLButtonElement>(null);

  // Derived
  const tags = item ? extractTags(item) : [];
  const artistName = item ? extractArtistName(item) : null;
  const enrichment = useEnrichment(item);

  const navigationItems = allItems;
  const currentIndex = item ? navigationItems.findIndex((i) => i.id === item.id) : -1;

  // Reset image state when item changes
  useEffect(() => {
    setMainImageError(false);
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

  // Keyboard nav: arrows step through, Escape closes (or resets zoom first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!item) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigate(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === 'Escape') {
        if (zoom > 1) {
          setZoom(1);
          setPanOffset({ x: 0, y: 0 });
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, navigate, onClose, zoom]);

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

  const handleSearchAllCollections = (tagLabel: string) => {
    if (onTagClick) {
      onClose();
      onTagClick(tagLabel);
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

        {/* Image Stage — between left rail (~60px) and right panel (PANEL_W) */}
        <div
          className="absolute top-0 bottom-0 left-14 md:left-16 flex items-center justify-center"
          style={{ right: PANEL_W }}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
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
                className="max-w-full max-h-[88vh] object-contain select-none"
                style={{
                  transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center center',
                  cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
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
                    setPanOffset((prev) => ({
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
                <h2 className="text-white/60 text-xl font-display leading-tight mb-3">
                  {item.title}
                </h2>
                {item.description && (
                  <p className="text-white/30 text-sm">{item.description}</p>
                )}
                <p className="text-white/20 text-xs mt-6">Image unavailable</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Zoom indicator — top of image area, only when zoomed */}
        {zoom > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-6 text-white/30 text-xs font-display tracking-wide z-20 pointer-events-none"
            style={{ left: `calc(50% - ${PANEL_W / 2}px)`, transform: 'translateX(-50%)' }}
          >
            {Math.round(zoom * 100)}% — scroll to zoom, double-click to reset
          </motion.div>
        )}

        {/* ── Left thumbnail rail ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="absolute left-0 top-0 bottom-0 w-14 md:w-16 z-40 flex flex-col items-center pt-4 pb-4"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)',
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all backdrop-blur-sm shrink-0 mb-4"
            aria-label="Close detail view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Up arrow */}
          <button
            onClick={() => navigate(-1)}
            className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-full hover:bg-white/5 shrink-0 mb-1"
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
                      ? 'w-10 h-10 md:w-11 md:h-11 ring-2 ring-white/60 opacity-100'
                      : 'w-8 h-8 md:w-9 md:h-9 opacity-40 hover:opacity-80 hover:scale-110'
                  }`}
                >
                  {navItem.imageUrl ? (
                    <img
                      src={navItem.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
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
            aria-label="Next artwork"
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

        {/* ── Right-side info panel ───────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute right-0 top-0 bottom-0 z-30 flex flex-col bg-[#0a0a0a]/95 backdrop-blur-md border-l border-white/[0.06]"
          style={{ width: PANEL_W }}
        >
          {/* Scrollable inner content */}
          <div className="flex-1 overflow-y-auto drawer-scroll px-8 py-12">
            {/* Wall label — always visible */}
            <header>
              {/* Maker — clickable thread */}
              {artistName && (
                <button
                  onClick={() => handleSearchAllCollections(artistName)}
                  className="text-white/70 text-xs font-display tracking-[0.2em] uppercase hover:text-white/95 transition-colors block text-left underline-offset-4 hover:underline mb-3"
                >
                  {artistName}
                </button>
              )}

              {/* Title */}
              <h1 className="text-white text-3xl font-display italic leading-tight">
                {item.title}
              </h1>

              {/* Medium / one-line metadata */}
              {item.medium && (
                <p className="text-white/55 text-sm mt-3 font-display">{item.medium}</p>
              )}

              {/* Collection source */}
              {item.collectionSource && (
                <p className="text-white/35 text-[11px] tracking-[0.18em] uppercase font-display mt-5">
                  {item.collectionSource}
                </p>
              )}
            </header>

            {/* Short description */}
            {shortText && (
              <p className="mt-6 text-white/70 text-sm leading-relaxed font-display">
                {shortText}
              </p>
            )}

            {/* Tags — "follow a thread" */}
            {tags.length > 0 && (
              <div className="mt-7">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-display mb-3">
                  Follow a thread
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearchAllCollections(tag.label)}
                      className={`px-3 py-1.5 rounded-full text-xs font-display tracking-wide transition-all ${tag.color}`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-white/[0.06] my-8" />

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
                          <p className="text-white/85 text-sm font-display">{artistName}</p>
                          {(enrichment.artistInfo.born || enrichment.artistInfo.died) && (
                            <p className="text-white/50 text-xs mt-0.5">
                              {enrichment.artistInfo.born && enrichment.artistInfo.died
                                ? `${enrichment.artistInfo.born} – ${enrichment.artistInfo.died}`
                                : enrichment.artistInfo.born
                                  ? `Born ${enrichment.artistInfo.born}`
                                  : `Died ${enrichment.artistInfo.died}`}
                            </p>
                          )}
                          {enrichment.artistInfo.nationality && (
                            <p className="text-white/50 text-xs mt-0.5">
                              {enrichment.artistInfo.nationality}
                            </p>
                          )}
                        </div>
                      </div>
                      {enrichment.artistInfo.summary && (
                        <p className="text-white/70 text-sm leading-relaxed font-display">
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
                    <p className="text-white/70 text-sm leading-relaxed font-display">
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
                        <div key={i} className="w-24 shrink-0">
                          <div className="w-24 h-24 bg-white/5 rounded-md" />
                        </div>
                      ))}
                    </div>
                  )}
                  {enrichment.relatedFetched && enrichment.relatedWorks.length === 0 && !enrichment.relatedLoading && (
                    <p className="text-white/40 text-sm font-display italic">
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
                          className="w-24 shrink-0 group/card"
                        >
                          <div className="w-24 h-24 rounded-md overflow-hidden bg-white/5">
                            <img
                              src={work.imageUrl}
                              alt={work.title}
                              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <p className="text-white/50 text-[10px] mt-1.5 line-clamp-2 leading-tight font-display group-hover/card:text-white/70 transition-colors">
                            {work.title}
                          </p>
                          {work.date && (
                            <p className="text-white/30 text-[9px] mt-0.5">{work.date}</p>
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
                            <span className="text-white/50">{p.role}: </span>
                            <span className="text-white/70">{p.name}</span>
                            {p.date && (
                              <span className="text-white/40 text-xs ml-1">({p.date})</span>
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
            <div className="mt-10 pt-6 border-t border-white/[0.06] text-xs font-display">
              <p className="text-white/35 mb-3">{copyrightText}</p>
              <div className="flex items-center gap-5">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/55 hover:text-white/85 transition-colors underline-offset-4 hover:underline"
                  >
                    View at source
                  </a>
                )}
                {canDownload && (
                  <button
                    onClick={handleDownload}
                    className="text-white/55 hover:text-white/85 transition-colors underline-offset-4 hover:underline"
                  >
                    Download image
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
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
      className="w-full flex items-center justify-between py-3 text-left group"
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-display group-hover:text-white/75 transition-colors">
        {title}
      </span>
      <motion.svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-white/30 group-hover:text-white/60 transition-colors"
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
    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-display mb-1">
      {label}
    </p>
    <p className="text-white/70 font-display">{children}</p>
  </div>
);

const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className="h-3 bg-white/5 rounded"
        style={{ width: `${100 - (i % 3) * 12}%` }}
      />
    ))}
  </div>
);

const NoEnrichment = ({ query, label }: { query: string; label: string }) => (
  <div className="space-y-3">
    <p className="text-white/40 text-sm font-display italic">
      No additional information available.
    </p>
    <a
      href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-white/40 text-xs hover:text-white/65 transition-colors"
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
    className="inline-flex items-center gap-1.5 text-white/45 text-xs hover:text-white/70 transition-colors underline-offset-4 hover:underline"
  >
    {children}
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17L17 7M17 7H7M17 7V17" />
    </svg>
  </a>
);
