import { motion } from 'framer-motion';

/**
 * First-paint intro.
 *
 * Two visually separated blocks:
 *  1. Headline group — wordmark + lead, centered vertically.
 *  2. Loading state — small caps "LET'S SEE" sitting in the lower
 *     third, animated per-character so the wait reads as anticipation
 *     rather than dead time.
 *
 * Wordmark convention: SLOWER STRANGER, uppercase, with a space, no
 * trailing period. Matches the logo treatment used in TopNav and
 * AboutModal.
 */

const LOADING_TEXT = 'LET’S SEE';

export const Intro = () => {
  return (
    <motion.section
      className="fixed inset-0 z-50 gallery-grain"
      style={{ background: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* Headline group — centered in the viewport */}
      <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
        <div className="max-w-5xl">
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="font-display uppercase text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05]"
            style={{ color: 'var(--text)' }}
          >
            SLOWER STRANGER
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            className="font-display mt-6 text-lg md:text-2xl tracking-tight"
            style={{ color: 'var(--text-2)' }}
          >
            A few unexpected pieces of art and design to fill our cups
          </motion.p>
        </div>
      </div>

      {/* Loading state — sits in the lower third so it reads as a
          separate moment from the headline. Wave animation per char
          gives the wait a heartbeat. */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute inset-x-0 bottom-[18vh] text-center font-display text-xs md:text-sm uppercase tracking-[0.25em]"
        aria-label="Loading the wall"
        style={{ color: 'var(--text-2)' }}
      >
        {LOADING_TEXT.split('').map((char, i) =>
          char === ' ' ? (
            <span key={i}>&nbsp;</span>
          ) : (
            <motion.span
              key={i}
              animate={{ opacity: [0.18, 1, 0.18] }}
              transition={{
                duration: 2.2,
                delay: i * 0.12,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ display: 'inline-block' }}
            >
              {char}
            </motion.span>
          ),
        )}
      </motion.p>
    </motion.section>
  );
};
