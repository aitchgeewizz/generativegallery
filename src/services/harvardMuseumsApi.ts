/**
 * Harvard Art Museums API — Photography Collection
 * Focused on photographic works from the 250k+ object collection
 * API Docs: https://github.com/harvardartmuseums/api-docs
 * Rate Limit: 2500 requests/day
 */

import { shuffle } from '../utils/shuffle';

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

/**
 * Photography search themes — curated for art photography, not documentation
 */
const PHOTO_THEMES = [
  'portrait photography', 'street photography', 'landscape photography',
  'documentary photography', 'fashion photography', 'still life photography',
  'architectural photography', 'abstract photography', 'color photography',
  'gelatin silver', 'platinum print', 'daguerreotype', 'albumen',
  'chromogenic', 'pigment print', 'photogravure',
];

/**
 * Fetch photographs from Harvard Art Museums
 * Uses search-based approach to find art photography, excluding
 * X-rays, radiographs, and conservation documentation
 */
export const fetchHarvardArtworks = async (count: number = 32): Promise<HarvardArtObject[]> => {
  if (!API_KEY) {
    console.warn('Harvard Art Museums API key not found');
    return [];
  }

  try {
    console.log(`Fetching ${count} photographs from Harvard Art Museums...`);

    const artworks: HarvardArtObject[] = [];
    const maxAttempts = 5;
    let attempts = 0;

    // Pick random themes for variety
    const shuffledThemes = shuffle(PHOTO_THEMES);

    while (artworks.length < count && attempts < maxAttempts) {
      const theme = shuffledThemes[attempts % shuffledThemes.length];
      attempts++;

      const randomPage = Math.floor(Math.random() * 30) + 1;

      // Search for photography with theme keywords
      const response = await fetch(
        `${BASE_URL}/object?apikey=${API_KEY}&size=100&page=${randomPage}&hasimage=1&classification=Photographs&q=${encodeURIComponent(theme)}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        console.warn(`Attempt ${attempts}: API returned ${response.status}`);
        if (response.status === 429) {
          console.warn('Rate limit reached (2500/day).');
          break;
        }
        continue;
      }

      const data = await response.json();

      const qualityPhotos = data.records?.filter((item: HarvardArtObject) => {
        // Must have image
        if (!item.primaryimageurl && (!item.images || item.images.length === 0)) {
          return false;
        }

        // Must have title
        if (!item.title) return false;

        const titleLower = item.title.toLowerCase();

        // EXCLUDE: X-rays, radiographs, conservation documentation
        if (titleLower.includes('x-radiograph') ||
            titleLower.includes('x-ray') ||
            titleLower.includes('radiograph') ||
            titleLower.includes('infrared reflectogram') ||
            titleLower.includes('ultraviolet') ||
            titleLower.includes('raking light') ||
            titleLower.includes('conservation') ||
            titleLower.includes('detail of') ||
            titleLower.includes('verso of') ||
            titleLower.includes('frame of')) {
          return false;
        }

        // Skip untitled
        if (titleLower === 'untitled') return false;

        // Must have photographer
        if (!item.people || item.people.length === 0) {
          return false;
        }

        return true;
      }) || [];

      artworks.push(...qualityPhotos);
      console.log(`Attempt ${attempts} (${theme}): Found ${qualityPhotos.length} photos (total: ${artworks.length})`);
    }

    // Shuffle and take requested count
    const shuffled = shuffle(artworks);
    const selected = shuffled.slice(0, count);

    console.log(`Loaded ${selected.length} Harvard photographs`);

    return selected;
  } catch (error) {
    console.error('Harvard Art Museums API failed:', error);
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

    const response = await fetch(
      `${BASE_URL}/object?apikey=${API_KEY}&q=${encodeURIComponent(tag)}&size=${count * 2}&hasimage=1&classification=Photographs`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.warn(`Search API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Filter for quality — exclude documentation/conservation images
    const artworks = data.records?.filter((item: HarvardArtObject) => {
      if (!item.primaryimageurl && (!item.images || item.images.length === 0)) return false;
      if (!item.title || !item.people || item.people.length === 0) return false;

      const titleLower = item.title.toLowerCase();
      if (titleLower.includes('x-radiograph') || titleLower.includes('x-ray') ||
          titleLower.includes('radiograph') || titleLower.includes('infrared') ||
          titleLower.includes('ultraviolet') || titleLower.includes('raking light') ||
          titleLower.includes('detail of') || titleLower.includes('verso of')) {
        return false;
      }

      return true;
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
