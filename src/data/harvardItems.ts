import { PortfolioItem, ShapeType } from '../types';
import {
  fetchHarvardArtworks,
  searchHarvardByTag,
  getHarvardImageUrl,
  formatHarvardArtwork,
  HarvardArtObject,
} from '../services/harvardMuseumsApi';

const shapes: ShapeType[] = ['box', 'sphere', 'torus', 'cone', 'cylinder', 'octahedron'];

// Color palette
const colors = [
  '#00D632', '#00FF87', '#00A3FF', '#0066FF', '#8B5CF6', '#A855F7',
  '#EC4899', '#FF006E', '#F59E0B', '#FF5C00', '#EF4444', '#FF0040',
  '#10B981', '#00F5A0', '#14B8A6', '#06B6D4', '#6366F1', '#4F46E5',
  '#F97316', '#FBBF24',
];

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
  positions: Array<{ x: number; y: number }>
): PortfolioItem => {
  const imageUrl = getHarvardImageUrl(artwork, 843);

  // Get primary artist
  const primaryArtist = artwork.people && artwork.people.length > 0
    ? artwork.people.sort((a, b) => a.displayorder - b.displayorder)[0].name
    : 'Unknown Artist';

  return {
    id: index,
    x: positions[index].x,
    y: positions[index].y,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
    title: artwork.title,
    description: formatHarvardArtwork(artwork),
    imageUrl: imageUrl || undefined,
    collectionSource: 'Harvard Art Museums',
    url: artwork.url,

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
  };
};

/**
 * Generate Harvard Art Museums items
 * Fetches 32 items from Harvard's collection
 */
export const generateHarvardItems = async (count: number = 32): Promise<PortfolioItem[]> => {
  const positions = generateGridPositions(count);

  try {
    console.log(`🎨 Generating ${count} Harvard Art Museums items...`);

    // Fetch artworks from Harvard API
    const artworks = await fetchHarvardArtworks(count);

    if (artworks.length === 0) {
      console.warn('⚠️ No artworks received from Harvard API');
      return [];
    }

    // Convert to PortfolioItems
    const items = artworks.map((artwork, i) =>
      convertHarvardToPortfolioItem(artwork, i, positions)
    );

    console.log(`✅ Generated ${items.length} Harvard items`);
    return items;
  } catch (error) {
    console.error('❌ Failed to generate Harvard items:', error);
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
    console.log(`🔍 Searching Harvard for tag: "${tag}"`);

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

    const positions = [];
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

    console.log(`✅ Found ${items.length} Harvard items for "${tag}"`);
    return items;
  } catch (error) {
    console.error('❌ Harvard tag search failed:', error);
    return [];
  }
};
