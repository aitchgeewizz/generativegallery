/**
 * Harvard Art Museums API — Photography Collection
 * Focused on photographic works from the 250k+ object collection
 * API Docs: https://github.com/harvardartmuseums/api-docs
 * Rate Limit: 2500 requests/day
 */

import { shuffle } from '../utils/shuffle';
import { combineSignals, isAbortError } from '../utils/abort';

export interface HarvardArtObject {
  id: number;
  objectid: number;
  objectnumber: string;
  title: string;
  dated: string;
  datebegin: number;
  dateend: number;
  classification: string;
  medium: string;
  dimensions: string;
  people: Array<{
    name: string;
    role: string;
    displayorder: number;
  }>;
  culture: string;
  period: string;
  century: string;
  technique: string;
  department: string;
  division: string;
  creditline: string;
  description?: string;
  provenance?: string;
  commentary?: string;
  primaryimageurl: string | null;
  images: Array<{
    baseimageurl: string;
    iiifbaseuri: string;
    height: number;
    width: number;
  }>;
  colors: Array<{
    color: string;
    spectrum: string;
    hue: string;
    percent: number;
    css3: string;
  }>;
  url: string;
  verificationlevel: number;
}

const BASE_URL = 'https://api.harvardartmuseums.org';
const API_KEY = import.meta.env.VITE_HARVARD_KEY;

export const HARVARD_TILE_SIZE = 400;
export const HARVARD_DETAIL_SIZE = 1600;

/**
 * Get an image URL at the requested pixel width.
 *
 * `primaryimageurl` points at Harvard's IDS delivery service (via the
 * nrs.harvard.edu resolver), which honours a `?width=` query param even
 * through the redirect — verified July 2026, CORS-open. Without it the
 * service returns originals up to several thousand pixels, which is
 * multi-MB waste for a 200px wall tile. IIIF fallback takes the same
 * size via the standard path segment.
 */
export const getHarvardImageUrl = (artwork: HarvardArtObject, size: number = 843): string | null => {
  // Try primary image URL first
  if (artwork.primaryimageurl) {
    const sep = artwork.primaryimageurl.includes('?') ? '&' : '?';
    return `${artwork.primaryimageurl}${sep}width=${size}`;
  }

  // Try IIIF images
  if (artwork.images && artwork.images.length > 0) {
    const image = artwork.images[0];
    if (image.iiifbaseuri) {
      return `${image.iiifbaseuri}/full/${size},/0/default.jpg`;
    }
    if (image.baseimageurl) {
      return image.baseimageurl;
    }
  }

  return null;
};

type PhotoBucket = {
  name: string;
  terms: string[];
  minShare?: number;
};

/**
 * Photography search buckets. The Photo lens should feel like a small
 * photography wall, not one archival drawer. Colour and later-process
 * terms are intentionally over-represented so the room does not collapse
 * into black-and-white architectural documentation.
 */
const PHOTO_BUCKETS: PhotoBucket[] = [
  {
    name: 'colour and modern process',
    minShare: 0.35,
    terms: [
      'chromogenic print',
      'dye transfer print',
      'pigment print',
      'inkjet print',
      'Polaroid',
      'Cibachrome',
      'color photography',
    ],
  },
  {
    name: 'postwar and contemporary',
    minShare: 0.25,
    terms: [
      'contemporary photography',
      'conceptual photography',
      'fashion photography',
      'street photography',
      'documentary photography',
      'still life photography',
    ],
  },
  {
    name: 'people and studio',
    terms: [
      'portrait photography',
      'self portrait photography',
      'studio portrait',
      'photographic portrait',
    ],
  },
  {
    name: 'place and landscape',
    terms: [
      'landscape photography',
      'interior photography',
      'urban photography',
      'city photography',
    ],
  },
  {
    name: 'experimental',
    terms: [
      'abstract photography',
      'photogram',
      'photomontage',
      'solarized photograph',
    ],
  },
];

const randomFrom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const normalize = (value?: string | null): string =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const isDocumentationImage = (item: HarvardArtObject): boolean => {
  const text = normalize([
    item.title,
    item.medium,
    item.classification,
    item.department,
    item.division,
  ].filter(Boolean).join(' '));

  return [
    'x radiograph',
    'x ray',
    'radiograph',
    'infrared reflectogram',
    'ultraviolet',
    'raking light',
    'conservation',
    'detail of',
    'verso of',
    'frame of',
  ].some((term) => text.includes(term));
};

const hasImage = (item: HarvardArtObject): boolean =>
  !!item.primaryimageurl || !!item.images?.length;

const hasLikelyColour = (item: HarvardArtObject): boolean => {
  const medium = normalize(item.medium);
  if (
    medium.includes('chromogenic') ||
    medium.includes('cibachrome') ||
    medium.includes('dye transfer') ||
    medium.includes('pigment print') ||
    medium.includes('inkjet') ||
    medium.includes('polaroid') ||
    medium.includes('color')
  ) {
    return true;
  }

  const hues = new Set(
    item.colors
      ?.filter((c) => c.percent >= 0.04)
      .map((c) => normalize(c.hue || c.css3 || c.spectrum))
      .filter((h) => h && !['gray', 'grey', 'black', 'white'].includes(h)),
  );
  return hues.size >= 2;
};

const isLaterPhoto = (item: HarvardArtObject): boolean =>
  typeof item.datebegin === 'number' && item.datebegin >= 1950;

const isQualityPhoto = (item: HarvardArtObject): boolean => {
  if (!hasImage(item)) return false;
  if (!item.title || normalize(item.title) === 'untitled') return false;
  if (!item.people || item.people.length === 0) return false;
  return !isDocumentationImage(item);
};

const dedupePhotos = (items: HarvardArtObject[]): HarvardArtObject[] => {
  const seen = new Set<string>();
  const out: HarvardArtObject[] = [];

  for (const item of items) {
    const imageKey =
      item.primaryimageurl ||
      item.images?.[0]?.iiifbaseuri ||
      item.images?.[0]?.baseimageurl ||
      '';
    const key = [
      item.objectid || item.id,
      normalize(item.title),
      normalize(item.people?.[0]?.name),
      imageKey,
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
};

const interleaveBuckets = (buckets: HarvardArtObject[][]): HarvardArtObject[] => {
  const out: HarvardArtObject[] = [];
  const max = Math.max(...buckets.map((bucket) => bucket.length), 0);
  for (let i = 0; i < max; i++) {
    for (const bucket of buckets) {
      if (bucket[i]) out.push(bucket[i]);
    }
  }
  return out;
};

const fetchPhotoPage = async (
  term: string,
  page: number,
  size: number = 70,
  signal?: AbortSignal,
): Promise<HarvardArtObject[]> => {
  const response = await fetch(
    `${BASE_URL}/object?apikey=${API_KEY}&size=${size}&page=${page}&hasimage=1&classification=Photographs&q=${encodeURIComponent(term)}`,
    { signal: combineSignals(10000, signal) }
  );

  if (!response.ok) {
    console.warn(`Harvard photo query "${term}" returned ${response.status}`);
    return [];
  }

  const data = await response.json();
  return ((data.records || []) as HarvardArtObject[]).filter(isQualityPhoto);
};

/**
 * Fetch photographs from Harvard Art Museums
 * Uses search-based approach to find art photography, excluding
 * X-rays, radiographs, and conservation documentation
 */
export const fetchHarvardArtworks = async (count: number = 32, signal?: AbortSignal): Promise<HarvardArtObject[]> => {
  if (!API_KEY) {
    console.warn('Harvard Art Museums API key not found');
    return [];
  }

  try {
    console.log(`Fetching ${count} photographs from Harvard Art Museums...`);

    const bucketFetches = PHOTO_BUCKETS.map(async (bucket) => {
      const term = randomFrom(bucket.terms);
      const randomPage = Math.floor(Math.random() * 12) + 1;

      const quality = await fetchPhotoPage(term, randomPage, 70, signal);

      // Put colour and later works toward the front of each bucket, but
      // keep the rest so the archive can still surprise us.
      const ranked = quality.sort((a, b) => {
        const scoreA = Number(hasLikelyColour(a)) * 2 + Number(isLaterPhoto(a));
        const scoreB = Number(hasLikelyColour(b)) * 2 + Number(isLaterPhoto(b));
        return scoreB - scoreA;
      });

      console.log(`${bucket.name} (${term}): ${ranked.length} usable photos`);
      return ranked;
    });

    const bucketResults = await Promise.all(bucketFetches);
    const minimumColour = Math.ceil(count * 0.35);
    const colourFirst = dedupePhotos(
      bucketResults.flat().filter((item) => hasLikelyColour(item) || isLaterPhoto(item)),
    ).slice(0, minimumColour);

    const remainingBuckets = bucketResults.map((bucket) =>
      bucket.filter((item) => !colourFirst.includes(item)),
    );
    const mixed = dedupePhotos([
      ...colourFirst,
      ...interleaveBuckets(remainingBuckets),
    ]);

    let selected = mixed.slice(0, count);

    if (selected.length < Math.ceil(count * 0.6)) {
      const fallbackTerms = ['photography', 'chromogenic print', 'portrait photography'];
      const fallbackPages = await Promise.all(
        fallbackTerms.map((term) =>
          fetchPhotoPage(term, Math.floor(Math.random() * 8) + 1, 90, signal).catch(() => []),
        ),
      );
      selected = dedupePhotos([
        ...selected,
        ...interleaveBuckets(fallbackPages),
      ]).slice(0, count);
    }

    console.log(`Loaded ${selected.length} Harvard photographs`);

    return selected;
  } catch (error) {
    if (!isAbortError(error)) console.error('Harvard Art Museums API failed:', error);
    return [];
  }
};

/**
 * Bauhaus / Busch-Reisinger design themes. Harvard holds one of the
 * best Bauhaus collections outside Germany, invisible while the fetch
 * was locked to classification=Photographs. The `division` API param
 * proved unreliable (probed July 2026 — totals ignored it), so these
 * ride the general `q` search, which returns precisely the right
 * objects for named-movement and named-maker queries.
 */
const DESIGN_THEMES = [
  'Bauhaus', 'Lyonel Feininger', 'Moholy-Nagy', 'Josef Albers',
  'Anni Albers', 'Marianne Brandt', 'Werkbund', 'De Stijl',
  'New European Graphics', 'Bauhaus weaving', 'Herbert Bayer',
];

/**
 * Fetch design works for the mixed wall — same plumbing as the
 * photography fetch, without the Photographs lock.
 */
export const fetchHarvardDesignWorks = async (count: number = 32, signal?: AbortSignal): Promise<HarvardArtObject[]> => {
  if (!API_KEY) {
    console.warn('Harvard Art Museums API key not found');
    return [];
  }

  try {
    const artworks: HarvardArtObject[] = [];
    const themes = shuffle(DESIGN_THEMES);
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts && artworks.length < count; attempt++) {
      const theme = themes[attempt % themes.length];
      const randomPage = Math.floor(Math.random() * 5) + 1;

      const response = await fetch(
        `${BASE_URL}/object?apikey=${API_KEY}&size=100&page=${randomPage}&hasimage=1&q=${encodeURIComponent(theme)}`,
        { signal: combineSignals(10000, signal) }
      );
      if (!response.ok) {
        if (response.status === 429) break;
        continue;
      }

      const data = await response.json();
      const quality = (data.records || []).filter((item: HarvardArtObject) => {
        if (!item.primaryimageurl && (!item.images || item.images.length === 0)) return false;
        if (!item.title || item.title.toLowerCase() === 'untitled') return false;
        if (!item.people || item.people.length === 0) return false;
        return true;
      });
      artworks.push(...quality);
    }

    return shuffle(artworks).slice(0, count);
  } catch (error) {
    if (!isAbortError(error)) console.error('Harvard design fetch failed:', error);
    return [];
  }
};

/**
 * Search Harvard collection by keyword/tag
 * Used for tag-based filtering
 */
export const searchHarvardByTag = async (
  tag: string,
  count: number = 32,
  classification: string | null = 'Photographs'
): Promise<HarvardArtObject[]> => {
  if (!API_KEY) {
    console.warn('Harvard Art Museums API key not found');
    return [];
  }

  try {
    console.log(`Searching Harvard for tag: "${tag}"`);

    const clsParam = classification ? `&classification=${encodeURIComponent(classification)}` : '';
    const response = await fetch(
      `${BASE_URL}/object?apikey=${API_KEY}&q=${encodeURIComponent(tag)}&size=${count * 2}&hasimage=1${clsParam}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.warn(`Search API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    const artworks = dedupePhotos(
      ((data.records || []) as HarvardArtObject[])
        .filter(isQualityPhoto)
        .sort((a, b) => {
          const scoreA = Number(hasLikelyColour(a)) * 2 + Number(isLaterPhoto(a));
          const scoreB = Number(hasLikelyColour(b)) * 2 + Number(isLaterPhoto(b));
          return scoreB - scoreA;
        }),
    );

    console.log(`Found ${artworks.length} Harvard artworks for "${tag}"`);

    return artworks.slice(0, count);
  } catch (error) {
    console.error('Harvard search failed:', error);
    return [];
  }
};

/**
 * Format artwork data for display
 */
export const formatHarvardArtwork = (artwork: HarvardArtObject): string => {
  const parts = [];

  // Get primary artist
  if (artwork.people && artwork.people.length > 0) {
    const primaryArtist = artwork.people
      .sort((a, b) => a.displayorder - b.displayorder)[0];
    parts.push(primaryArtist.name);
  }

  // Add date
  if (artwork.dated) {
    parts.push(artwork.dated);
  } else if (artwork.century) {
    parts.push(artwork.century);
  }

  // Add culture if interesting
  if (artwork.culture && !artwork.culture.toLowerCase().includes('american')) {
    parts.push(artwork.culture);
  }

  return parts.join(' • ');
};

/**
 * Get object details by ID
 * For when you need full details about a specific artwork
 */
export const getHarvardObjectDetails = async (
  objectId: number
): Promise<HarvardArtObject | null> => {
  if (!API_KEY) return null;

  try {
    const response = await fetch(
      `${BASE_URL}/object/${objectId}?apikey=${API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch Harvard object details:', error);
    return null;
  }
};
