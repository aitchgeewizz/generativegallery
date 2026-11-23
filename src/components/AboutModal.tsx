import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * About modal.
 *
 * DRAFT COPY (24 Nov 2026), built from Hannah's own earlier lines and
 * SPEC.md, awaiting her edit. No eyebrow labels: hierarchy comes from
 * size and tone alone. Order: the idea, where the work comes from and
 * how often it changes, why she made it, then a hairline and the
 * credits (her, then the museums).
 */
const MUSEUMS: Array<{ name: string; href: string }> = [
  { name: 'Art Institute of Chicago', href: 'https://www.artic.edu/collection' },
  { name: 'Victoria and Albert Museum, London', href: 'https://collections.vam.ac.uk/' },
  { name: 'Harvard Art Museums', href: 'https://harvardartmuseums.org/collections' },
  { name: 'Rijksmuseum, Amsterdam', href: 'https://www.rijksmuseum.nl/en/rijksstudio' },
  { name: 'Cleveland Museum of Art', href: 'https://www.clevelandart.org/art/collection/search' },
  { name: 'Library of Congress, WPA Poster Collection', href: 'https://www.loc.gov/collections/works-progress-administration-posters/' },
];

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
              style={{ color: 'var(--text)' }}
            >
              Most design inspiration online is a firehose of right now. This is meant to slow you down.
            </p>

            <p
              className="mt-6 type-body max-w-2xl"
              style={{ color: 'var(--text-2)' }}
            >
              Everything here comes out of the open collections of six museums. Posters, type and print from the V&amp;A and the Art Institute of Chicago. Dutch posters from the Rijksmuseum. WPA posters from the Library of Congress. Paintings and photographs from Chicago, Cleveland and Harvard.
            </p>

            <p
              className="mt-5 type-body max-w-2xl"
              style={{ color: 'var(--text-2)' }}
            >
              Once a week a fresh shelf of a few thousand pieces gets pulled from those archives. You only ever see a handful at a time. Refresh for another handful. If something stops you, click it to see who made it and where it lives.
            </p>

            <p
              className="mt-5 type-body max-w-2xl"
              style={{ color: 'var(--text-2)' }}
            >
              I made it because I wanted to see great things outside the usual inspiration feeds. Museum sites are catalogues, built for people who already know what they&rsquo;re looking for. This throws something at you instead. It doesn&rsquo;t beat seeing it &ldquo;for real life&rdquo;, as Bluey would say. It&rsquo;s for the days I can&rsquo;t get out there.
            </p>

            <div
              className="mt-14 pt-6 max-w-2xl"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <p className="type-small" style={{ color: 'var(--text-2)' }}>
                Built by{' '}
                <a
                  href="https://www.linkedin.com/in/hannahgibsondesign/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  Hannah Gibson
                </a>
              </p>

              <p className="mt-6 type-small" style={{ color: 'var(--text-3)' }}>
                Artwork courtesy of
              </p>
              <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2 type-small">
                {MUSEUMS.map((m) => (
                  <li key={m.name}>
                    <a
                      href={m.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-4 hover:underline transition-colors"
                      style={{ color: 'var(--text-2)' }}
                    >
                      {m.name}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 type-small" style={{ color: 'var(--text-3)' }}>
                Each work links back to its museum&rsquo;s own record. Rights stay with the museums and the makers.
              </p>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
