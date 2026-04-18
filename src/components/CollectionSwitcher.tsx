import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ActiveFilter } from '../types';
import { collections } from '../collections/registry';

interface CollectionSwitcherProps {
  currentCollection: string;
  onSelectCollection: (collectionId: string) => void;
  activeFilter: ActiveFilter;
  onClearFilter: () => void;
  onExpandScope?: () => void;
}

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

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
      <motion.button
        onClick={handleRefresh}
        className="
          w-10 h-10 flex items-center justify-center rounded-full
          bg-black/60 backdrop-blur-md border border-white/10
          hover:bg-black/70 transition-all
          text-white/60 hover:text-white/80
        "
        whileHover={{ scale: 1.05, rotate: 180 }}
        whileTap={{ scale: 0.95 }}
        title="Refresh collection"
      >
        <RefreshIcon />
      </motion.button>

      <div className="relative">
        {isFiltered ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
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
                <span className="text-white/40">&larr;</span>
                <span>Back</span>
              </motion.button>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="
                  flex items-center gap-2 px-4 py-3 rounded-full
                  bg-white/5 backdrop-blur-md border border-white/10
                  text-white/70 text-sm font-medium
                "
              >
                <span className="text-white/30 text-xs uppercase tracking-wider">
                  {activeFilter.scope === 'all' ? 'All' : 'Current'}
                </span>
                <span className="font-display">{activeFilter.tagLabel}</span>
                <span className="text-white/30">({activeFilter.resultCount || 0})</span>
                <button
                  onClick={onClearFilter}
                  className="ml-1 text-white/30 hover:text-white/60 transition-colors"
                >
                  &times;
                </button>
              </motion.div>
            </div>

            {activeFilter.canExpandScope && onExpandScope && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onExpandScope}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-full
                  bg-white/5 backdrop-blur-md border border-white/10
                  hover:bg-white/10 transition-all
                  text-white/50 text-sm font-medium
                "
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Search all collections</span>
              </motion.button>
            )}
          </div>
        ) : (
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
                            ? 'bg-white/10 ring-1 ring-white/20'
                            : 'bg-black/60 hover:bg-white/5'
                        }
                      `}
                      whileHover={{ scale: 1.02, x: -4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-white/30 text-xs font-mono w-6 text-center">{collection.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="text-white/80 font-medium text-sm font-display">{collection.name}</p>
                        <p className="text-white/30 text-xs">{collection.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="
                flex items-center gap-2 px-4 py-3 rounded-full
                bg-black/60 backdrop-blur-md border border-white/10
                hover:bg-black/70 transition-all
                text-white/80 text-sm font-medium
              "
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="font-display">{currentCol.name}</span>
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-white/30 text-xs"
              >
                &#9662;
              </motion.span>
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
};
