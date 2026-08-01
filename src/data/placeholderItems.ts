import { PortfolioItem } from '../types';
import {
  fetchRandomArtworks,
  searchArtworksByTag,
  getImageUrl,
  AIC_TILE_SIZE,
  AIC_DETAIL_SIZE,
  AIC_FALLBACK_SIZE,
} from '../services/artInstituteApi';



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
 * The canvas wraps a finite curated set so you come back around to the
 * same pieces — like circling a small gallery room. 6 wide x 4 tall =
 * 24 slots is the active layout for v1. Bumped up from 12 (which read
 * as sparse) but still finite — never an endless Pinterest scroll.
 */
export const getGridDimensions = () => {
  const itemsPerRow = 6;
  const itemsPerCol = 4;
  const itemWidth = 200;
  const itemHeight = 200;
  const gap = 80;

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
export const generateArtworkItems = async (count: number = 32, signal?: AbortSignal): Promise<PortfolioItem[]> => {
  const positions = generateGridPositions(count);

  try {
    console.log(`Requesting ${count} artworks from Art Institute API...`);

    // Fetch from Art Institute of Chicago API (with caching)
    const artworks = await fetchRandomArtworks(count, signal);

    if (!artworks || artworks.length === 0) {
      throw new Error('API returned no artworks');
    }

    console.log(`Received ${artworks.length} artworks from Art Institute of Chicago`);

    // Drop anything without a real image_id so we never construct a
    // broken IIIF URL like .../undefined/full/843,/0/default.jpg
    const withImages = artworks.filter(a =>
      typeof a.image_id === 'string' && a.image_id.length > 0,
    );
    if (withImages.length < artworks.length) {
      console.log(`Filtered to ${withImages.length} with valid image_id`);
    }

    // Convert API artworks to items
    const items = withImages.map((artwork, i) => {
      return {
        id: i,
        x: positions[i].x,
        y: positions[i].y,
        title: artwork.title,
        description: artwork.artist_display,
        imageUrl: getImageUrl(artwork.image_id, AIC_DETAIL_SIZE),
        thumbnailUrl: getImageUrl(artwork.image_id, AIC_TILE_SIZE),
        fallbackUrl: getImageUrl(artwork.image_id, AIC_FALLBACK_SIZE),
        lqip: artwork.thumbnail?.lqip,
        imageWidth: artwork.thumbnail?.width,
        imageHeight: artwork.thumbnail?.height,
        collectionSource: 'Art Institute of Chicago',
        url: `https://www.artic.edu/artworks/${artwork.id}`,
        date: artwork.date_display,
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

    console.log(`Successfully created ${items.length} portfolio items`);
    return items;

  } catch (error) {
    console.error('Failed to generate artwork items:', error);
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
    console.log(`Searching Art collection for tag: "${tag}"`);

    // Search API for items matching tag
    const artworks = await searchArtworksByTag(tag, count);

    console.log(`Found ${artworks.length} artworks for tag "${tag}"`);

    // Generate positions AFTER we know how many items we have
    // This prevents gaps when we have fewer than 32 items
    const actualCount = artworks.length;
    const positions = generateGridPositions(actualCount, true); // CENTERED grid with actual count

    // Convert to PortfolioItems
    items = artworks.map((artwork, i) => ({
      id: i,
      x: positions[i].x,
      y: positions[i].y,
      title: artwork.title,
      description: artwork.artist_display,
      imageUrl: getImageUrl(artwork.image_id, AIC_DETAIL_SIZE),
      thumbnailUrl: getImageUrl(artwork.image_id, AIC_TILE_SIZE),
      fallbackUrl: getImageUrl(artwork.image_id, AIC_FALLBACK_SIZE),
      lqip: artwork.thumbnail?.lqip,
      imageWidth: artwork.thumbnail?.width,
      imageHeight: artwork.thumbnail?.height,
      collectionSource: 'Art Institute of Chicago',
      date: artwork.date_display,
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

    console.log(`Returning ${items.length} centered art items for tag "${tag}"`);
    return items;
  } catch (error) {
    console.error('Art tag search failed:', error);
    return [];
  }
};
