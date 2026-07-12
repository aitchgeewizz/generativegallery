import { motion } from 'framer-motion';

export type SourceMode = 'mixed' | 'art-institute' | 'met-design' | 'harvard';
export type Theme = 'dark' | 'light';

interface TopNavProps {
  sourceMode: SourceMode;
  onSourceChange: (mode: SourceMode) => void;
  onRefresh: () => void;
  onAboutOpen: () => void;
  theme: Theme;
  onThemeToggle: () => void;
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

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/**
 * Top navigation bar — wordmark, source filter, About link, theme
 * toggle, and refresh. Colors come from theme tokens (see index.css)
 * so the bar reads correctly in both light and dark modes.
 */
export const TopNav = ({
  sourceMode,
  onSourceChange,
  onRefresh,
  onAboutOpen,
  theme,
  onThemeToggle,
}: TopNavProps) => {
  return (
    <header className="fixed top-0 inset-x-0 z-40 pointer-events-none">
      {/* Scrim so the nav stays readable when bright artwork sits
          right beneath it. Theme-aware via --scrim-top. Bumped to
          a longer fade so even bright photographs don't bleed
          through enough to wash out the text. */}
      <div
        className="absolute inset-x-0 top-0 h-36 md:h-28 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, var(--scrim-top) 0%, var(--scrim-top) 55%, transparent 100%)',
        }}
      />
      {/* Two-row layout on mobile (wordmark + icons up top, chips
          horizontally scrollable below); single-row on md+. */}
      <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6 px-4 md:px-6 py-3 md:py-4 pointer-events-auto">
        {/* Row 1 on mobile: wordmark + right cluster */}
        <div className="flex items-center justify-between md:contents">
          {/* Wordmark — always SLOWER:STRANGER, uppercase, one style.
              No italic, no period. Opens About on click. */}
          <button
            onClick={onAboutOpen}
            className="font-display text-sm tracking-[0.1em] uppercase transition-colors whitespace-nowrap shrink-0"
            style={{ color: 'var(--text)' }}
            title="About Slower:Stranger"
          >
            SLOWER:STRANGER
          </button>

          {/* Right cluster — About link hides on mobile (the wordmark
              also opens About, so this is just a duplicate save for desktop) */}
          <div className="flex items-center gap-2 shrink-0 md:order-last">
            <button
              onClick={onAboutOpen}
              className="hidden md:inline-flex font-display tracking-wide text-xs transition-colors px-2"
              style={{ color: 'var(--text-3)' }}
            >
              About
            </button>
            <motion.button
              onClick={onThemeToggle}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--text-3)' }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </motion.button>
            <motion.button
              onClick={onRefresh}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--text-3)' }}
              title="A new handful"
              aria-label="Refresh for a new handful"
              whileHover={{ rotate: 90 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <RefreshIcon />
            </motion.button>
          </div>
        </div>

        {/* Source filter — Displaay-style pills.
            Active: solid filled (foreground colour as background, background colour as text)
            Inactive: outlined, low-contrast text — promotes the active one.
            On mobile, this row becomes horizontally scrollable so all
            four pills are reachable on a narrow phone. */}
        <nav
          aria-label="Filter by source"
          className="flex items-center gap-1.5 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 md:justify-center md:flex-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {SOURCE_OPTIONS.map((opt) => {
            const active = opt.id === sourceMode;
            return (
              <button
                key={opt.id}
                onClick={() => onSourceChange(opt.id)}
                aria-pressed={active}
                className="px-3.5 md:px-4 py-1.5 rounded-full text-xs font-display tracking-wide transition-colors whitespace-nowrap shrink-0"
                style={
                  active
                    ? {
                        background: 'var(--text)',
                        color: 'var(--bg)',
                      }
                    : {
                        color: 'var(--text-2)',
                        border: '1px solid var(--border-strong)',
                      }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
