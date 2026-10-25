/**
 * Art Institute of Chicago API
 * Better CORS support, no API key needed
 * https://api.artic.edu/docs/
 */

import { shuffle } from '../utils/shuffle';
import { combineSignals, isAbortError } from '../utils/abort';

export interface ArtworkData {
  id: number;
  title: string;
  artist_display: string;
  artist_title?: string;
  date_display: string;
  image_id: string;
  is_public_domain: boolean;
  description?: string;
  short_description?: string;
  medium_display?: string;
  dimensions?: string;
  credit_line?: string;
  style_titles?: string[];
  classification_titles?: string[];
  subject_titles?: string[];
  theme_titles?: string[];
  color?: {
    h: number;
    s: number;
    l: number;
  };
  thumbnail?: {
    lqip?: string;
    width?: number;
    height?: number;
    alt_text?: string;
  };
}

const BASE_URL = 'https://api.artic.edu/api/v1';
const IMAGE_BASE_URL = 'https://www.artic.edu/iiif/2';

const ARTWORK_FIELDS = 'id,title,artist_display,date_display,image_id,is_public_domain,description,short_description,medium_display,dimensions,credit_line,style_titles,classification_titles,subject_titles,theme_titles,color,is_boosted,thumbnail';

/**
 * Get image URL from image_id.
 *
 * Verified sizes (July 2026): 400 ≈ 44KB (wall tile), 843 ≈ 193KB (the
 * size AIC's docs bless — our graceful fallback), 1686 ≈ 830KB (detail
 * stage; sharp on retina where 843 upscales ~1.4x).
 */
export const getImageUrl = (imageId: string, size: number = 843): string => {
  return `${IMAGE_BASE_URL}/${imageId}/full/${size},/0/default.jpg`;
};

export const AIC_TILE_SIZE = 400;
export const AIC_DETAIL_SIZE = 1686;
export const AIC_FALLBACK_SIZE = 843;

/**
 * Curated themes for diverse, vibrant collections
 */
const CURATED_THEMES = [
  'Impressionism', 'Post-Impressionism', 'Modernism', 'Pop Art', 'Art Deco',
  'Surrealism', 'Expressionism', 'Cubism', 'Abstract', 'Renaissance',
  'portraits', 'landscapes', 'still life', 'cityscapes', 'animals',
  'Photography', 'sculpture', 'paintings', 'Japanese prints',
  'American Art', 'European Painting', 'African Art', 'Asian Art',
  'Essentials', 'masterpieces', 'architecture',
  // Design-artifact threads — AIC's prints, posters and ornament
  // holdings are deep and were previously never surfaced.
  'poster', 'ornament', 'Vienna Secession', 'Arts and Crafts movement',
  'trade card', 'wood engraving', 'lithograph',
];

const isQualityArtwork = (item: ArtworkData): boolean => {
  if (!item.image_id || !item.is_public_domain) return false;
  if (typeof item.image_id !== 'string' || item.image_id.length < 8) return false;
  if (!item.title || !item.artist_display) return false;
  return true;
};

/**
 * Fetch artwork details in bulk using the ids parameter (single request)
 */
const fetchArtworksByIds = async (ids: number[], signal?: AbortSignal): Promise<ArtworkData[]> => {
  if (ids.length === 0) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/artworks?ids=${ids.join(',')}&fields=${ARTWORK_FIELDS}&limit=${ids.length}`,
      { signal: combineSignals(15000, signal) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.data || []) as ArtworkData[];
  } catch (err) {
    if (!isAbortError(err)) console.warn('Batch fetch failed:', err);
    return [];
  }
};

/**
 * Fetch artworks using batch API calls for reliability.
 * Picks multiple random themes, fetches IDs, then bulk-loads details
 * in 2-3 requests total instead of 64+ individual ones.
 */
export const fetchRandomArtworks = async (count: number = 32, signal?: AbortSignal): Promise<ArtworkData[]> => {
  try {
    console.log(`Fetching ${count} fresh artworks from Art Institute API...`);

    // Pick 3 random themes for variety
    const shuffledThemes = shuffle(CURATED_THEMES);
    const selectedThemes = shuffledThemes.slice(0, 3);
    console.log(`Themes: ${selectedThemes.join(', ')}`);

    // Search all themes in parallel to get IDs
    const searchResults = await Promise.allSettled(
      selectedThemes.map(theme =>
        fetch(
          `${BASE_URL}/artworks/search?q=${encodeURIComponent(theme)}&limit=80&fields=id`,
          { signal: combineSignals(10000, signal) }
        ).then(r => r.ok ? r.json() : { data: [] })
      )
    );

    // Collect and deduplicate IDs
    const idSet = new Set<number>();
    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        for (const item of (result.value.data || [])) {
          idSet.add(item.id);
        }
      }
    }

    if (idSet.size === 0) {
      // An aborted run reaches here with zero IDs; report it as the
      // abort it is, not as an archive failure.
      signal?.throwIfAborted();
      throw new Error('No artworks found from any theme');
    }

    // Shuffle and take extra for filtering. We multiply by 8 (with a
    // floor of 60) because the quality filter (public_domain + image_id
    // + title + artist) typically passes ~30-40% of fetched details,
    // and a small count (e.g. 10) without a floor would only fetch 30
    // IDs → ~3 quality items, which is far too sparse.
    const allIds = shuffle([...idSet]);
    const idsToFetch = allIds.slice(0, Math.max(count * 8, 60));

    console.log(`Found ${idSet.size} unique IDs, fetching ${idsToFetch.length} details in bulk...`);

    // Fetch details in bulk batches (40 per request instead of 1 per request)
    const batchSize = 40;
    const artworks: ArtworkData[] = [];

    for (let i = 0; i < idsToFetch.length; i += batchSize) {
      const batchIds = idsToFetch.slice(i, i + batchSize);
      const batchResults = await fetchArtworksByIds(batchIds, signal);
      artworks.push(...batchResults);

      const qualityCount = artworks.filter(isQualityArtwork).length;
      if (qualityCount >= count) {
        console.log(`Got enough quality artworks (${qualityCount})`);
        break;
      }
    }

    console.log(`Fetched ${artworks.length} artworks total`);

    const filtered = artworks.filter(isQualityArtwork);
    console.log(`After filtering: ${filtered.length} quality artworks`);

    // Light ranking only: boosted works float, everything else keeps its
    // shuffled order. The old score actively buried prints, drawings and
    // textiles — for a design-artifact wall those ARE the good stuff.
    const sorted = filtered.sort((a, b) => {
      if ((a as any).is_boosted && !(b as any).is_boosted) return -1;
      if (!(a as any).is_boosted && (b as any).is_boosted) return 1;
      return 0;
    });

    const final = sorted.slice(0, count);

    if (final.length === 0) {
      throw new Error('No quality artworks found');
    }

    console.log(`Returning ${final.length} fresh curated artworks`);
    return final;

  } catch (error) {
    if (!isAbortError(error)) console.error('API fetch failed:', error);
    throw error;
  }
};

/*
  Graphic-design shelf (Design lens).

  The fine-art door above keeps only public-domain works, which threw
  away 93% of AIC's posters and every piece classified "graphic design"
  (Piet Zwart, Sutnar, Dan Friedman, Irma Boom, the TASS windows,
  Kauffer's Underground posters). AIC serves in-copyright images at up
  to 843px — the size its docs tie to the museum field's fair-use
  guidelines — so this shelf admits them, capped at that size by the
  adapter. Public-domain works still get the 1686 detail stage.

  Threads are Elasticsearch filters sent via GET ?params= (a POST body
  would trigger a CORS preflight AIC's edge rejects). Each load picks
  two threads by weight and reads a random page, so the shelf doesn't
  replay its first page every visit.
*/
type EsClause = Record<string, unknown>;

interface DesignThread {
  label: string;
  weight: number;
  must: EsClause[];
}

const term = (field: string, value: string): EsClause => ({ term: { [field]: value } });

const DESIGN_THREADS: DesignThread[] = [
  { label: 'graphic design', weight: 3, must: [term('classification_titles.keyword', 'graphic design')] },
  { label: 'poster', weight: 3, must: [term('classification_titles.keyword', 'poster')] },
  {
    label: 'design book',
    weight: 1,
    must: [
      term('classification_titles.keyword', 'book'),
      term('department_title.keyword', 'Architecture and Design'),
    ],
  },
  { label: 'magazine', weight: 0.5, must: [term('classification_titles.keyword', 'Magazine')] },
];

const HAS_IMAGE: EsClause = { exists: { field: 'image_id' } };
const DESIGN_FIELDS = `${ARTWORK_FIELDS},artist_title`;

/** Per-session cache of each thread's size, so random pages stay in range. */
const threadTotals = new Map<string, number>();

const designSearch = async (
  params: Record<string, unknown>,
  limit: number,
  page: number,
  signal?: AbortSignal,
): Promise<{ total: number; data: ArtworkData[] }> => {
  const qs = new URLSearchParams({
    params: JSON.stringify(params),
    limit: String(limit),
    page: String(page),
    fields: DESIGN_FIELDS,
  });
  const response = await fetch(`${BASE_URL}/artworks/search?${qs}`, {
    signal: combineSignals(10000, signal),
  });
  if (!response.ok) throw new Error(`AIC design search returned ${response.status}`);
  const json = await response.json();
  return { total: json.pagination?.total ?? 0, data: (json.data || []) as ArtworkData[] };
};

/** Pick `n` threads without replacement, weighted. */
const pickThreads = (n: number): DesignThread[] => {
  const pool = [...DESIGN_THREADS];
  const picked: DesignThread[] = [];
  while (picked.length < n && pool.length > 0) {
    const sum = pool.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * sum;
    const i = pool.findIndex((t) => (r -= t.weight) <= 0);
    picked.push(...pool.splice(i === -1 ? pool.length - 1 : i, 1));
  }
  return picked;
};

const isDesignQuality = (item: ArtworkData): boolean =>
  typeof item.image_id === 'string' && item.image_id.length >= 8 && !!item.title;

export const fetchAicDesignWorks = async (
  count: number = 8,
  signal?: AbortSignal,
): Promise<ArtworkData[]> => {
  const threads = pickThreads(2);
  // Over-fetch: AIC pages cluster by accession, so one page can be five
  // works by one designer. The per-maker cap below thins that out.
  const perThread = Math.max(count * 3, 24);

  const pages = await Promise.all(
    threads.map(async (thread) => {
      const params = { query: { bool: { must: [...thread.must, HAS_IMAGE] } } };
      try {
        let total = threadTotals.get(thread.label);
        if (total === undefined) {
          total = (await designSearch(params, 0, 1, signal)).total;
          threadTotals.set(thread.label, total);
        }
        const lastPage = Math.max(1, Math.floor(total / perThread));
        const page = 1 + Math.floor(Math.random() * lastPage);
        return (await designSearch(params, perThread, page, signal)).data;
      } catch (err) {
        if (isAbortError(err)) throw err;
        console.warn(`AIC design thread "${thread.label}" failed:`, err);
        return [] as ArtworkData[];
      }
    }),
  );

  const seen = new Set<number>();
  const perMaker = new Map<string, number>();
  const works = shuffle(pages.flat()).filter((w) => {
    if (seen.has(w.id) || !isDesignQuality(w)) return false;
    seen.add(w.id);
    const maker = w.artist_title?.toLowerCase();
    if (maker && maker !== 'unknown artist') {
      const n = perMaker.get(maker) ?? 0;
      if (n >= 2) return false;
      perMaker.set(maker, n + 1);
    }
    return true;
  });

  if (works.length === 0) {
    signal?.throwIfAborted();
    throw new Error('No AIC design works found');
  }
  return works.slice(0, count);
};

/** Lateral threads (maker, year) scoped to the graphic-design shelves. */
export const searchAicDesignByTag = async (
  tag: string,
  count: number = 12,
): Promise<ArtworkData[]> => {
  const params = {
    q: tag,
    query: {
      bool: {
        must: [HAS_IMAGE],
        should: DESIGN_THREADS.map((t) => ({ bool: { must: t.must } })),
        minimum_should_match: 1,
      },
    },
  };
  try {
    const { data } = await designSearch(params, count, 1);
    return data.filter(isDesignQuality);
  } catch (err) {
    console.error('AIC design tag search failed:', err);
    return [];
  }
};

/**
 * Search Art Institute collection by tag/keyword
 * Uses bulk fetching for reliability
 */
export const searchArtworksByTag = async (
  tag: string,
  count: number = 32
): Promise<ArtworkData[]> => {
  try {
    console.log(`Searching Art Institute for tag: "${tag}" (need ${count} results)`);

    // Search with extra limit to ensure enough quality results after filtering
    const searchResponse = await fetch(
      `${BASE_URL}/artworks/search?q=${encodeURIComponent(tag)}&limit=${count * 3}&fields=id`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!searchResponse.ok) {
      console.warn(`Search API returned ${searchResponse.status}`);
      return [];
    }

    const searchData = await searchResponse.json();
    const artworkIds: number[] = searchData.data.map((item: any) => item.id);

    if (artworkIds.length === 0) {
      console.log(`No results found for "${tag}"`);
      return [];
    }

    console.log(`Found ${artworkIds.length} potential artworks, fetching details in bulk...`);

    // Fetch in bulk batches
    const batchSize = 40;
    const artworks: ArtworkData[] = [];

    for (let i = 0; i < artworkIds.length && artworks.length < count * 2; i += batchSize) {
      const batchIds = artworkIds.slice(i, i + batchSize);
      const batchResults = await fetchArtworksByIds(batchIds);
      artworks.push(...batchResults);
    }

    // Quality filtering
    const filtered = artworks.filter((item: ArtworkData) => {
      if (!isQualityArtwork(item)) return false;

      // Reduce prints slightly for variety
      const classification = item.classification_titles?.join(' ').toLowerCase() || '';
      if (classification.includes('print-multiple') && !classification.includes('painting')) {
        return Math.random() > 0.7;
      }

      return true;
    });

    console.log(`After quality filtering: ${filtered.length} artworks`);

    // Prioritize boosted artworks and vibrant images
    const sorted = filtered.sort((a, b) => {
      if ((a as any).is_boosted && !(b as any).is_boosted) return -1;
      if (!(a as any).is_boosted && (b as any).is_boosted) return 1;
      return (b.color?.s || 0) - (a.color?.s || 0);
    });

    const final = sorted.slice(0, count);
    console.log(`Returning ${final.length} curated artworks for tag "${tag}"`);

    return final;
  } catch (error) {
    console.error('Tag search failed:', error);
    return [];
  }
};
