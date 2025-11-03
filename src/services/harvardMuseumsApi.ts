/**
 * Harvard Art Museums API
 * 250,000+ objects across Fogg, Busch-Reisinger, Arthur M. Sackler Museums
 * API Docs: https://github.com/harvardartmuseums/api-docs
 * Rate Limit: 2500 requests/day
 */

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

/**
 * Get IIIF image URL at specified size
 * Harvard uses IIIF (International Image Interoperability Framework)
 * Format: {baseuri}/full/{size},/0/default.jpg
 */
export const getHarvardImageUrl = (artwork: HarvardArtObject, size: number = 843): string | null => {
  // Try primary image URL first
  if (artwork.primaryimageurl) {
    return artwork.primaryimageurl;
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

/**
 * Fetch random artworks from Harvard Art Museums
 * Filters for quality content with images
 */
export const fetchHarvardArtworks = async (count: number = 32): Promise<HarvardArtObject[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Harvard Art Museums API key not found in environment variables');
    console.warn('📝 Get your key at: https://harvardartmuseums.org/collections/api');
    return [];
  }

  try {
    console.log(`🎨 Fetching ${count} artworks from Harvard Art Museums...`);

    const artworks: HarvardArtObject[] = [];
    const maxAttempts = 5;
    let attempts = 0;

    // Harvard API pagination works differently - we'll fetch from different pages
    while (artworks.length < count && attempts < maxAttempts) {
      attempts++;

      // Random page (they have thousands of pages)
      const randomPage = Math.floor(Math.random() * 500) + 1;

      // Fetch with filters
      const response = await fetch(
        `${BASE_URL}/object?apikey=${API_KEY}&size=100&page=${randomPage}&hasimage=1&verificationlevel=4`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        console.warn(`Attempt ${attempts}: API returned ${response.status}`);
        if (response.status === 429) {
          console.warn('⚠️ Rate limit reached (2500/day). Try again tomorrow.');
          break;
        }
        continue;
      }

      const data = await response.json();

      // Filter for high-quality artworks
      const qualityArtworks = data.records?.filter((item: HarvardArtObject) => {
        // Must have image
        if (!item.primaryimageurl && (!item.images || item.images.length === 0)) {
          return false;
        }

        // Must have title
        if (!item.title || item.title.toLowerCase().includes('untitled')) {
          return false;
        }

        // Must have artist/people
        if (!item.people || item.people.length === 0) {
          return false;
        }

        // Prefer paintings, sculptures, photographs
        const classification = item.classification?.toLowerCase() || '';
        const hasInterestingType =
          classification.includes('painting') ||
          classification.includes('photograph') ||
          classification.includes('sculpture') ||
          classification.includes('print') ||
          classification.includes('drawing');

        return hasInterestingType || true;
      }) || [];

      artworks.push(...qualityArtworks);
      console.log(`📦 Attempt ${attempts}: Found ${qualityArtworks.length} artworks (total: ${artworks.length})`);
    }

    // Shuffle and take requested count
    const shuffled = artworks.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    console.log(`✅ Successfully loaded ${selected.length} Harvard artworks`);

    return selected;
  } catch (error) {
    console.error('❌ Harvard Art Museums API failed:', error);
    return [];
  }
};

/**
 * Search Harvard collection by keyword/tag
 * Used for tag-based filtering
 */
export const searchHarvardByTag = async (
  tag: string,
  count: number = 32
): Promise<HarvardArtObject[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Harvard Art Museums API key not found');
    return [];
  }

  try {
    console.log(`🔍 Searching Harvard for tag: "${tag}"`);

    // Search across multiple fields
    const searchFields = ['title', 'technique', 'medium', 'culture', 'period'];
    const query = searchFields.map(field => `${field}:${tag}`).join(' OR ');

    const response = await fetch(
      `${BASE_URL}/object?apikey=${API_KEY}&q=${encodeURIComponent(tag)}&size=${count * 2}&hasimage=1`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.warn(`Search API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Filter for quality
    const artworks = data.records?.filter((item: HarvardArtObject) => {
      return (item.primaryimageurl || (item.images && item.images.length > 0)) &&
             item.title &&
             item.people &&
             item.people.length > 0;
    }) || [];

    console.log(`✅ Found ${artworks.length} Harvard artworks for "${tag}"`);

    return artworks.slice(0, count);
  } catch (error) {
    console.error('❌ Harvard search failed:', error);
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
    console.error('❌ Failed to fetch Harvard object details:', error);
    return null;
  }
};
