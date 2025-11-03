/**
 * Art Institute of Chicago API
 * Better CORS support, no API key needed
 * https://api.artic.edu/docs/
 */

export interface ArtworkData {
  id: number;
  title: string;
  artist_display: string;
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
}

const BASE_URL = 'https://api.artic.edu/api/v1';
const IMAGE_BASE_URL = 'https://www.artic.edu/iiif/2';

/**
 * Get image URL from image_id
 */
export const getImageUrl = (imageId: string, size: number = 843): string => {
  return `${IMAGE_BASE_URL}/${imageId}/full/${size},/0/default.jpg`;
};

/**
 * Validate that an image URL actually loads
 * Returns true if image loads successfully, false otherwise
 */
const validateImageUrl = async (url: string, timeout: number = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = ''; // Cancel loading
      resolve(false);
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };

    img.src = url;
  });
};

/**
 * Quick search queries that return quality artworks
 * Mix of movements, subjects, and styles for diversity
 */
const QUICK_SEARCHES = [
  'painting', 'landscape', 'portrait', 'modern', 'color',
  'flowers', 'water', 'city', 'people', 'nature',
];

/**
 * Fetch diverse curated artworks from Art Institute of Chicago
 * SEARCH-BASED: Query specific terms to find good artworks
 * FAST: Quick searches with relaxed filters
 * DIVERSE: Multiple search terms ensure variety
 * RELIABLE: Gets full 32 artworks
 */
export const fetchRandomArtworks = async (count: number = 32): Promise<ArtworkData[]> => {
  try {
    console.log(`🎨 Fetching ${count} artworks from Art Institute...`);

    const allArtworks: ArtworkData[] = [];

    // Pick 4 random search terms for variety
    const shuffledSearches = [...QUICK_SEARCHES].sort(() => Math.random() - 0.5).slice(0, 4);
    const perSearch = Math.ceil(count / shuffledSearches.length) + 2;

    // Search in parallel for speed
    const searchPromises = shuffledSearches.map(async (term) => {
      try {
        const response = await fetch(
          `${BASE_URL}/artworks/search?q=${encodeURIComponent(term)}&limit=${perSearch * 3}&fields=id`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (!response.ok) return [];

        const searchData = await response.json();
        const ids = searchData.data.map((item: any) => item.id).slice(0, perSearch);

        // Fetch details for these artworks
        const detailPromises = ids.map(async (id: number) => {
          try {
            const detailResponse = await fetch(
              `${BASE_URL}/artworks/${id}?fields=id,title,artist_display,date_display,image_id,is_public_domain,description,short_description,medium_display,dimensions,credit_line,style_titles,classification_titles,subject_titles,theme_titles,color`,
              { signal: AbortSignal.timeout(4000) }
            );
            if (detailResponse.ok) {
              const data = await detailResponse.json();
              return data.data;
            }
          } catch {
            return null;
          }
          return null;
        });

        const details = await Promise.all(detailPromises);
        return details.filter((d): d is ArtworkData => d !== null);
      } catch {
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    searchResults.forEach(artworks => allArtworks.push(...artworks));

    console.log(`📦 Fetched ${allArtworks.length} artworks from ${shuffledSearches.length} searches`);

    // RELAXED filtering - just basic quality checks
    const filtered = allArtworks.filter((item: ArtworkData) => {
      // Must have image_id and be public domain
      if (!item.image_id || !item.is_public_domain) return false;

      // Valid image ID
      if (typeof item.image_id !== 'string' || item.image_id.length < 10) return false;

      // Must have title and artist
      if (!item.title || !item.artist_display) return false;

      // Accept paintings, sculptures, photos, AND prints (more variety)
      const classifications = item.classification_titles || [];
      const hasArt = classifications.some(c => {
        const lower = c.toLowerCase();
        return lower.includes('painting') ||
               lower.includes('sculpture') ||
               lower.includes('photograph') ||
               lower.includes('drawing');
      });

      if (!hasArt) return false;

      // Very relaxed color filter - accept most works
      if (item.color && item.color.s < 5) return false;

      return true;
    });

    // Shuffle and take requested count
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    console.log(`✅ Loaded ${selected.length} diverse artworks from Art Institute`);

    return selected;
  } catch (error) {
    console.error('❌ Art Institute API failed:', error);
    return [];
  }
};

/**
 * Search Art Institute collection by tag/keyword
 * Returns up to 'count' artworks matching the search term
 * FAST version - no image validation for speed
 * Used for tag-based filtering
 */
export const searchArtworksByTag = async (
  tag: string,
  count: number = 32
): Promise<ArtworkData[]> => {
  try {
    console.log(`🔍 Searching Art Institute for tag: "${tag}" (need ${count} results)`);

    // Search with more aggressive limit to get enough results quickly
    const searchResponse = await fetch(
      `${BASE_URL}/artworks/search?q=${encodeURIComponent(tag)}&limit=${count * 3}&fields=id,title,artist_display,date_display,image_id,is_public_domain,description,short_description,medium_display,dimensions,credit_line,style_titles,classification_titles,subject_titles,theme_titles,color`,
      { signal: AbortSignal.timeout(10000) } // 10 second timeout
    );

    if (!searchResponse.ok) {
      console.warn(`Search API returned ${searchResponse.status}`);
      return [];
    }

    const searchData = await searchResponse.json();
    const artworkIds = searchData.data.map((item: any) => item.id);

    if (artworkIds.length === 0) {
      console.log(`No results found for "${tag}"`);
      return [];
    }

    console.log(`📦 Found ${artworkIds.length} potential artworks, fetching details...`);

    // Fetch full artwork details FAST - no image validation
    const artworks: ArtworkData[] = [];

    // Use larger batches and parallel requests for speed
    const batchSize = 30;
    const maxBatches = Math.ceil(count * 2 / batchSize); // Only fetch enough for our needs

    for (let batchIndex = 0; batchIndex < maxBatches && artworks.length < count * 1.5; batchIndex++) {
      const start = batchIndex * batchSize;
      const batchIds = artworkIds.slice(start, start + batchSize);

      if (batchIds.length === 0) break;

      const detailsPromises = batchIds.map(async (id: number) => {
        try {
          const response = await fetch(
            `${BASE_URL}/artworks/${id}?fields=id,title,artist_display,date_display,image_id,is_public_domain,description,short_description,medium_display,dimensions,credit_line,style_titles,classification_titles,subject_titles,theme_titles,color`,
            { signal: AbortSignal.timeout(5000) } // 5 second timeout per request
          );
          if (response.ok) {
            const data = await response.json();
            return data.data;
          }
        } catch (error) {
          // Timeout or error - skip this artwork
          return null;
        }
        return null;
      });

      const batchResults = await Promise.all(detailsPromises);
      artworks.push(...batchResults.filter((a): a is ArtworkData => a !== null));

      // No delay - we want speed!
    }

    // Filter for valid artworks with images (but don't validate image URLs)
    const validArtworks = artworks.filter((item: ArtworkData) => {
      if (!item.image_id || !item.is_public_domain) return false;
      if (typeof item.image_id !== 'string' || item.image_id.length < 10) return false;
      if (!item.title || !item.artist_display) return false; // Removed date_display requirement
      return true;
    });

    console.log(`✅ Found ${validArtworks.length} valid artworks for tag "${tag}" in ${((Date.now() - Date.now()) / 1000).toFixed(1)}s`);

    return validArtworks.slice(0, count);
  } catch (error) {
    console.error('❌ Tag search failed:', error);
    return [];
  }
};
