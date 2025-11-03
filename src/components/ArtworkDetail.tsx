import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { PortfolioItem } from '../types';
import { extractTags, Tag } from '../utils/tagExtractor';

interface ArtworkDetailProps {
  item: PortfolioItem | null;
  allItems: PortfolioItem[];
  onClose: () => void;
  onSelectItem: (item: PortfolioItem) => void;
  onTagClick?: (tagLabel: string) => void;
}

/**
 * Full-screen artwork detail view
 * Left sidebar with thumbnail navigation
 * Center large image
 * Right panel with artwork information
 * Arrow keys for navigation
 */
export const ArtworkDetail = ({ item, allItems, onClose, onSelectItem, onTagClick }: ArtworkDetailProps) => {
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Extract tags from current item
  const tags = item ? extractTags(item) : [];

  // Track clicking/loading state for visual feedback
  const [clickingTag, setClickingTag] = useState<string | null>(null);

  const handleTagClick = (tagLabel: string) => {
    if (onTagClick) {
      setClickingTag(tagLabel); // Show loading state
      onClose(); // Close detail view first
      onTagClick(tagLabel); // Then filter
    }
  };

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item) return;

      const currentIndex = allItems.findIndex(i => i.id === item.id);

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % allItems.length;
        onSelectItem(allItems[nextIndex]);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + allItems.length) % allItems.length;
        onSelectItem(allItems[prevIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, allItems, onSelectItem, onClose]);

  // Scroll selected item into view in sidebar
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [item?.id]);

  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex"
      >
        {/* Left Sidebar - Thumbnail Navigation */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          transition={{ type: 'spring', damping: 25 }}
          className="w-32 bg-black border-r border-white/10 overflow-y-auto scrollbar-thin"
        >
          <div className="p-4 space-y-4">
            {allItems.map((artItem) => {
              const isSelected = artItem.id === item.id;
              return (
                <button
                  key={artItem.id}
                  ref={isSelected ? selectedItemRef : null}
                  onClick={() => onSelectItem(artItem)}
                  className={`w-full aspect-square rounded-lg overflow-hidden transition-all ${
                    isSelected
                      ? 'ring-4 ring-blue-500 scale-110 shadow-lg shadow-blue-500/50'
                      : 'opacity-50 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  {artItem.imageUrl ? (
                    <img
                      src={artItem.imageUrl}
                      alt={artItem.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <div className="w-8 h-8" style={{ background: artItem.color }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Center - Large Image */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            ←
          </button>

          <motion.img
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            src={item.imageUrl}
            alt={item.title}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>

        {/* Right Panel - Information */}
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: 'spring', damping: 25 }}
          className="w-96 bg-black border-l border-white/10 p-8 overflow-y-auto"
        >
          <div className="space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {item.title}
              </h1>
              {item.description && (
                <p className="text-white/70 text-lg">
                  {item.description}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10" />

            {/* Clickable Tags */}
            {tags.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-3">
                  Explore Similar
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => {
                    const isClicking = clickingTag === tag.label;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => handleTagClick(tag.label)}
                        className={`
                          px-3 py-1.5 rounded-full text-xs font-medium transition-all
                          ${tag.color} border border-white/10
                          ${isClicking ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                          hover:shadow-lg hover:border-white/30
                        `}
                        whileHover={{ scale: isClicking ? 1 : 1.08, y: isClicking ? 0 : -2 }}
                        whileTap={{ scale: 0.95 }}
                        animate={isClicking ? {
                          opacity: [0.5, 0.7, 0.5],
                        } : {}}
                        transition={isClicking ? {
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut"
                        } : { duration: 0.2 }}
                      >
                        {isClicking ? '⏳' : ''} {tag.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            {tags.length > 0 && <div className="h-px bg-white/10" />}

            {/* Rich Artwork Information */}
            <div className="space-y-4 text-white/60">
              {/* Participants - Cooper Hewitt Design Objects - Filter to show only creators, not donors/owners */}
              {item.participants && item.participants.length > 0 && (() => {
                // Filter out donation/ownership roles, keep only creative roles
                const creativeRoles = item.participants.filter(p => {
                  const role = p.role?.toLowerCase() || '';
                  return !role.includes('donated') &&
                         !role.includes('donor') &&
                         !role.includes('previously owned') &&
                         !role.includes('owned by');
                });

                return creativeRoles.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
                      {creativeRoles.length === 1 ? 'Creator' : 'People'}
                    </p>
                    <div className="space-y-2">
                      {creativeRoles.map((participant, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-white/50 text-sm">{participant.role}:</span>
                          <div className="flex-1">
                            <p className="text-white/80 text-sm">{participant.name}</p>
                            {participant.date && (
                              <p className="text-white/40 text-xs mt-0.5">{participant.date}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Object Type - Cooper Hewitt */}
              {item.objectType && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Object Type
                  </p>
                  <p className="text-white/80">
                    {item.objectType}
                  </p>
                </div>
              )}

              {/* Short Description */}
              {item.shortDescription && (
                <div>
                  <p className="text-white/80 leading-relaxed">
                    {item.shortDescription}
                  </p>
                </div>
              )}

              {/* Gallery Text - Cooper Hewitt */}
              {item.galleryText && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    About This Work
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {item.galleryText}
                  </p>
                </div>
              )}

              {/* Label Text - Cooper Hewitt */}
              {item.labelText && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Museum Label
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {item.labelText}
                  </p>
                </div>
              )}

              {/* Medium */}
              {item.medium && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Medium
                  </p>
                  <p className="text-white/80">
                    {item.medium}
                  </p>
                </div>
              )}

              {/* Dimensions - Hidden for design collection, shown for fine art */}
              {item.dimensions && item.collectionSource !== 'Cooper Hewitt Design Museum' && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Dimensions
                  </p>
                  <p className="text-white/80">
                    {item.dimensions}
                  </p>
                </div>
              )}

              {/* Markings - Cooper Hewitt */}
              {item.markings && item.markings !== 'null' && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Markings
                  </p>
                  <p className="text-white/80 text-sm">
                    {item.markings}
                  </p>
                </div>
              )}

              {/* Signed - Cooper Hewitt */}
              {item.signed && item.signed !== 'null' && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Signed
                  </p>
                  <p className="text-white/80 text-sm">
                    {item.signed}
                  </p>
                </div>
              )}

              {/* Inscribed - Cooper Hewitt */}
              {item.inscribed && item.inscribed !== 'null' && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Inscribed
                  </p>
                  <p className="text-white/80 text-sm">
                    {item.inscribed}
                  </p>
                </div>
              )}

              {/* Credit Line - Hidden for design collection */}
              {item.creditLine && item.collectionSource !== 'Cooper Hewitt Design Museum' && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Credit
                  </p>
                  <p className="text-white/80 text-sm">
                    {item.creditLine}
                  </p>
                </div>
              )}

              {/* Provenance - Hidden for design collection */}

              {/* Accession Number - Hidden for design collection */}

              {/* Year Acquired - Hidden for design collection */}

              {/* Style Tags - Art Institute */}
              {item.styleTitles && item.styleTitles.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
                    Style
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.styleTitles.map((style, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white/5 rounded-full text-xs text-white/70"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject Tags - Art Institute */}
              {item.subjectTitles && item.subjectTitles.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
                    Subjects
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.subjectTitles.slice(0, 6).map((subject, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white/5 rounded-full text-xs text-white/70"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.collectionSource && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Collection
                  </p>
                  <p className="text-white/80">
                    {item.collectionSource}
                  </p>
                </div>
              )}

              {item.url && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    View Original
                  </p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                  >
                    Open in {item.collectionSource || 'Museum'}
                  </a>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
                  Public Domain
                </p>
                <p className="text-white/80">
                  Free to use
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10" />

            {/* Navigation hint */}
            <div className="text-sm text-white/40">
              <p>Use arrow keys or thumbnails to navigate</p>
              <p className="mt-2">Press ESC or click ← to go back</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
