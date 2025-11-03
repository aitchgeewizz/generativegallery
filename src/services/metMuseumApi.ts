/**
 * Met Museum API Service
 * https://metmuseum.github.io/
 *
 * Free, no API key required
 * 400,000+ public domain artworks
 */

export interface MetArtwork {
  objectID: number;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  primaryImage: string;
  primaryImageSmall: string;
  department: string;
  isPublicDomain: boolean;
}

// Use Vite proxy in development to bypass CORS
const BASE_URL = import.meta.env.DEV
  ? '/api/met'  // Use proxy in development
  : 'https://collectionapi.metmuseum.org/public/collection/v1';  // Direct in production

/**
 * Pre-fetched list of 200 highlight artwork IDs from Met Museum
 * These are curated by the museum as noteworthy pieces
 * Using pre-fetched IDs to avoid CORS issues in development
 */
const HIGHLIGHT_ARTWORK_IDS = [
  488660,466105,453351,451268,456949,453183,451023,453336,451725,910555,
  544502,733808,250939,435641,436573,437769,436440,437900,438814,892627,
  247009,437326,437971,435853,437455,437609,436323,437891,435851,436244,
  436851,437447,439933,247008,451270,74813,656430,50486,437329,255275,
  437826,437549,435728,438754,544442,436964,436840,438605,437175,437879,
  436658,437423,436918,437869,591855,436106,436792,437056,435802,679844,
  438815,436575,634108,436603,437532,436838,435621,435809,40055,459144,
  488486,483246,488978,488319,482746,436944,436516,436545,459119,435962,
  912363,488732,437654,435702,459007,493210,486014,890800,435882,437658,
  437127,489307,436095,435908,437344,484829,459052,848826,436504,435739,
  436121,909908,701989,440723,435888,458994,437835,897034,436101,458978,
  437926,437133,459088,437854,438820,437261,436002,490012,499035,459087,
  812918,435984,459142,459082,459016,437097,437490,437487,626692,438817,
  489994,437053,459093,459080,492697,632918,438816,904106,437430,459136,
  437131,437397,458967,435844,435817,435896,437394,895946,436532,436622,
  459046,458977,438818,815112,437881,488221,435876,676458,875741,435826,
  436528,459139,436253,458961,458971,817303,459131,437153,440393,436535,
  435839,437790,785431,895906,769369,459090,437749,459106,438822,459084,
  435868,436839,437299,459083,505722,489972,488694,459182,438112,437160,
  438821,436896,459072,482413,438417,489625,458956,441769,827660,250945,
];

/**
 * Fetch artwork details from Met Museum API
 */
export const fetchArtwork = async (objectId: number): Promise<MetArtwork | null> => {
  try {
    const response = await fetch(`${BASE_URL}/objects/${objectId}`, {
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch artwork ${objectId}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Only return if it has a primary image and is public domain
    if (!data.primaryImage || !data.isPublicDomain) {
      return null;
    }

    return data;
  } catch (error) {
    console.warn(`Failed to fetch artwork ${objectId}:`, error);
    return null;
  }
};

/**
 * Fetch multiple artworks with rate limiting
 * Fetches in small batches with delays to avoid 403 errors
 */
export const fetchArtworks = async (objectIds: number[]): Promise<MetArtwork[]> => {
  const artworks: MetArtwork[] = [];
  const batchSize = 5; // Fetch 5 at a time
  const delayMs = 200; // 200ms delay between batches

  for (let i = 0; i < objectIds.length; i += batchSize) {
    const batch = objectIds.slice(i, i + batchSize);
    const promises = batch.map(id => fetchArtwork(id));
    const results = await Promise.allSettled(promises);

    const batchArtworks = results
      .filter((result): result is PromiseFulfilledResult<MetArtwork> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    artworks.push(...batchArtworks);

    // Add delay between batches (except for the last batch)
    if (i + batchSize < objectIds.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return artworks;
};

/**
 * Get a random selection of highlight artworks from Met Museum
 * Uses pre-fetched highlight IDs to avoid CORS issues
 */
export const getRandomCuratedArtworks = async (count: number = 32): Promise<MetArtwork[]> => {
  console.log(`📚 Using ${HIGHLIGHT_ARTWORK_IDS.length} pre-loaded highlight artworks`);

  // Shuffle and select random highlights
  const shuffled = [...HIGHLIGHT_ARTWORK_IDS].sort(() => Math.random() - 0.5);

  // Take 2x the needed count to account for some failures (rate limiting)
  // Reduced from 3x to avoid hitting rate limits
  const selectedIds = shuffled.slice(0, Math.min(count * 2, shuffled.length));

  console.log(`🎨 Fetching ${selectedIds.length} artworks from Met Museum (in batches to avoid rate limits)...`);

  const artworks = await fetchArtworks(selectedIds);

  console.log(`✅ Successfully loaded ${artworks.length} artworks`);

  // Return the requested count
  return artworks.slice(0, count);
};

/**
 * Search for artworks by department (fallback method)
 */
export const searchByDepartment = async (
  departmentId: number = 11, // European Paintings
  count: number = 32
): Promise<MetArtwork[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/search?departmentId=${departmentId}&hasImages=true&isPublicDomain=true&q=painting`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const objectIds = data.objectIDs?.slice(0, count * 2) || [];

    return await fetchArtworks(objectIds);
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
};
