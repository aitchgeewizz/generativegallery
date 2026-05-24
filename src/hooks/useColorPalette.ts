import { useEffect, useRef, useState } from 'react';
import { extractPalette } from '../utils/colorPalette';

/**
 * Extract a dominant-colour palette from an image URL. Runs once per
 * URL, caches in-memory across the session, and races against URL
 * changes so a fast detail-panel navigate doesn't show stale colours.
 */
const cache = new Map<string, string[]>();

export const useColorPalette = (imageUrl: string | undefined, count = 5) => {
  const [palette, setPalette] = useState<string[]>(() =>
    imageUrl ? cache.get(imageUrl) ?? [] : [],
  );
  // Track the last URL we kicked off work for, so an in-flight extract
  // doesn't overwrite a newer URL's palette when it resolves late.
  const inFlightUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!imageUrl) {
      setPalette([]);
      return;
    }
    const cached = cache.get(imageUrl);
    if (cached) {
      setPalette(cached);
      return;
    }
    setPalette([]);
    inFlightUrl.current = imageUrl;
    extractPalette(imageUrl, count).then((colors) => {
      if (inFlightUrl.current !== imageUrl) return;
      cache.set(imageUrl, colors);
      setPalette(colors);
    });
  }, [imageUrl, count]);

  return palette;
};
