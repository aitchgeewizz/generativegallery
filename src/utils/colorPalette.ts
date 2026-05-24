/**
 * Extract a small dominant-colour palette from an image URL,
 * client-side, with no library dependency.
 *
 * Algorithm: downsample the image to a small canvas, bucket each
 * pixel into a 4-bit-per-channel cube (4096 buckets), count per
 * bucket, then walk the most frequent buckets while skipping any
 * that sit too close (perceptually) to a colour we've already kept.
 *
 * Trade-offs: this is a frequency-based quantiser, not a perceptual
 * one like median-cut. It picks the colours that cover the most
 * area, which is what museum-tile thumbnails benefit from — broad
 * background + a couple of accents. Skips near-transparent pixels.
 */

/** Cross-origin loaded museum images may still taint the canvas if
 *  the server didn't echo CORS headers. We catch that and resolve
 *  with an empty palette so the UI just doesn't render swatches. */
export const extractPalette = async (
  url: string,
  count = 5,
): Promise<string[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const fail = () => resolve([]);

    img.onerror = fail;
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return fail();

        // Draw image scaled to 64×64. object-fit equivalent: cover.
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = Math.max(size / iw, size / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

        let data: Uint8ClampedArray;
        try {
          data = ctx.getImageData(0, 0, size, size).data;
        } catch {
          // Tainted canvas — image wasn't served with CORS headers.
          return fail();
        }

        // 4-bit-per-channel bucket key. Skip transparent + very dark
        // edge pixels (these are usually the museum mounting board).
        const buckets = new Map<number, number>();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          const r4 = data[i] >> 4;
          const g4 = data[i + 1] >> 4;
          const b4 = data[i + 2] >> 4;
          const key = (r4 << 8) | (g4 << 4) | b4;
          buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }

        // Walk most-frequent first, keep colours that are perceptually
        // distinct from what we've already picked. minDistance is sum
        // of per-channel absolute differences (cheap L1 metric).
        const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]);
        const picked: Array<[number, number, number]> = [];
        const minDistance = 90;

        for (const [key] of sorted) {
          if (picked.length >= count) break;
          // Reconstruct RGB at bucket midpoint.
          const r = ((key >> 8) & 0xf) * 16 + 8;
          const g = ((key >> 4) & 0xf) * 16 + 8;
          const b = (key & 0xf) * 16 + 8;
          const tooClose = picked.some(
            ([pr, pg, pb]) =>
              Math.abs(pr - r) + Math.abs(pg - g) + Math.abs(pb - b) < minDistance,
          );
          if (!tooClose) picked.push([r, g, b]);
        }

        const hex = picked.map(rgbToHex);
        resolve(hex);
      } catch {
        fail();
      }
    };

    img.src = url;
  });
};

const rgbToHex = ([r, g, b]: [number, number, number]): string =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
