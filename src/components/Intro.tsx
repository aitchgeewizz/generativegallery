import { motion } from 'framer-motion';

/**
 * First-paint intro that replaces the old "A moment…" pulsing spinner.
 * Same load time, better content — uses the wait productively to
 * introduce the project for a first-time visitor.
 *
 * The component is rendered while the APIs fetch; App.tsx switches to
 * the canvas via AnimatePresence once items have arrived, so the intro
 * cross-fades out into the wall.
 */
export const Intro = ({ subtle = false }: { subtle?: boolean }) => {
  return (
    <motion.section
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a] gallery-grain"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      <div className="max-w-2xl px-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: 'easeOut' }}
          className="font-display text-white/90 tracking-tight text-5xl md:text-6xl leading-none"
        >
          Slower. <span className="italic text-white/85">Stranger.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
          className="font-display text-white/55 mt-8 text-base md:text-lg leading-relaxed"
        >
          Most design inspiration online is a firehose.<br />This is the opposite.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
          className="font-display text-white/35 mt-6 text-sm md:text-base leading-relaxed max-w-md mx-auto"
        >
          A few unexpected things at a time, pulled from real museum archives.
          The next best thing to walking into a gallery, made for the days you can&rsquo;t.
        </motion.p>

        {!subtle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 2.6, delay: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            className="font-display text-white/25 mt-14 text-xs tracking-[0.2em] uppercase"
          >
            Loading the wall
          </motion.p>
        )}
      </div>
    </motion.section>
  );
};
