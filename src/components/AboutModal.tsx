import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * About modal — Hannah's voice. New copy in two parts: the project
 * thesis and a personal "How this came together" reflection on
 * building it. Em dashes are intentionally absent; we lean on full
 * stops and commas per the brand voice.
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-sm py-12 md:py-16"
          style={{ background: 'var(--veil)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.article
            className="relative w-full max-w-3xl mx-4 p-8 md:p-12 rounded-lg type-body"
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
              className="type-wordmark-modal uppercase"
              style={{ color: 'var(--text)' }}
            >
              SLOWER STRANGER
            </h2>

            <p
              className="mt-10 type-lede max-w-2xl"
              style={{ color: 'var(--text-2)' }}
            >
              Most design inspiration online is a firehose of right now. This is meant to slow you down. Appreciate the work. Maybe see something unexpected.
            </p>

            <p
              className="mt-6 type-body max-w-2xl"
              style={{ color: 'var(--text-2)' }}
            >
              It&rsquo;s a browser that pulls from public museum APIs (Cooper Hewitt, Harvard, the Art Institute of Chicago) and throws a handful of pieces at you. Take them in. Sit with them. Read more if something stops you, or just be in awe of the work.
            </p>

            <h3
              className="mt-12 type-meta"
              style={{ color: 'var(--text-3)' }}
            >
              How this came together
            </h3>
            <p
              className="mt-4 type-body max-w-2xl"
              style={{ color: 'var(--text-2)' }}
            >
              I&rsquo;d been playing with a bunch of new tools and this project pushed me further than the others. As a designer who never used to touch code, I made it into the terminal. Into corners of Claude Code I hadn&rsquo;t used before. I wanted to go beyond a static website. Build something with APIs and see if I could also explore new and interesting layouts and designs. Something that didn&rsquo;t look like the generic AI-coded layouts everywhere right now. Or a regular archive site, where you had to know what you were looking for.
            </p>
            <p
              className="mt-5 type-body max-w-2xl"
              style={{ color: 'var(--text-2)' }}
            >
              I made this because I craved seeing great things. Outside the regular algorithms of online inspiration sites. This doesn&rsquo;t beat going out and seeing it &ldquo;for real life&rdquo; as Bluey would say. But it&rsquo;s an attempt to bring some of that feeling back online, on the days I can&rsquo;t get out there.
            </p>

            <p
              className="mt-14 type-small max-w-2xl"
              style={{ color: 'var(--text-3)' }}
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
