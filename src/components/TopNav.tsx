import { motion } from 'framer-motion';

export type SourceMode = 'mixed' | 'art-institute' | 'met-design' | 'harvard';

interface TopNavProps {
  sourceMode: SourceMode;
  onSourceChange: (mode: SourceMode) => void;
  onRefresh: () => void;
  onAboutOpen: () => void;
}

const SOURCE_OPTIONS: Array<{ id: SourceMode; label: string }> = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'art-institute', label: 'Fine Art' },
  { id: 'met-design', label: 'Design' },
  { id: 'harvard', label: 'Photography' },
];

const RefreshIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

/**
 * Top navigation bar — replaces the bottom-right pill from earlier
 * versions. Holds the wordmark, the source filter, the About link, and
 * a refresh affordance.
 *
 * The wordmark uses the full stops from the brand spelling ("Slower.
 * Stranger.") as part of the typographic identity, not as terminators.
 */
export const TopNav = ({
  sourceMode,
  onSourceChange,
  onRefresh,
  onAboutOpen,
}: TopNavProps) => {
  return (
    <header className="fixed top-0 inset-x-0 z-40 pointer-events-none">
      {/* Subtle scrim so the nav stays readable when bright artwork
          sits right beneath it. Fades to fully transparent within ~80px. */}
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.4) 40%, rgba(10,10,10,0) 100%)',
        }}
      />
      <div className="relative flex items-center justify-between gap-6 px-6 py-4 pointer-events-auto">
        {/* Wordmark */}
        <button
          onClick={onAboutOpen}
          className="font-display text-white/85 hover:text-white text-sm tracking-wide transition-colors"
          title="About Slower. Stranger."
        >
          <span>Slower.</span>{' '}
          <span className="italic">Stranger.</span>
        </button>

        {/* Source filter — chips */}
        <nav aria-label="Filter by source" className="flex items-center gap-1">
          {SOURCE_OPTIONS.map((opt) => {
            const active = opt.id === sourceMode;
            return (
              <button
                key={opt.id}
                onClick={() => onSourceChange(opt.id)}
                aria-pressed={active}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-display tracking-wide
                  transition-colors
                  ${
                    active
                      ? 'bg-white/[0.10] text-white/90 ring-1 ring-white/15'
                      : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
                  }
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </nav>

        {/* Right cluster — About + Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={onAboutOpen}
            className="font-display tracking-wide text-xs text-white/45 hover:text-white/80 transition-colors"
          >
            About
          </button>
          <motion.button
            onClick={onRefresh}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/45 hover:text-white/80 transition-colors"
            title="A new handful"
            aria-label="Refresh for a new handful"
            whileHover={{ rotate: 90 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <RefreshIcon />
          </motion.button>
        </div>
      </div>
    </header>
  );
};
