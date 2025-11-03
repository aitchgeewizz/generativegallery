/**
 * Cleveland Museum of Art Open Access API
 * NO API key required, CC0 license, CDN-hosted images
 * https://openaccess-api.clevelandart.org/
 */

export interface ClevelandArtwork {
  id: number;
  title: string;
  tombstone: string;
  creation_date: string;
  creators: Array<{
    description: string;
    name_in_original_language?: string;
    role?: string;
  }>;
  culture?: string[];
  technique?: string;
  department?: string;
  type?: string;
  measurements?: string;
  creditline?: string;
  images?: {
    web?: {
      url: string;
      width: number;
      height: number;
      filename: string;
    };
    print?: {
      url: string;
      width: number;
      height: number;
      filename: string;
    };
    full?: {
      url: string;
      width: number;
      height: number;
      filename: string;
    };
  };
  description?: string;
  wall_description?: string;
  url?: string;
}

const BASE_URL = 'https://openaccess-api.clevelandart.org/api';

/**
 * Fetch random artworks from Cleveland Museum of Art
 * Features:
 * - NO API key required
 * - CDN-hosted images (extremely reliable)
 * - CC0 license (completely free to use)
 * - Up to 1000 results per request
 * - Clean, simple JSON responses
 */
export const fetchClevelandArtworks = async (count: number = 32): Promise<ClevelandArtwork[]> => {
  try {
    console.log(`🎨 Fetching ${count} artworks from Cleveland Museum of Art...`);

    // Cleveland API supports up to 1000 results per request
    // We'll fetch extra to ensure we get enough with images
    const fetchCount = Math.min(Math.ceil(count * 2), 1000);

    // Random skip to get different artworks each time
    // Cleveland has 37,000+ artworks with images
    const randomSkip = Math.floor(Math.random() * 30000);

    const response = await fetch(
      `${BASE_URL}/artworks/?has_image=1&limit=${fetchCount}&skip=${randomSkip}`
    );

    if (!response.ok) {
      console.warn(`Cleveland Museum API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      console.warn('Unexpected response format from Cleveland Museum API');
      return [];
    }

    // Filter for high-quality artworks with images
    const artworks = data.data.filter((item: ClevelandArtwork) => {
      // Must have images object with at least web resolution
      if (!item.images || !item.images.web || !item.images.web.url) {
        return false;
      }

      // Must have a title
      if (!item.title || item.title.trim() === '') {
        return false;
      }

      // Must have creator information
      if (!item.creators || item.creators.length === 0) {
        return false;
      }

      // Must have creation date
      if (!item.creation_date) {
        return false;
      }

      // Prioritize certain departments for better visual results
      const goodDepartments = [
        'European Painting and Sculpture',
        'American Painting and Sculpture',
        'Contemporary Art',
        'Modern European Painting and Sculpture',
        'Japanese and Korean Art',
        'Chinese Art',
        'Indian and Southeast Asian Art',
        'Photography',
      ];

      // If it has a department, prefer works from visual art departments
      if (item.department && !goodDepartments.some(dept =>
        item.department?.toLowerCase().includes(dept.toLowerCase())
      )) {
        // Still allow, but deprioritize (we'll sort later)
        return true;
      }

      return true;
    });

    console.log(`✅ Found ${artworks.length} artworks with images from Cleveland Museum`);

    // Shuffle and return requested count
    const shuffled = artworks.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    console.log(`📦 Returning ${selected.length} curated artworks`);

    return selected;
  } catch (error) {
    console.error('❌ Cleveland Museum API failed:', error);
    return [];
  }
};

/**
 * Get the best available image URL for an artwork
 * Returns web size (900px) by default for performance
 */
export const getClevelandImageUrl = (artwork: ClevelandArtwork, size: 'web' | 'print' | 'full' = 'web'): string | null => {
  if (!artwork.images) return null;

  // Try requested size first, then fall back to smaller sizes
  if (size === 'full' && artwork.images.full?.url) {
    return artwork.images.full.url;
  }
  if ((size === 'full' || size === 'print') && artwork.images.print?.url) {
    return artwork.images.print.url;
  }
  if (artwork.images.web?.url) {
    return artwork.images.web.url;
  }

  return null;
};

/**
 * Get artist name from artwork
 */
export const getClevelandArtist = (artwork: ClevelandArtwork): string => {
  if (!artwork.creators || artwork.creators.length === 0) {
    return 'Unknown Artist';
  }

  const primaryCreator = artwork.creators[0];

  // Use name in original language if available, otherwise use description
  return primaryCreator.name_in_original_language || primaryCreator.description || 'Unknown Artist';
};

/**
 * Format artwork display information
 */
export const formatClevelandArtwork = (artwork: ClevelandArtwork): string => {
  const artist = getClevelandArtist(artwork);
  const date = artwork.creation_date || 'Date unknown';

  return `${artist} (${date})`;
};
