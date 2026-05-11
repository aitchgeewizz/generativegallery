import { motion } from 'framer-motion';

/**
 * First-paint intro. Theme-aware (light/dark via tokens) and
 * typographically ambitious: SLOWER. STRANGER. set in caps with the
 * "STRANGER." in italic accent (Displaay-style mixed roman/italic
 * within a single line). The thesis hook follows in roman, then a
 * smaller orienting paragraph. "Loading the wall" pulses quietly at
 * the bottom.
 */
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
      <div className="max-w-3xl px-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: 'easeOut' }}
          className="font-display tracking-tight text-5xl md:text-7xl leading-[0.95]"
          style={{ color: 'var(--text)' }}
        >
          <span className="uppercase">Slower.</span>{' '}
          <span className="uppercase italic">Stranger.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
          className="font-display mt-10 text-lg md:text-2xl leading-snug"
          style={{ color: 'var(--text-2)' }}
        >
          Most design inspiration online is a firehose.
          <br />
          This is <span className="italic">the opposite.</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
          className="font-display mt-8 text-base md:text-lg leading-relaxed max-w-xl mx-auto"
          style={{ color: 'var(--text-3)' }}
        >
          A few unexpected things at a time, pulled from real museum archives.
          The next best thing to walking into a gallery, made for the days you can&rsquo;t.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 2.6, delay: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          className="font-display mt-16 text-xs tracking-[0.3em] uppercase"
          style={{ color: 'var(--text-4)' }}
        >
          Loading the wall
        </motion.p>
      </div>
    </motion.section>
  );
};
