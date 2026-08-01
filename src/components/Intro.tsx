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
            animate={{
              opacity: 1,
              y: 0,
              fontVariationSettings: [
                "'BLED' 18, 'SCAN' 2",
                "'BLED' 30, 'SCAN' 16",
                "'BLED' 24, 'SCAN' 10",
              ],
            }}
            transition={{
              opacity: { duration: 0.8, ease: 'easeOut' },
              y: { duration: 0.8, ease: 'easeOut' },
              fontVariationSettings: {
                duration: 2.4,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'mirror',
              },
            }}
            className="type-wordmark-hero uppercase"
            style={{ color: 'var(--text)' }}
          >
            SLOWER STRANGER
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            className="mt-8 type-lede"
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
        className="absolute inset-x-0 bottom-[18vh] text-center font-wordmark type-control"
        aria-label="Loading the wall"
        style={{ color: 'var(--text-2)' }}
      >
        {LOADING_TEXT.split('').map((char, i) =>
          char === ' ' ? (
            <span key={i}>&nbsp;</span>
          ) : (
            <motion.span
              key={i}
              animate={{
                opacity: [0.25, 1, 0.25],
                fontVariationSettings: [
                  "'BLED' 12, 'SCAN' 0",
                  "'BLED' 34, 'SCAN' 20",
                  "'BLED' 12, 'SCAN' 0",
                ],
              }}
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
