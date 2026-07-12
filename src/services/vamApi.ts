/**
 * Victoria and Albert Museum API (v2)
 * Posters, wallpapers, textile designs, bookbindings, typography, printed ephemera
 * https://developers.vam.ac.uk/guide/v2/welcome.html
 *
 * No API key required. Images are served over IIIF from framemark.vam.ac.uk
 * (CORS-open on both hosts). Usage guideline is under 3,000 calls/day at
 * ~1 req/sec — the handful-per-refresh model stays far below that, and the
 * detail hydration below batches its requests instead of bursting.
 */

import { shuffle } from '../utils/shuffle';

const BASE_URL = 'https://api.vam.ac.uk/v2';
const IIIF_BASE = 'https://framemark.vam.ac.uk/collections';

/** Brief record returned by /objects/search */
export interface VamSearchRecord {
  systemNumber: string;
  accessionNumber?: string;
  objectType?: string;
  _primaryTitle?: string;
  _primaryMaker?: { name?: string; association?: string };
  _primaryImageId?: string | null;
  _primaryDate?: string;
  _primaryPlace?: string;
  _currentLocation?: { displayName?: string; onDisplay?: boolean };
  _images?: {
    _primary_thumbnail?: string;
    _iiif_image_base_url?: string;
    imageResolution?: string;
  };
}

interface VamNamedEntity {
  text?: string;
  id?: string;
}

interface VamMakerRecord {
  name?: VamNamedEntity;
  association?: VamNamedEntity;
  note?: string;
}

/** Full catalogue record returned by /museumobject/{systemNumber} */
export interface VamObjectRecord {
  systemNumber: string;
  accessionNumber?: string;
  objectType?: string;
  titles?: Array<{ title?: string; type?: string }>;
  artistMakerPerson?: VamMakerRecord[];
  artistMakerPeople?: VamMakerRecord[];
  artistMakerOrganisations?: VamMakerRecord[];
  materialsAndTechniques?: string;
  materials?: VamNamedEntity[];
  techniques?: VamNamedEntity[];
  styles?: VamNamedEntity[];
  placesOfOrigin?: Array<{ place?: VamNamedEntity; association?: VamNamedEntity }>;
  productionDates?: Array<{
    date?: { text?: string; earliest?: string | null; latest?: string | null };
  }>;
  creditLine?: string;
  briefDescription?: string;
  summaryDescription?: string;
  physicalDescription?: string;
  objectHistory?: string;
  dimensions?: Array<{ dimension?: string; value?: string; unit?: string }>;
  dimensionsNote?: string;
  images?: string[];
  accessionYear?: number;
}

/**
 * A search hit paired with its full catalogue record. `full` is null when
 * the detail fetch failed — the brief fields still render a valid tile.
 */
export interface VamObjectBundle {
  brief: VamSearchRecord;
  full: VamObjectRecord | null;
}

interface VamSearchResponse {
  info?: { record_count?: number; pages?: number; page?: number };
  records?: VamSearchRecord[];
}

const imageIdOf = (bundle: VamObjectBundle): string | null =>
  bundle.brief._primaryImageId || bundle.full?.images?.[0] || null;

/**
 * Detail-size IIIF URL (fits within 1600×1600). Low-resolution source
 * images simply come back at their native maximum, so this is safe for
 * every record.
 */
export const getVamImageUrl = (bundle: VamObjectBundle): string | null => {
  const id = imageIdOf(bundle);
  return id ? `${IIIF_BASE}/${id}/full/!1600,1600/0/default.jpg` : null;
};

/** Tile-size IIIF URL (fits within 400×400) for the wall. */
export const getVamThumbnailUrl = (bundle: VamObjectBundle): string | null => {
  const id = imageIdOf(bundle);
  return id ? `${IIIF_BASE}/${id}/full/!400,400/0/default.jpg` : null;
};

interface VamSearchTerm {
  label: string;
  params: { q?: string; q_object_type?: string };
  maxPage: number;
}

/**
 * Distinct design-artifact threads across the V&A's imaged holdings.
 * Each entry uses whichever parameter returns that thread cleanly —
 * `q_object_type` where the object type is an exact single token,
 * plain `q` where the type name is multi-word (the v2 API tokenizes
 * multi-word `q_object_type` values fuzzily: "type specimen" matches
 * glass and biology specimens, so the typography thread goes through
 * `q=typography` and jobbing printing through `q=printed ephemera`).
 *
 * Imaged record counts measured July 2026:
 *
 *   poster            ~18,000    wallpaper          ~2,700
 *   textile design    ~40,000    bookbinding        ~1,000
 *   typography         ~1,200    printed ephemera   ~4,700
 *   trade card           ~780
 *
 * `maxPage` is a conservative cap below each term's real page count at
 * 50/page, because the API answers HTTP 500 for pages past the end. If
 * a term's holdings ever shrink under its cap, that request fails and
 * returns nothing for the term — the other terms cover the handful.
 */
const ALL_TERMS: VamSearchTerm[] = [
  { label: 'poster', params: { q_object_type: 'poster' }, maxPage: 280 },
  { label: 'wallpaper', params: { q_object_type: 'wallpaper' }, maxPage: 44 },
  { label: 'textile design', params: { q: 'textile design' }, maxPage: 640 },
  { label: 'bookbinding', params: { q: 'bookbinding' }, maxPage: 16 },
  { label: 'typography', params: { q: 'typography' }, maxPage: 20 },
  { label: 'printed ephemera', params: { q: 'printed ephemera' }, maxPage: 75 },
  { label: 'trade card', params: { q: 'trade card' }, maxPage: 12 },
];
const TERMS_PER_FETCH = 4;
const PAGE_SIZE = 50;

/**
 * Search the V&A collection. `images_exist=true` is always applied, and
 * records without a primary image id are dropped so every result can
 * render a real tile.
 */
const searchVamRecords = async (
  params: { q?: string; q_object_type?: string },
  page: number = 1,
  pageSize: number = PAGE_SIZE
): Promise<VamSearchRecord[]> => {
  try {
    const query = new URLSearchParams({
      ...(params.q ? { q: params.q } : {}),
      ...(params.q_object_type ? { q_object_type: params.q_object_type } : {}),
      images_exist: 'true',
      page: String(page),
      page_size: String(pageSize),
    });

    const response = await fetch(`${BASE_URL}/objects/search?${query.toString()}`);
    if (!response.ok) return [];

    const data: VamSearchResponse = await response.json();
    return (data.records || []).filter((r) => r._primaryImageId);
  } catch (error) {
    console.error('Failed to search V&A records:', error);
    return [];
  }
};

/** Fetch one full catalogue record; null on any failure. */
const fetchVamObjectRecord = async (systemNumber: string): Promise<VamObjectRecord | null> => {
  try {
    const response = await fetch(`${BASE_URL}/museumobject/${encodeURIComponent(systemNumber)}`);
    if (!response.ok) return null;

    const data: { record?: VamObjectRecord } = await response.json();
    return data.record ?? null;
  } catch {
    return null;
  }
};

/**
 * Pair each search hit with its full catalogue record (maker credits,
 * materials, credit line, summary). Fetched in small batches rather than
 * one burst out of respect for the V&A's ~1 req/sec guideline. A failed
 * detail fetch leaves `full: null`; the brief fields still make a tile.
 */
const hydrateVamRecords = async (records: VamSearchRecord[]): Promise<VamObjectBundle[]> => {
  const bundles: VamObjectBundle[] = [];
  const BATCH = 8;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const fulls = await Promise.all(batch.map((r) => fetchVamObjectRecord(r.systemNumber)));
    batch.forEach((brief, j) => bundles.push({ brief, full: fulls[j] }));

    if (i + BATCH < records.length) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return bundles;
};

/**
 * Fetch random design objects from the V&A.
 * Rotates a shuffled subset of the term pool with a random page per term
 * (the v2 API's `random` parameter does not work, so random page offsets
 * do the sampling), then dedupes, shuffles, slices, and hydrates only the
 * chosen slice with full catalogue records.
 */
export const fetchRandomVamObjects = async (count: number = 24): Promise<VamObjectBundle[]> => {
  try {
    console.log(`🎨 Fetching ${count} objects from the V&A…`);

    const distinctTerms = shuffle(ALL_TERMS).slice(0, TERMS_PER_FETCH);

    const pages = await Promise.all(
      distinctTerms.map((term) => {
        const randomPage = Math.floor(Math.random() * term.maxPage) + 1;
        return searchVamRecords(term.params, randomPage);
      })
    );

    const seen = new Set<string>();
    const pool: VamSearchRecord[] = [];
    for (const page of pages) {
      for (const record of page) {
        if (seen.has(record.systemNumber)) continue;
        seen.add(record.systemNumber);
        pool.push(record);
      }
    }

    const chosen = shuffle(pool).slice(0, count);
    const bundles = await hydrateVamRecords(chosen);

    console.log(`✅ Loaded ${bundles.length} V&A objects (pool of ${pool.length})`);
    return bundles;
  } catch (error) {
    console.error('❌ V&A API failed:', error);
    return [];
  }
};

/**
 * Search the V&A by tag/keyword via the general `q=` parameter.
 * Walks pages from 1 in relevance order (unlike the random-page browse
 * fetch) and hydrates the final slice.
 */
export const searchVamObjectsByTag = async (
  tag: string,
  count: number = 24
): Promise<VamObjectBundle[]> => {
  try {
    console.log(`🔍 Searching the V&A for tag: "${tag}" (need ${count} results)`);

    const seen = new Set<string>();
    const results: VamSearchRecord[] = [];

    const maxPages = 3;
    for (let page = 1; page <= maxPages && results.length < count; page++) {
      const records = await searchVamRecords({ q: tag }, page);
      for (const record of records) {
        if (seen.has(record.systemNumber)) continue;
        seen.add(record.systemNumber);
        results.push(record);
      }

      // A thin page means we've reached the end of the result set —
      // asking for the next page would 500.
      if (records.length < PAGE_SIZE) break;
      if (page < maxPages && results.length < count) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const bundles = await hydrateVamRecords(results.slice(0, count));
    console.log(`✅ Found ${bundles.length} V&A objects for tag "${tag}"`);
    return bundles;
  } catch (error) {
    console.error('❌ V&A tag search failed:', error);
    return [];
  }
};
