import { PortfolioItem, ShapeType } from '../types';
import { fetchRandomArtworks, searchArtworksByTag, getImageUrl } from '../services/artInstituteApi';

const shapes: ShapeType[] = ['box', 'sphere', 'torus', 'cone', 'cylinder', 'octahedron'];

// Enhanced vibrant color palette inspired by Cash App and modern design
const colors = [
  '#00D632', '#00FF87', '#00A3FF', '#0066FF', '#8B5CF6', '#A855F7',
  '#EC4899', '#FF006E', '#F59E0B', '#FF5C00', '#EF4444', '#FF0040',
  '#10B981', '#00F5A0', '#14B8A6', '#06B6D4', '#6366F1', '#4F46E5',
  '#F97316', '#FBBF24',
];

/**
 * Generate grid layout positions
 * Using 8x4 grid = 32 items for seamless looping
 * @param centered - If true, centers the grid around (0, 0)
 */
const generateGridPositions = (count: number, centered: boolean = false) => {
  if (count === 0) return [];

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

  // Center the grid if requested
  if (centered) {
    const rows = Math.ceil(count / itemsPerRow);
    const cols = Math.min(count, itemsPerRow);

    // Calculate based on actual grid dimensions
    const totalWidth = cols * itemWidth + (cols - 1) * gap;
    const totalHeight = rows * itemHeight + (rows - 1) * gap;
    const offsetX = -totalWidth / 2;
    const offsetY = -totalHeight / 2;

    return positions.map(pos => ({
      x: pos.x + offsetX,
      y: pos.y + offsetY,
    }));
  }

  return positions;
};

/**
 * Get grid dimensions for the canvas loop tile.
 *
 * Per SPEC.md, the canvas wraps a *small* set so you come back around
 * to the same pieces, like circling a small gallery room. 4 wide x 3
 * tall = 12 slots is the active layout for v1.
 */
export const getGridDimensions = () => {
  const itemsPerRow = 4;
  const itemsPerCol = 3;
  const itemWidth = 200;
  const itemHeight = 200;
  const gap = 100;

  return {
    width: itemsPerRow * (itemWidth + gap),
    height: itemsPerCol * (itemHeight + gap),
    itemsPerRow,
    itemsPerCol,
  };
};

/**
 * Generates items with curated artworks from Art Institute of Chicago API
 * RELIABLE: Uses caching and proper error handling
 * NO FALLBACK to broken local images - API must succeed
 */
export const generateArtworkItems = async (count: number = 32): Promise<PortfolioItem[]> => {
  const positions = generateGridPositions(count);

  try {
    console.log(`🎨 Requesting ${count} artworks from Art Institute API...`);

    // Fetch from Art Institute of Chicago API (with caching)
    const artworks = await fetchRandomArtworks(count);

    if (!artworks || artworks.length === 0) {
      throw new Error('API returned no artworks');
    }

    console.log(`✅ Received ${artworks.length} artworks from Art Institute of Chicago`);

    // Convert API artworks to items
    const items = artworks.map((artwork, i) => {
      const imageUrl = getImageUrl(artwork.image_id, 843);

      return {
        id: i,
        x: positions[i].x,
        y: positions[i].y,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        title: artwork.title,
        description: artwork.artist_display,
        imageUrl: imageUrl,
        collectionSource: 'Art Institute of Chicago',
        url: `https://www.artic.edu/artworks/${artwork.id}`,
        // Rich artwork metadata
        shortDescription: artwork.short_description || artwork.description,
        medium: artwork.medium_display,
        dimensions: artwork.dimensions,
        creditLine: artwork.credit_line,
        styleTitles: artwork.style_titles,
        classificationTitles: artwork.classification_titles,
        subjectTitles: artwork.subject_titles,
        themeTitles: artwork.theme_titles,
        copyrightStatus: 'public_domain' as const,
      };
    });

    console.log(`✨ Successfully created ${items.length} portfolio items`);
    return items;

  } catch (error) {
    console.error('❌ Failed to generate artwork items:', error);
    // Return empty array - let the app handle the error state
    // NO FALLBACK to broken images
    throw error;
  }
};

/**
 * Search Art Institute collection by tag
 * Returns centered grid of items matching the tag
 * Always tries to return 'count' items (default 32)
 */
export const searchArtworkItemsByTag = async (tag: string, count: number = 32): Promise<PortfolioItem[]> => {
  let items: PortfolioItem[] = [];

  try {
    console.log(`🔍 Searching Art collection for tag: "${tag}"`);

    // Search API for items matching tag
    const artworks = await searchArtworksByTag(tag, count);

    console.log(`📊 Found ${artworks.length} artworks for tag "${tag}"`);

    // Generate positions AFTER we know how many items we have
    // This prevents gaps when we have fewer than 32 items
    const actualCount = artworks.length;
    const positions = generateGridPositions(actualCount, true); // CENTERED grid with actual count

    // Convert to PortfolioItems
    items = artworks.map((artwork, i) => ({
      id: i,
      x: positions[i].x,
      y: positions[i].y,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      title: artwork.title,
      description: artwork.artist_display,
      imageUrl: getImageUrl(artwork.image_id, 843),
      collectionSource: 'Art Institute of Chicago',
      shortDescription: artwork.short_description || artwork.description,
      medium: artwork.medium_display,
      dimensions: artwork.dimensions,
      creditLine: artwork.credit_line,
      styleTitles: artwork.style_titles,
      classificationTitles: artwork.classification_titles,
      subjectTitles: artwork.subject_titles,
      themeTitles: artwork.theme_titles,
      url: `https://www.artic.edu/artworks/${artwork.id}`,
      copyrightStatus: 'public_domain' as const,
    }));

    console.log(`✅ Returning ${items.length} centered art items for tag "${tag}"`);
    return items;
  } catch (error) {
    console.error('❌ Art tag search failed:', error);
    return [];
  }
};
