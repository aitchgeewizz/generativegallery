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

const ARTWORK_FIELDS = 'id,title,artist_display,date_display,image_id,is_public_domain,description,short_description,medium_display,dimensions,credit_line,style_titles,classification_titles,subject_titles,theme_titles,color,is_boosted';

/**
 * Get image URL from image_id
 */
export const getImageUrl = (imageId: string, size: number = 843): string => {
  return `${IMAGE_BASE_URL}/${imageId}/full/${size},/0/default.jpg`;
};

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
const fetchArtworksByIds = async (ids: number[]): Promise<ArtworkData[]> => {
  if (ids.length === 0) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/artworks?ids=${ids.join(',')}&fields=${ARTWORK_FIELDS}&limit=${ids.length}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.data || []) as ArtworkData[];
  } catch (err) {
    console.warn('Batch fetch failed:', err);
    return [];
  }
};

/**
 * Fetch artworks using batch API calls for reliability.
 * Picks multiple random themes, fetches IDs, then bulk-loads details
 * in 2-3 requests total instead of 64+ individual ones.
 */
export const fetchRandomArtworks = async (count: number = 32): Promise<ArtworkData[]> => {
  try {
    console.log(`🎨 Fetching ${count} fresh artworks from Art Institute API...`);

    // Pick 3 random themes for variety
    const shuffledThemes = [...CURATED_THEMES].sort(() => Math.random() - 0.5);
    const selectedThemes = shuffledThemes.slice(0, 3);
    console.log(`🎯 Themes: ${selectedThemes.join(', ')}`);

    // Search all themes in parallel to get IDs
    const searchResults = await Promise.allSettled(
      selectedThemes.map(theme =>
        fetch(
          `${BASE_URL}/artworks/search?q=${encodeURIComponent(theme)}&limit=80&fields=id`,
          { signal: AbortSignal.timeout(10000) }
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
      throw new Error('No artworks found from any theme');
    }

    // Shuffle and take extra for filtering
    const allIds = [...idSet].sort(() => Math.random() - 0.5);
    const idsToFetch = allIds.slice(0, count * 3);

    console.log(`📦 Found ${idSet.size} unique IDs, fetching ${idsToFetch.length} details in bulk...`);

    // Fetch details in bulk batches (40 per request instead of 1 per request)
    const batchSize = 40;
    const artworks: ArtworkData[] = [];

    for (let i = 0; i < idsToFetch.length; i += batchSize) {
      const batchIds = idsToFetch.slice(i, i + batchSize);
      const batchResults = await fetchArtworksByIds(batchIds);
      artworks.push(...batchResults);

      const qualityCount = artworks.filter(isQualityArtwork).length;
      if (qualityCount >= count) {
        console.log(`✅ Got enough quality artworks (${qualityCount})`);
        break;
      }
    }

    console.log(`📊 Fetched ${artworks.length} artworks total`);

    const filtered = artworks.filter(isQualityArtwork);
    console.log(`✅ After filtering: ${filtered.length} quality artworks`);

    // Sort by quality — prioritize paintings/sculptures, then boosted, then vibrant
    const classificationScore = (item: ArtworkData): number => {
      const cls = item.classification_titles?.join(' ').toLowerCase() || '';
      if (cls.includes('painting')) return 3;
      if (cls.includes('sculpture')) return 2;
      if (cls.includes('photograph')) return 1;
      if (cls.includes('print') || cls.includes('drawing') || cls.includes('textile')) return -1;
      return 0;
    };

    const sorted = filtered.sort((a, b) => {
      // Paintings/sculptures first
      const clsDiff = classificationScore(b) - classificationScore(a);
      if (clsDiff !== 0) return clsDiff;
      // Then boosted
      if ((a as any).is_boosted && !(b as any).is_boosted) return -1;
      if (!(a as any).is_boosted && (b as any).is_boosted) return 1;
      // Then saturation
      return (b.color?.s || 0) - (a.color?.s || 0);
    });

    const final = sorted.slice(0, count);

    if (final.length === 0) {
      throw new Error('No quality artworks found');
    }

    console.log(`✨ Returning ${final.length} fresh curated artworks`);
    return final;

  } catch (error) {
    console.error('❌ API fetch failed:', error);
    throw error;
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
    console.log(`🔍 Searching Art Institute for tag: "${tag}" (need ${count} results)`);

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

    console.log(`📦 Found ${artworkIds.length} potential artworks, fetching details in bulk...`);

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

    console.log(`✅ After quality filtering: ${filtered.length} artworks`);

    // Prioritize boosted artworks and vibrant images
    const sorted = filtered.sort((a, b) => {
      if ((a as any).is_boosted && !(b as any).is_boosted) return -1;
      if (!(a as any).is_boosted && (b as any).is_boosted) return 1;
      return (b.color?.s || 0) - (a.color?.s || 0);
    });

    const final = sorted.slice(0, count);
    console.log(`✨ Returning ${final.length} curated artworks for tag "${tag}"`);

    return final;
  } catch (error) {
    console.error('❌ Tag search failed:', error);
    return [];
  }
};
