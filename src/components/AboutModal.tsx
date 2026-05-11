import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full About modal — opens from the top-nav wordmark or About link.
 * Mirrors the thesis in SPEC.md so visitors who want the story can
 * read it without leaving the canvas. Theme-aware via tokens.
 */
export const AboutModal = ({ open, onClose }: AboutModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.article
            className="relative w-full max-w-2xl mx-4 my-12 md:my-16 p-8 md:p-12 rounded-lg font-display"
            style={{
              background: 'var(--bg)',
              color: 'var(--text-2)',
              boxShadow: '0 0 0 1px var(--border)',
            }}
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--text-3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>

            <h2 className="text-3xl md:text-4xl tracking-tight leading-none uppercase" style={{ color: 'var(--text)' }}>
              Slower. <span className="italic">Stranger.</span>
            </h2>

            <p className="mt-6 text-base md:text-lg leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Most design inspiration online is a firehose. This is <span className="italic">the opposite</span>.
              A few unexpected things at a time, pulled from real museum archives.
              The next best thing to walking into a gallery, made for the days you can&rsquo;t.
            </p>

            <h3 className="mt-10 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>Why this exists</h3>
            <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              After a few hours on Pinterest, Behance, Are.na, the saved folder, everything starts to look the same. The same three designers. The same five aesthetics. The same recycled bits of last year&rsquo;s trend cycle.
            </p>
            <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              That&rsquo;s not inspiration. That&rsquo;s noise.
            </p>
            <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              The best fix is to go look at something real. Walk into a gallery. Wander through a craft beer store and take in the can designs. Pick up an old book at an op shop. Real things, made on purpose, encountered without an algorithm in the way. I just don&rsquo;t always have the time.
            </p>
            <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              So this is the next best thing. A browser that pulls from public museum APIs (Cooper Hewitt, Harvard, Art Institute of Chicago) and throws a handful of pieces at you. Unexpected. You don&rsquo;t know what you&rsquo;re going to get. That&rsquo;s the feature, not a bug.
            </p>

            <h3 className="mt-10 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>What it feels like</h3>
            <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              The experience I&rsquo;m trying to recreate is awe. The moment in a gallery when you stop in front of something and just go <span className="italic">wow</span>. A colour. A composition. A choice someone made 90 years ago that still holds up.
            </p>
            <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Some days you&rsquo;ll use it for serious research. Other days to unblock yourself. Other days just to look at something beautiful and feel something. All of those count.
            </p>

            <h3 className="mt-10 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>What this is not</h3>
            <ul className="mt-3 text-sm md:text-base leading-relaxed space-y-1.5" style={{ color: 'var(--text-2)' }}>
              <li>Not a replacement for going to a real gallery. Nothing replaces that.</li>
              <li>Not a discovery engine for contemporary work. There&rsquo;s plenty of that already.</li>
              <li>Not infinite. The friction is on purpose.</li>
            </ul>

            <p className="mt-12 text-xs tracking-wide" style={{ color: 'var(--text-4)' }}>
              Built by <a href="https://www.linkedin.com/in/hannahgibson/" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline transition-colors" style={{ color: 'var(--text-3)' }}>Hannah Gibson</a>. Artwork courtesy of the Art Institute of Chicago, Cooper Hewitt Smithsonian Design Museum, and the Harvard Art Museums.
            </p>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
