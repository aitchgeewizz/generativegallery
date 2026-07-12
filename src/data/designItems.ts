import { PortfolioItem, ShapeType } from '../types';
import {
  fetchRandomDesignObjects,
  getDesignImageUrl,
  getDesignThumbnailUrl,
  getDesignImageDimensions,
  searchDesignObjectsByTag,
} from '../services/cooperHewittApi';

const shapes: ShapeType[] = ['box', 'sphere', 'torus', 'cone', 'cylinder', 'octahedron'];

// Modern design color palette - inspired by Bauhaus, Swiss Design, and Contemporary
const designColors = [
  '#FF0000', '#0000FF', '#FFFF00', // Primary Bauhaus colors
  '#000000', '#FFFFFF', '#808080', // Monochrome
  '#FF6B35', '#004E89', '#F7B267', // Contemporary
  '#00D1FF', '#FF006E', '#FFBE0B', // Vibrant modern
  '#2EC4B6', '#E71D36', '#FF9F1C', // Bold modern
];

/**
 * Generate grid layout positions (8x4 grid = 32 items)
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
 * Generate design items from Cooper Hewitt Smithsonian Design Museum.
 *
 * If the API returns fewer items than requested, that is the truth — we
 * return what came back. We do not pad with hand-coded stubs. Per
 * SPEC.md: never lie about data. App.tsx compensates by pulling more
 * from the other sources.
 */
export const generateDesignItems = async (count: number = 32): Promise<PortfolioItem[]> => {
  const positions = generateGridPositions(count);
  let items: PortfolioItem[] = [];

  try {
    // Fetch from Cooper Hewitt Design Museum collection
    const designObjects = await fetchRandomDesignObjects(count);

    console.log(`📊 Received ${designObjects.length} design objects from Cooper Hewitt API`);

    // Only keep objects with valid image URLs
    const withImages = designObjects.filter(d => getDesignImageUrl(d) !== null);
    console.log(`🖼️ ${withImages.length} of ${designObjects.length} have usable images`);

    // Convert API design objects to items
    items = withImages.slice(0, count).map((design, i) => {
      const imageUrl = getDesignImageUrl(design);

      // Get primary designer/creator with role display name
      const primaryCreator = design.participants?.find(p =>
        p.role_name?.toLowerCase().includes('designer') ||
        p.role_name?.toLowerCase().includes('artist')
      ) || design.participants?.[0];

      const creator = primaryCreator?.person_name || 'Unknown Designer';

      return {
        id: i,
        x: positions[i].x,
        y: positions[i].y,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        color: designColors[Math.floor(Math.random() * designColors.length)],
        title: design.title || 'Untitled',
        description: `${creator}${design.date ? ` (${design.date})` : ''}`,
        imageUrl: imageUrl || undefined,
        thumbnailUrl: getDesignThumbnailUrl(design) || undefined,
        imageWidth: getDesignImageDimensions(design).width,
        imageHeight: getDesignImageDimensions(design).height,
        collectionSource: 'Cooper Hewitt Smithsonian Design Museum',

        // Rich metadata from Cooper Hewitt
        medium: design.medium,
        dimensions: design.dimensions,
        url: design.url,

        // Additional context
        shortDescription: design.description,
        creditLine: design.creditline,

        // Provenance and attribution
        provenance: design.provenance,
        markings: design.markings,
        signed: design.signed,
        inscribed: design.inscribed,

        // Gallery context
        galleryText: design.gallery_text,
        labelText: design.label_text,
        justification: design.justification,

        // Classification
        objectType: design.type,
        accessionNumber: design.accession_number,
        yearAcquired: design.year_acquired,
        onDisplay: design.on_display,

        // All participants (designers, printers, donors, etc.)
        participants: design.participants?.map(p => ({
          name: p.person_name || '',
          role: p.role_display_name || p.role_name || '',
          date: p.person_date,
          url: p.person_url,
        })),

        copyrightStatus: design.has_no_known_copyright === '1' ? 'no_known_copyright' as const : 'unknown' as const,
      };
    });

    console.log(`✅ Returning ${items.length} design items from Cooper Hewitt`);
    return items;
  } catch (error) {
    console.error('❌ Cooper Hewitt API failed:', error);
    // Return empty — App.tsx will compensate by pulling more from the
    // other sources. We do not pad with broken hand-coded stubs.
    return [];
  }
};

/**
 * Search Cooper Hewitt Design collection by tag
 * Returns centered grid of items matching the tag
 * Always tries to return 'count' items (default 32)
 */
export const searchDesignItemsByTag = async (tag: string, count: number = 32): Promise<PortfolioItem[]> => {
  let items: PortfolioItem[] = [];

  try {
    console.log(`🔍 Searching Design collection for tag: "${tag}"`);

    // Search API for items matching tag
    const designObjects = await searchDesignObjectsByTag(tag, count);

    console.log(`📊 Found ${designObjects.length} design objects for tag "${tag}"`);

    // Only keep objects with valid image URLs
    const withImages = designObjects.filter(d => getDesignImageUrl(d) !== null);

    // Generate positions AFTER we know how many items we have
    // This prevents gaps when we have fewer than 32 items
    const actualCount = withImages.length;
    const positions = generateGridPositions(actualCount, true); // CENTERED grid with actual count

    // Convert to PortfolioItems
    items = withImages.map((design, i) => {
      const imageUrl = getDesignImageUrl(design);
      const primaryCreator = design.participants?.find(p =>
        p.role_name?.toLowerCase().includes('designer') ||
        p.role_name?.toLowerCase().includes('artist')
      ) || design.participants?.[0];

      const creator = primaryCreator?.person_name || 'Unknown Designer';

      return {
        id: i,
        x: positions[i].x,
        y: positions[i].y,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        color: designColors[Math.floor(Math.random() * designColors.length)],
        title: design.title || 'Untitled',
        description: `${creator}${design.date ? ` (${design.date})` : ''}`,
        imageUrl: imageUrl || undefined,
        thumbnailUrl: getDesignThumbnailUrl(design) || undefined,
        imageWidth: getDesignImageDimensions(design).width,
        imageHeight: getDesignImageDimensions(design).height,
        collectionSource: 'Cooper Hewitt Smithsonian Design Museum',
        medium: design.medium,
        dimensions: design.dimensions,
        url: design.url,
        shortDescription: design.description,
        creditLine: design.creditline,
        provenance: design.provenance,
        markings: design.markings,
        signed: design.signed,
        inscribed: design.inscribed,
        galleryText: design.gallery_text,
        labelText: design.label_text,
        justification: design.justification,
        objectType: design.type,
        accessionNumber: design.accession_number,
        yearAcquired: design.year_acquired,
        onDisplay: design.on_display,
        participants: design.participants?.map(p => ({
          name: p.person_name || '',
          role: p.role_display_name || p.role_name || '',
          date: p.person_date,
          url: p.person_url,
        })),
        copyrightStatus: design.has_no_known_copyright === '1' ? 'no_known_copyright' as const : 'unknown' as const,
      };
    });

    console.log(`✅ Returning ${items.length} centered design items for tag "${tag}"`);
    return items;
  } catch (error) {
    console.error('❌ Design tag search failed:', error);
    return [];
  }
};
