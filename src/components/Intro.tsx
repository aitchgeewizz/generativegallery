import { motion } from 'framer-motion';

/**
 * First-paint intro. Per Hannah's redesign:
 * - One uniform large display size (no stepped hierarchy).
 * - Copy: "SLOWER. STRANGER. A few unexpected pieces of art and
 *   design we can appreciate and be inspired by. Not part of the
 *   algorithm but from those who came before us."
 * - "Loading the wall" animates as a left-to-right wave of opacity per
 *   character, so the loading state is unmistakable.
 *
 * Punctuation note: the wordmark uses full stops, not a colon. That
 * matches the domain (slowerstranger.com) and the typographic gesture
 * of pacing the brand carries.
 */

const LOADING_TEXT = 'Loading the wall';

export const Intro = () => {
  return (
    <motion.section
      className="fixed inset-0 z-50 flex items-center justify-center gallery-grain"
      style={{ background: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      <div className="max-w-5xl px-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="font-display leading-[1.05] text-4xl md:text-6xl lg:text-7xl tracking-tight"
          style={{ color: 'var(--text)' }}
        >
          <span className="uppercase">Slower. Stranger.</span>{' '}
          A few unexpected pieces of art and design we can appreciate and be inspired by. Not part of the algorithm but from those who came before us.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-display mt-16 text-lg md:text-2xl tracking-tight"
          aria-label="Loading the wall"
          style={{ color: 'var(--text-2)' }}
        >
          {/* Character-by-character wave. Each char animates opacity
              from low→high→low on a stagger so the word reads as a
              left-to-right pulse, repeating. */}
          {LOADING_TEXT.split('').map((char, i) =>
            char === ' ' ? (
              <span key={i}>&nbsp;</span>
            ) : (
              <motion.span
                key={i}
                animate={{ opacity: [0.18, 1, 0.18] }}
                transition={{
                  duration: 2.2,
                  delay: i * 0.08,
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
      </div>
    </motion.section>
  );
};
