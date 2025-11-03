/**
 * Rijksmuseum API (Amsterdam)
 * 800,000+ objects, Dutch Golden Age paintings
 * API Docs: https://data.rijksmuseum.nl/
 */

export interface RijksmuseumArtObject {
  id: string;
  objectNumber: string;
  title: string;
  principalOrFirstMaker: string;
  longTitle: string;
  webImage: {
    url: string;
    width: number;
    height: number;
  } | null;
  headerImage: {
    url: string;
    width: number;
    height: number;
  };
  productionPlaces: string[];
  dating: {
    presentingDate: string;
    sortingDate: number;
    period: number;
  };
  classification: {
    iconClassDescription: string[];
  };
  objectTypes: string[];
  materials: string[];
  techniques: string[];
  colors: Array<{
    percentage: number;
    hex: string;
  }>;
  description?: string;
  plaqueDescriptionEnglish?: string;
  physicalMedium?: string;
  dimensions?: Array<{
    unit: string;
    type: string;
    value: string;
  }>;
}

const BASE_URL = 'https://www.rijksmuseum.nl/api/en/collection';
const API_KEY = import.meta.env.VITE_RIJKSMUSEUM_KEY;

/**
 * Get image URL with specified width
 * Rijksmuseum provides images at different sizes via URL parameters
 */
export const getRijksImageUrl = (webImageUrl: string | null, size: 'small' | 'medium' | 'large' = 'medium'): string | null => {
  if (!webImageUrl) return null;

  // Rijksmuseum images come in full quality
  // We can resize them by replacing parameters or using them as-is
  // For now, return the full URL
  return webImageUrl;
};

/**
 * Fetch random artworks from Rijksmuseum
 * Filters for objects with images and interesting metadata
 */
export const fetchRijksmuseumArtworks = async (count: number = 32): Promise<RijksmuseumArtObject[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Rijksmuseum API key not found in environment variables');
    return [];
  }

  try {
    console.log(`🎨 Fetching ${count} artworks from Rijksmuseum...`);

    const artworks: RijksmuseumArtObject[] = [];
    const maxAttempts = 5;
    let attempts = 0;

    while (artworks.length < count && attempts < maxAttempts) {
      attempts++;

      // Random page between 1-200 (they have thousands of pages)
      const randomPage = Math.floor(Math.random() * 200) + 1;

      // Fetch with filters for quality content
      const response = await fetch(
        `${BASE_URL}?key=${API_KEY}&format=json&ps=100&p=${randomPage}&imgonly=true&toppieces=false`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        console.warn(`Attempt ${attempts}: API returned ${response.status}`);
        continue;
      }

      const data = await response.json();

      // Filter for high-quality, interesting artworks
      const qualityArtworks = data.artObjects?.filter((item: any) => {
        // Must have image
        if (!item.webImage || !item.webImage.url) return false;

        // Must have title and artist
        if (!item.title || !item.principalOrFirstMaker) return false;

        // Skip generic titles
        if (item.title.toLowerCase().includes('unknown') ||
            item.title.toLowerCase().includes('untitled')) return false;

        // Prefer paintings, prints, drawings
        const hasInterestingType = item.objectTypes?.some((type: string) =>
          type.toLowerCase().includes('painting') ||
          type.toLowerCase().includes('print') ||
          type.toLowerCase().includes('drawing') ||
          type.toLowerCase().includes('photograph')
        );

        return hasInterestingType || true; // Accept all if no type info
      }) || [];

      artworks.push(...qualityArtworks);
      console.log(`📦 Attempt ${attempts}: Found ${qualityArtworks.length} artworks (total: ${artworks.length})`);
    }

    // Shuffle and take requested count
    const shuffled = artworks.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    console.log(`✅ Successfully loaded ${selected.length} Rijksmuseum artworks`);

    return selected;
  } catch (error) {
    console.error('❌ Rijksmuseum API failed:', error);
    return [];
  }
};

/**
 * Search Rijksmuseum collection by keyword/tag
 * Used for tag-based filtering
 */
export const searchRijksmuseumByTag = async (
  tag: string,
  count: number = 32
): Promise<RijksmuseumArtObject[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Rijksmuseum API key not found');
    return [];
  }

  try {
    console.log(`🔍 Searching Rijksmuseum for tag: "${tag}"`);

    // Search with the tag as query
    const response = await fetch(
      `${BASE_URL}?key=${API_KEY}&format=json&q=${encodeURIComponent(tag)}&ps=${count * 2}&imgonly=true`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.warn(`Search API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Filter for quality
    const artworks = data.artObjects?.filter((item: any) => {
      return item.webImage?.url && item.title && item.principalOrFirstMaker;
    }) || [];

    console.log(`✅ Found ${artworks.length} Rijksmuseum artworks for "${tag}"`);

    return artworks.slice(0, count);
  } catch (error) {
    console.error('❌ Rijksmuseum search failed:', error);
    return [];
  }
};

/**
 * Format artwork data for display
 */
export const formatRijksmuseumArtwork = (artwork: RijksmuseumArtObject): string => {
  const parts = [];

  if (artwork.principalOrFirstMaker) {
    parts.push(artwork.principalOrFirstMaker);
  }

  if (artwork.dating?.presentingDate) {
    parts.push(artwork.dating.presentingDate);
  }

  return parts.join(' • ');
};

/**
 * Get object details by object number
 * For when you need full details about a specific artwork
 */
export const getRijksmuseumObjectDetails = async (
  objectNumber: string
): Promise<RijksmuseumArtObject | null> => {
  if (!API_KEY) return null;

  try {
    const response = await fetch(
      `${BASE_URL}/${objectNumber}?key=${API_KEY}&format=json`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.artObject;
  } catch (error) {
    console.error('❌ Failed to fetch Rijksmuseum object details:', error);
    return null;
  }
};
