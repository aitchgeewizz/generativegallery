/**
 * Cooper Hewitt Smithsonian Design Museum API
 * Modern design, graphic design, posters, product design
 * https://collection.cooperhewitt.org/api/
 */

import { shuffle } from '../utils/shuffle';
import { combineSignals, isAbortError } from '../utils/abort';

export interface DesignObjectData {
  id: string;
  title: string;
  title_raw?: string;
  accession_number?: string;
  url?: string;

  // Dates and periods
  date?: string;
  year_start?: number;
  year_end?: number;
  year_acquired?: string;
  decade?: string;
  period_id?: string;

  // Physical details
  medium?: string;
  dimensions?: string;
  dimensions_raw?: any;

  // Descriptions and context
  description?: string;
  justification?: string;
  gallery_text?: string;
  label_text?: string;

  // Provenance and attribution
  provenance?: string;
  creditline?: string;
  markings?: string;
  signed?: string;
  inscribed?: string;

  // Classification
  type?: string;
  type_id?: string;
  department_id?: string;
  media_id?: string;

  // Display
  on_display?: string;

  // People involved (designers, printers, etc.)
  participants?: Array<{
    person_id?: string;
    person_name?: string;
    person_date?: string;
    person_url?: string;
    role_id?: string;
    role_name?: string;
    role_display_name?: string;
    role_url?: string;
  }>;

  // Images
  images?: Array<{
    b?: { url: string; width: number; height: number; is_primary: string; image_id: string };
    z?: { url: string; width: number; height: number; is_primary: string; image_id: string };
    n?: { url: string; width: number; height: number; is_primary: string; image_id: string };
    d?: { url: string; width: number; height: number; is_primary: string; image_id: string };
    sq?: { url: string; width: number; height: number; is_primary: string; image_id: string };
  }>;

  // Copyright
  has_no_known_copyright?: string | null;
  is_loan_object?: number;
}

interface CooperHewittResponse {
  stat: string;
  object?: DesignObjectData;
  objects?: DesignObjectData[];
  total?: number;
  page?: number;
  per_page?: number;
  pages?: number;
}

const BASE_URL = 'https://api.collection.cooperhewitt.org/rest/';
const API_KEY = import.meta.env.VITE_COOPER_HEWITT_API_KEY || '';

/**
 * Get image URL from Cooper Hewitt object — largest available variant.
 * Used by the detail view for the high-resolution stage.
 */
export const getDesignImageUrl = (imageData: DesignObjectData): string | null => {
  if (!imageData.images || imageData.images.length === 0) return null;

  const image = imageData.images[0];
  // Try all available sizes from largest to smallest
  return image.b?.url || image.z?.url || image.n?.url || image.d?.url || image.sq?.url || null;
};

/**
 * Smaller variant for wall tiles: z (640) covers a 200px tile on retina;
 * b (1024, the legacy API's ceiling) stays reserved for the detail stage.
 */
export const getDesignThumbnailUrl = (imageData: DesignObjectData): string | null => {
  if (!imageData.images || imageData.images.length === 0) return null;

  const image = imageData.images[0];
  return image.z?.url || image.n?.url || image.b?.url || image.sq?.url || null;
};

/** Native dimensions of the largest available derivative, when reported. */
export const getDesignImageDimensions = (
  imageData: DesignObjectData,
): { width?: number; height?: number } => {
  const image = imageData.images?.[0];
  const largest = image?.b || image?.z || image?.n;
  return { width: largest?.width, height: largest?.height };
};

/* ────────────────────────────────────────────────────────────────
   Smithsonian Open Access fallback.

   Cooper Hewitt's legacy REST API began returning HTTP 500 on every
   request (observed Sept 2026; the collection site itself migrated
   platforms). Cooper Hewitt is a Smithsonian museum, so the same
   collection is reachable through api.si.edu (unit_code CHNDM):
   CC0 records only — a smaller pool than the legacy API served, but
   it includes the icons (Will Bradley's Chap-Book posters and kin)
   and it answers with proper CORS.

   Every legacy failure flips a sticky per-session switch so later
   calls skip straight to the Smithsonian door. If the museum ever
   revives the legacy API, its full catalogue returns automatically
   on the next visit.

   Key: free at api.data.gov (instant signup) → VITE_SMITHSONIAN_KEY.
   DEMO_KEY works unkeyed but is rate-limited to ~30 requests/hour.
   ──────────────────────────────────────────────────────────────── */
const SI_BASE_URL = 'https://api.si.edu/openaccess/api/v1.0/search';
const SI_KEY = import.meta.env.VITE_SMITHSONIAN_KEY || 'DEMO_KEY';
let legacyApiDown = false;
let warnedDemoKey = false;

/** Map a Smithsonian EDAN row onto the legacy object shape so every
 *  downstream consumer (adapters, curation buckets) works unchanged. */
const mapSiRowToDesignObject = (row: any): DesignObjectData | null => {
  const dnr = row?.content?.descriptiveNonRepeating;
  const media = dnr?.online_media?.media?.[0];
  if (!media?.content) return null;

  const ft = row?.content?.freetext ?? {};
  const first = (key: string, label?: string): string | undefined => {
    const entries = ft[key];
    if (!Array.isArray(entries)) return undefined;
    const hit = label ? entries.find((e: any) => e?.label === label) : entries[0];
    return hit?.content;
  };

  const sized = (max: number) => ({
    url: `${media.content}&max=${max}`,
    width: 0,
    height: 0,
    is_primary: '1',
    image_id: media.idsId || row.id,
  });

  const cc0 =
    dnr?.metadata_usage?.access === 'CC0' || media?.usage?.access === 'CC0';

  return {
    id: row.id,
    title: row.title || 'Untitled',
    url: dnr?.record_link,
    date: first('date'),
    medium: first('physicalDescription', 'Medium') || first('physicalDescription'),
    description: first('notes', 'Description') || first('notes'),
    creditline: first('creditLine'),
    type: first('objectType'),
    participants: Array.isArray(ft.name)
      ? ft.name.map((n: any) => ({
          person_name: String(n?.content || '').split(',')[0].trim(),
          person_date: undefined,
          role_name: n?.label,
          role_display_name: n?.label,
        }))
      : undefined,
    images: [{ b: sized(1600), z: sized(640), n: sized(320) }],
    has_no_known_copyright: cc0 ? '1' : null,
  };
};

const searchChndmObjects = async (
  searchTerm: string,
  page: number,
  perPage: number,
  signal?: AbortSignal,
): Promise<DesignObjectData[]> => {
  if (SI_KEY === 'DEMO_KEY' && !warnedDemoKey) {
    warnedDemoKey = true;
    console.warn(
      'Cooper Hewitt via Smithsonian is using DEMO_KEY (about 30 requests/hour). ' +
        'Get a free key at https://api.data.gov and set VITE_SMITHSONIAN_KEY.',
    );
  }

  const q = `unit_code:"CHNDM" AND ${searchTerm}`;
  const start = (page - 1) * perPage;
  const response = await fetch(
    `${SI_BASE_URL}?api_key=${SI_KEY}&q=${encodeURIComponent(q)}&rows=${perPage}&start=${start}`,
    { signal: combineSignals(10000, signal) },
  );
  if (!response.ok) return [];

  const data = await response.json();
  const rows = data?.response?.rows;
  if (!Array.isArray(rows)) return [];

  return rows
    .map(mapSiRowToDesignObject)
    .filter((obj): obj is DesignObjectData => obj !== null);
};

/**
 * Search Cooper Hewitt collection for design objects.
 * Legacy REST first; Smithsonian Open Access when the legacy door
 * fails (see block comment above).
 */
const searchDesignObjects = async (
  searchTerm: string,
  page: number = 1,
  perPage: number = 100,
  signal?: AbortSignal
): Promise<DesignObjectData[]> => {
  if (!legacyApiDown && API_KEY) {
    try {
      const response = await fetch(
        `${BASE_URL}?method=cooperhewitt.search.objects&access_token=${API_KEY}&query=${encodeURIComponent(
          searchTerm
        )}&has_images=1&page=${page}&per_page=${perPage}`,
        { signal: combineSignals(10000, signal) }
      );

      if (response.ok) {
        const data: CooperHewittResponse = await response.json();
        if (data.stat === 'ok' && data.objects && data.objects.length > 0) {
          return data.objects.filter((obj) => obj.images && obj.images.length > 0);
        }
        return [];
      }

      // 4xx/5xx: the legacy API is answering but broken — switch doors.
      legacyApiDown = true;
      console.warn(`Cooper Hewitt legacy API returned ${response.status}; using Smithsonian Open Access`);
    } catch (error) {
      if (isAbortError(error)) return [];
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        // A slow day is not a dead API; don't switch doors on timeouts.
        return [];
      }
      // TypeError (CORS/network): the door is gone — switch.
      legacyApiDown = true;
      console.warn('Cooper Hewitt legacy API unreachable; using Smithsonian Open Access');
    }
  }

  try {
    return await searchChndmObjects(searchTerm, page, perPage, signal);
  } catch (error) {
    if (!isAbortError(error)) console.error('Failed to search design objects:', error);
    return [];
  }
};

/**
 * Fetch random design objects from Cooper Hewitt
 * Focuses on graphic design, posters, and modern design
 * Uses random pagination to get different results each time
 */
export const fetchRandomDesignObjects = async (count: number = 32, signal?: AbortSignal): Promise<DesignObjectData[]> => {
  if (!API_KEY) {
    console.warn('Cooper Hewitt API key not found');
    console.log('Add your API key to .env file:');
    console.log('   VITE_COOPER_HEWITT_API_KEY=your_key_here');
    console.log('Get a free API key at: https://collection.cooperhewitt.org/api/');
    return [];
  }

  try {
    console.log(`Fetching ${count} design objects from Cooper Hewitt...`);

    // Cooper Hewitt exists in this project for graphic design first:
    // posters, advertising, typography, illustration, printed matter.
    // A flat term pool kept drifting the wall toward ceramics and
    // chairs (four random terms could easily contain zero graphic
    // ones), so terms live in buckets with a floor — the majority of
    // every handful is graphic material, while pattern and object
    // season the room rather than furnish it.
    const GRAPHIC_TERMS = [
      'poster', 'graphic design', 'advertisement', 'illustration',
      'typography', 'book cover', 'magazine', 'label',
    ];
    const PATTERN_TERMS = ['wallpaper', 'sidewall', 'printed textile', 'embroidery'];
    const OBJECT_TERMS = ['furniture', 'ceramic', 'glass', 'metalwork', 'jewelry'];
    const GRAPHIC_SHARE = 0.75;

    const pick = (pool: string[], n: number) => shuffle(pool).slice(0, n);
    // Front-loaded page selection. The walls Hannah loved in the early
    // builds came from pages 1–10, where Cooper Hewitt's relevance
    // ranking keeps its famous, richly catalogued works — the hero
    // pieces. The variety system later avoided those pages to stop
    // repeats, but the session seen-set now handles repetition, so
    // hero-avoidance only cost us the good stuff. Squaring the random
    // draw biases toward the front (half of draws land on pages 1–3)
    // while the tail still reaches maxPage for depth. Empty overshoots
    // retry once at the very front.
    const fetchTerm = async (term: string, maxPage = 10) => {
      const randomPage = 1 + Math.floor(Math.random() ** 2 * maxPage);
      try {
        const page = await searchDesignObjects(term, randomPage, 100, signal);
        if (page.length > 0 || randomPage <= 2) return page;
        return await searchDesignObjects(term, 1 + Math.floor(Math.random() * 2), 100, signal);
      } catch {
        return [] as DesignObjectData[];
      }
    };

    // Poster rides every fetch — in the early builds it was the first
    // term of every load and it is the reason the Design room felt like
    // graphic design. Two more graphic terms rotate behind it, plus one
    // seasoning term (pattern and object alternate by coin flip).
    const seasoningPool = Math.random() < 0.5 ? PATTERN_TERMS : OBJECT_TERMS;
    const graphicPicks = ['poster', ...pick(GRAPHIC_TERMS.filter((t) => t !== 'poster'), 2)];
    const [graphicPages, seasoningPages] = await Promise.all([
      Promise.all(graphicPicks.map((t) => fetchTerm(t))),
      Promise.all(pick(seasoningPool, 1).map((t) => fetchTerm(t, 20))),
    ]);

    const seen = new Set<string>();
    const usable = (pages: DesignObjectData[][]): DesignObjectData[] => {
      const out: DesignObjectData[] = [];
      for (const page of pages) {
        for (const obj of page) {
          if (!getDesignImageUrl(obj)) continue;
          if (seen.has(obj.id)) continue;
          seen.add(obj.id);
          out.push(obj);
        }
      }
      return out;
    };

    let graphicPool = shuffle(usable(graphicPages));
    const seasoningResults = shuffle(usable(seasoningPages));

    // Poster is the one graphic term with real depth (Cooper Hewitt's
    // poster holdings run thousands of records). If the shallow terms
    // came back thin, one rescue fetch keeps the graphic floor honest.
    const floorCheck = Math.ceil(Math.max(Math.ceil(count * 1.5), 16) * GRAPHIC_SHARE);
    if (graphicPool.length < floorCheck) {
      const rescue = await fetchTerm('poster', 20);
      graphicPool = shuffle([...graphicPool, ...usable([rescue])]);
    }

    // Fill the graphic floor first; season with pattern and object;
    // backfill from whichever pool still has works so a thin API day
    // never shrinks the handful.
    const target = Math.max(Math.ceil(count * 1.5), 16);
    const graphicFloor = Math.ceil(target * GRAPHIC_SHARE);
    const results = [
      ...graphicPool.slice(0, graphicFloor),
      ...seasoningResults.slice(0, target - Math.min(graphicPool.length, graphicFloor)),
      ...graphicPool.slice(graphicFloor),
    ].slice(0, target);

    const finalResults = shuffle(results).slice(0, count);

    console.log(
      `Loaded ${finalResults.length} Cooper Hewitt objects (${Math.min(graphicPool.length, graphicFloor)} graphic floor of ${target})`,
    );

    return finalResults;
  } catch (error) {
    console.error('Cooper Hewitt API failed:', error);
    return [];
  }
};

/**
 * Search Cooper Hewitt collection by tag/keyword
 * Returns up to 'count' objects matching the search term
 * Used for tag-based filtering
 * Tries exact match first, then broader related terms if needed
 */
export const searchDesignObjectsByTag = async (
  tag: string,
  count: number = 32
): Promise<DesignObjectData[]> => {
  if (!API_KEY) {
    console.warn('Cooper Hewitt API key not configured');
    return [];
  }

  try {
    console.log(`Searching Cooper Hewitt for tag: "${tag}" (need ${count} results)`);

    let results: DesignObjectData[] = [];

    // Try exact tag first
    const maxPages = 5;
    for (let page = 1; page <= maxPages && results.length < count; page++) {
      const objects = await searchDesignObjects(tag, page, 100);

      // Image is the only hard requirement (matches fetchRandomDesignObjects).
      const qualityObjects = objects.filter((obj) => !!getDesignImageUrl(obj));

      results.push(...qualityObjects);

      // Small delay between pages
      if (page < maxPages && results.length < count) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // If we didn't get enough results, try a broader search with related terms
    if (results.length < count / 2) {
      console.log(`Only found ${results.length} results, trying broader search...`);

      // Map common tag patterns to broader search terms
      const broaderTerms: Record<string, string[]> = {
        'lamp': ['lighting', 'light', 'illumination'],
        'telephone': ['communication', 'phone', 'device'],
        'chair': ['seating', 'furniture', 'seat'],
        'table': ['furniture', 'desk'],
        'poster': ['graphic design', 'print', 'typography'],
        'vase': ['vessel', 'ceramic', 'pottery'],
      };

      const relatedTerms = broaderTerms[tag.toLowerCase()] || [];

      for (const term of relatedTerms) {
        if (results.length >= count) break;

        const additionalObjects = await searchDesignObjects(term, 1, 50);
        const qualityObjects = additionalObjects.filter((obj) => {
          return getDesignImageUrl(obj) !== null;
        });

        results.push(...qualityObjects);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const finalResults = results.slice(0, count);
    console.log(`Found ${finalResults.length} design objects for tag "${tag}"`);

    return finalResults;
  } catch (error) {
    console.error('Tag search failed:', error);
    return [];
  }
};
