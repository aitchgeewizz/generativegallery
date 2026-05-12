import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * About modal — trimmed version of the SPEC.md thesis. Keeps the
 * essential beats and credits, drops the longer expository sections.
 * Anyone wanting the long version can read SPEC.md in the repo.
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-sm py-12 md:py-20"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.article
            className="relative w-full max-w-xl mx-4 p-8 md:p-12 rounded-lg font-display"
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

            <h2
              className="text-2xl md:text-3xl tracking-tight leading-tight uppercase"
              style={{ color: 'var(--text)' }}
            >
              Slower: Stranger.
            </h2>

            <p
              className="mt-6 text-base md:text-lg leading-snug"
              style={{ color: 'var(--text-2)' }}
            >
              Most design inspiration online is a firehose.
              This is <span className="italic">the opposite</span>.
              A few unexpected pieces of art and design we can appreciate and
              be inspired by — not part of the algorithm but from those who came before us.
            </p>

            <p
              className="mt-5 text-sm md:text-base leading-relaxed"
              style={{ color: 'var(--text-2)' }}
            >
              A browser that pulls from public museum APIs — Cooper Hewitt, Harvard, the Art Institute of Chicago — and throws a handful of pieces at you. Unexpected. You don&rsquo;t know what you&rsquo;re going to get. That&rsquo;s the feature, not a bug.
            </p>

            <h3
              className="mt-10 text-[11px] uppercase tracking-[0.2em]"
              style={{ color: 'var(--text-3)' }}
            >
              What this is not
            </h3>
            <ul
              className="mt-3 text-sm leading-relaxed space-y-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              <li>Not a replacement for going to a real gallery.</li>
              <li>Not a discovery engine for contemporary work.</li>
              <li>Not infinite. The friction is on purpose.</li>
            </ul>

            <p
              className="mt-10 text-xs tracking-wide leading-relaxed"
              style={{ color: 'var(--text-4)' }}
            >
              Built by{' '}
              <a
                href="https://www.linkedin.com/in/hannahgibsondesign/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline transition-colors"
                style={{ color: 'var(--text-2)' }}
              >
                Hannah Gibson
              </a>
              . Artwork courtesy of the Art Institute of Chicago, Cooper Hewitt Smithsonian Design Museum, and the Harvard Art Museums.
            </p>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
