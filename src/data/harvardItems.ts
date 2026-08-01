import { PortfolioItem } from '../types';
import {
  fetchHarvardArtworks,
  fetchHarvardDesignWorks,
  searchHarvardByTag,
  getHarvardImageUrl,
  formatHarvardArtwork,
  HarvardArtObject,
  HARVARD_TILE_SIZE,
  HARVARD_DETAIL_SIZE,
} from '../services/harvardMuseumsApi';



/**
 * Generate grid layout positions
 * Same as other generators - 8x4 grid = 32 items
 */
const generateGridPositions = (count: number) => {
  const positions = [];
  const itemsPerRow = 8;
  const itemWidth = 200;
  const itemHeight = 200;
  const gap = 100;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / itemsPerRow);
    const col = i % itemsPerRow;

    positions.push({
      x: col * (itemWidth + gap),
      y: row * (itemHeight + gap),
    });
  }

  return positions;
};

/**
 * Convert Harvard API object to PortfolioItem
 */
const convertHarvardToPortfolioItem = (
  artwork: HarvardArtObject,
  index: number,
  positions: Array<{ x: number; y: number }>,
  sourceLabel: string = 'Harvard Photography'
): PortfolioItem => {
  const imageUrl = getHarvardImageUrl(artwork, HARVARD_DETAIL_SIZE);
  const thumbnailUrl = getHarvardImageUrl(artwork, HARVARD_TILE_SIZE);
  const sourceImage = artwork.images?.[0];

  return {
    id: index,
    x: positions[index].x,
    y: positions[index].y,
    title: artwork.title,
    description: formatHarvardArtwork(artwork),
    imageUrl: imageUrl || undefined,
    thumbnailUrl: thumbnailUrl || undefined,
    imageWidth: sourceImage?.width,
    imageHeight: sourceImage?.height,
    collectionSource: sourceLabel,
    url: artwork.url,
    date: artwork.dated || artwork.century,

    // Rich metadata
    shortDescription: artwork.description,
    medium: artwork.medium,
    dimensions: artwork.dimensions,
    creditLine: artwork.creditline,

    // Convert Harvard's classification to our format
    classificationTitles: artwork.classification ? [artwork.classification] : undefined,

    // Add culture/period info
    styleTitles: [
      artwork.culture,
      artwork.period,
      artwork.century,
    ].filter(Boolean) as string[],

    // People as participants
    participants: artwork.people?.map(person => ({
      name: person.name,
      role: person.role,
    })),

    copyrightStatus: 'unknown' as const,
  };
};

/**
 * Generate Harvard Art Museums items
 * Fetches 32 items from Harvard's collection
 */
export const generateHarvardItems = async (count: number = 32, signal?: AbortSignal): Promise<PortfolioItem[]> => {
  const positions = generateGridPositions(count);

  try {
    console.log(`Generating ${count} Harvard Art Museums items...`);

    // Fetch artworks from Harvard API
    const artworks = await fetchHarvardArtworks(count, signal);

    if (artworks.length === 0) {
      console.warn('No artworks received from Harvard API');
      return [];
    }

    // Drop anything without a usable image URL so we never render a
    // broken thumbnail. Harvard's `primaryimageurl` is the canonical
    // signal; `images[].iiifbaseuri` is a fallback that still produces
    // a real URL through getHarvardImageUrl.
    const withImages = artworks.filter(a => {
      const url = getHarvardImageUrl(a, 843);
      return typeof url === 'string' && url.length > 0;
    });
    if (withImages.length < artworks.length) {
      console.log(`Harvard: filtered to ${withImages.length} with valid imagery`);
    }

    // Convert to PortfolioItems
    const items = withImages.map((artwork, i) =>
      convertHarvardToPortfolioItem(artwork, i, positions)
    );

    console.log(`Generated ${items.length} Harvard items`);
    return items;
  } catch (error) {
    console.error('Failed to generate Harvard items:', error);
    return [];
  }
};

/**
 * Search Harvard collection by tag
 * Returns up to 'count' items matching the tag
 */
export const searchHarvardItemsByTag = async (
  tag: string,
  count: number = 32
): Promise<PortfolioItem[]> => {
  try {
    console.log(`Searching Harvard for tag: "${tag}"`);

    // Search Harvard API
    const artworks = await searchHarvardByTag(tag, count);

    if (artworks.length === 0) {
      console.log(`No Harvard results for "${tag}"`);
      return [];
    }

    // Generate centered grid positions for search results
    const actualCount = artworks.length;
    const itemsPerRow = 8;
    const itemWidth = 200;
    const itemHeight = 200;
    const gap = 100;

    const rows = Math.ceil(actualCount / itemsPerRow);
    const cols = Math.min(actualCount, itemsPerRow);

    const totalWidth = cols * itemWidth + (cols - 1) * gap;
    const totalHeight = rows * itemHeight + (rows - 1) * gap;
    const offsetX = -totalWidth / 2;
    const offsetY = -totalHeight / 2;

    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < actualCount; i++) {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      positions.push({
        x: col * (itemWidth + gap) + offsetX,
        y: row * (itemHeight + gap) + offsetY,
      });
    }

    // Convert to PortfolioItems
    const items = artworks.map((artwork, i) =>
      convertHarvardToPortfolioItem(artwork, i, positions)
    );

    console.log(`Found ${items.length} Harvard items for "${tag}"`);
    return items;
  } catch (error) {
    console.error('Harvard tag search failed:', error);
    return [];
  }
};

/**
 * Busch-Reisinger / Bauhaus design thread. Feeds the mixed wall via its
 * own registry entry; the Photography pill stays pure photography.
 */
export const generateHarvardDesignItems = async (count: number = 32, signal?: AbortSignal): Promise<PortfolioItem[]> => {
  const positions = generateGridPositions(count);

  try {
    const artworks = await fetchHarvardDesignWorks(count, signal);
    if (artworks.length === 0) return [];

    const withImages = artworks.filter(a => {
      const url = getHarvardImageUrl(a, 843);
      return typeof url === 'string' && url.length > 0;
    });

    return withImages.map((artwork, i) =>
      convertHarvardToPortfolioItem(artwork, i, positions, 'Harvard Art Museums, Busch-Reisinger')
    );
  } catch (error) {
    console.error('Failed to generate Harvard design items:', error);
    return [];
  }
};

export const searchHarvardDesignItemsByTag = async (
  tag: string,
  count: number = 32
): Promise<PortfolioItem[]> => {
  try {
    // classification=null searches the whole collection, not just Photographs.
    const artworks = await searchHarvardByTag(tag, count, null);
    if (artworks.length === 0) return [];

    const positions = generateGridPositions(artworks.length);
    return artworks.map((artwork, i) =>
      convertHarvardToPortfolioItem(artwork, i, positions, 'Harvard Art Museums, Busch-Reisinger')
    );
  } catch (error) {
    console.error('Harvard design tag search failed:', error);
    return [];
  }
};
