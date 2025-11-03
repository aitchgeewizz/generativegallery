import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Collection, CollectionType, ActiveFilter } from '../types';

interface CollectionSwitcherProps {
  currentCollection: CollectionType;
  onSelectCollection: (collection: CollectionType) => void;
  activeFilter: ActiveFilter;
  onClearFilter: () => void;
  onExpandScope?: () => void;
}

const collections: Collection[] = [
  {
    id: 'art-institute',
    name: 'Fine Art',
    description: 'Art Institute of Chicago - Paintings & Fine Art',
    icon: '🎨',
  },
  {
    id: 'met-design',
    name: 'Design',
    description: 'Met Museum - Modern Design & Graphic Design',
    icon: '✨',
  },
];

/**
 * Subtle collection switcher
 * Floating pill in bottom-right corner with separate refresh button
 * Shows filter indicator when in tag-filter mode
 */
export const CollectionSwitcher = ({
  currentCollection,
  onSelectCollection,
  activeFilter,
  onClearFilter,
  onExpandScope
}: CollectionSwitcherProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentCol = collections.find(c => c.id === currentCollection) || collections[0];

  const handleRefresh = () => {
    window.location.reload();
  };

  const isFiltered = activeFilter.mode === 'tag-filter';

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      {/* Refresh button - separate icon button to the left */}
      <motion.button
        onClick={handleRefresh}
        className="
          w-10 h-10 flex items-center justify-center rounded-full
          bg-black/60 backdrop-blur-md border border-white/10
          hover:bg-black/70 transition-all
          text-white text-lg
        "
        whileHover={{ scale: 1.05, rotate: 180 }}
        whileTap={{ scale: 0.95 }}
        title="Refresh collection"
      >
        🔄
      </motion.button>

      {/* Collection switcher OR Filter indicator */}
      <div className="relative">
        {isFiltered ? (
          /* Filter indicator - shows when viewing filtered results */
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {/* Back button */}
              <motion.button
                onClick={onClearFilter}
                className="
                  flex items-center gap-2 px-4 py-3 rounded-full
                  bg-black/60 backdrop-blur-md border border-white/10
                  hover:bg-black/70 transition-all
                  text-white text-sm font-medium
                "
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>←</span>
                <span>Back to Collections</span>
              </motion.button>

              {/* Active filter badge with item count */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="
                  flex items-center gap-2 px-4 py-3 rounded-full
                  bg-blue-500/20 backdrop-blur-md border border-blue-500/30
                  text-blue-300 text-sm font-medium
                "
              >
                <span>{activeFilter.scope === 'all' ? '🌐' : '🎯'}</span>
                <span className="font-bold">{activeFilter.tagLabel}</span>
                <span className="text-blue-300/70">({activeFilter.resultCount || 0})</span>
                <button
                  onClick={onClearFilter}
                  className="ml-1 text-blue-300/70 hover:text-blue-300 transition-colors text-lg"
                >
                  ×
                </button>
              </motion.div>
            </div>

            {/* Expand scope button - shows when filtering current collection and results are limited */}
            {activeFilter.canExpandScope && onExpandScope && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onExpandScope}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-full
                  bg-purple-500/20 backdrop-blur-md border border-purple-500/30
                  hover:bg-purple-500/30 transition-all
                  text-purple-300 text-sm font-medium
                "
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>🔍</span>
                <span>Search all collections for "{activeFilter.tagLabel}"</span>
              </motion.button>
            )}
          </div>
        ) : (
          /* Normal collection switcher */
          <>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-full right-0 mb-3 space-y-2"
                >
                  {collections.map((collection) => (
                    <motion.button
                      key={collection.id}
                      onClick={() => {
                        onSelectCollection(collection.id);
                        setIsExpanded(false);
                      }}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md
                        transition-all duration-200 w-64
                        ${
                          collection.id === currentCollection
                            ? 'bg-white/20 ring-2 ring-white/40'
                            : 'bg-black/40 hover:bg-white/10'
                        }
                      `}
                      whileHover={{ scale: 1.02, x: -4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl">{collection.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium text-sm">{collection.name}</p>
                        <p className="text-white/50 text-xs">{collection.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main toggle button */}
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="
                flex items-center gap-2 px-4 py-3 rounded-full
                bg-black/60 backdrop-blur-md border border-white/10
                hover:bg-black/70 transition-all
                text-white text-sm font-medium
              "
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xl">{currentCol.icon}</span>
              <span>{currentCol.name}</span>
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-white/60"
              >
                ▼
              </motion.span>
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
};
