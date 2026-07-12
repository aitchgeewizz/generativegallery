/**
 * Cooper Hewitt Smithsonian Design Museum API
 * Modern design, graphic design, posters, product design
 * https://collection.cooperhewitt.org/api/
 */

import { shuffle } from '../utils/shuffle';

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
 * Get image URL from Cooper Hewitt object
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

/**
 * Search Cooper Hewitt collection for design objects
 */
const searchDesignObjects = async (
  searchTerm: string,
  page: number = 1,
  perPage: number = 100
): Promise<DesignObjectData[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Cooper Hewitt API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `${BASE_URL}?method=cooperhewitt.search.objects&access_token=${API_KEY}&query=${encodeURIComponent(
        searchTerm
      )}&has_images=1&page=${page}&per_page=${perPage}`
    );

    if (!response.ok) return [];

    const data: CooperHewittResponse = await response.json();

    if (data.stat === 'ok' && data.objects && data.objects.length > 0) {
      return data.objects.filter((obj) => obj.images && obj.images.length > 0);
    }

    return [];
  } catch (error) {
    console.error('Failed to search design objects:', error);
    return [];
  }
};

/**
 * Fetch random design objects from Cooper Hewitt
 * Focuses on graphic design, posters, and modern design
 * Uses random pagination to get different results each time
 */
export const fetchRandomDesignObjects = async (count: number = 32): Promise<DesignObjectData[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Cooper Hewitt API key not found');
    console.log('📝 Add your API key to .env file:');
    console.log('   VITE_COOPER_HEWITT_API_KEY=your_key_here');
    console.log('🔑 Get a free API key at: https://collection.cooperhewitt.org/api/');
    return [];
  }

  try {
    console.log(`🎨 Fetching ${count} design objects from Cooper Hewitt...`);

    const results: DesignObjectData[] = [];
    const seen = new Set<string>();

    // Previous approach: broad overlapping search terms ("poster", "bauhaus", "modernist", ...)
    // returned the same hero pieces repeatedly. After dedup we'd land on ~4 items
    // regardless of how many requests we made.
    //
    // New approach: fewer but more *distinct* search terms, fetched in parallel,
    // with a random page per term so each refresh surfaces a different slice of
    // the collection. Image is the only hard filter.
    const distinctTerms = ['poster', 'textile', 'wallpaper', 'ceramic', 'furniture', 'metalwork'];
    const target = Math.max(count * 2, 30);

    const pages = await Promise.all(
      distinctTerms.map(async (term) => {
        const randomPage = Math.floor(Math.random() * 10) + 1;
        try {
          return await searchDesignObjects(term, randomPage, 100);
        } catch {
          return [] as DesignObjectData[];
        }
      }),
    );

    for (const page of pages) {
      for (const obj of page) {
        if (results.length >= target) break;
        if (!getDesignImageUrl(obj)) continue;
        if (seen.has(obj.id)) continue;
        seen.add(obj.id);
        results.push(obj);
      }
      if (results.length >= target) break;
    }

    // Shuffle and limit to requested count so each load surfaces a different
    // ordering of whatever pool we built.
    const shuffled = shuffle(results);
    const finalResults = shuffled.slice(0, count);

    console.log(`✅ Successfully loaded ${finalResults.length} design objects from Cooper Hewitt (pool of ${results.length})`);

    return finalResults;
  } catch (error) {
    console.error('❌ Cooper Hewitt API failed:', error);
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
    console.warn('⚠️ Cooper Hewitt API key not configured');
    return [];
  }

  try {
    console.log(`🔍 Searching Cooper Hewitt for tag: "${tag}" (need ${count} results)`);

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
      console.log(`⚠️ Only found ${results.length} results, trying broader search...`);

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
    console.log(`✅ Found ${finalResults.length} design objects for tag "${tag}"`);

    return finalResults;
  } catch (error) {
    console.error('❌ Tag search failed:', error);
    return [];
  }
};
