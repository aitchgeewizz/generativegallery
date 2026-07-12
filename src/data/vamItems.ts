import { PortfolioItem, ShapeType } from '../types';
import {
  fetchRandomVamObjects,
  searchVamObjectsByTag,
  getVamImageUrl,
  getVamThumbnailUrl,
  VamObjectBundle,
  VamObjectRecord,
} from '../services/vamApi';

const shapes: ShapeType[] = ['box', 'sphere', 'torus', 'cone', 'cylinder', 'octahedron'];

// Print-room palette — inks and papers rather than screens
const vamColors = [
  '#B0413E', '#1F3A5F', '#C9A227', // poster inks
  '#2E4A3D', '#7A3B69', '#D46A36', // wallpaper grounds
  '#1C1C1C', '#EFE6D5', '#6E7F80', // letterpress black, stock, slate
];

/**
 * Generate grid layout positions (8 per row)
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
    positions.push({
      x: (i % itemsPerRow) * (itemWidth + gap),
      y: Math.floor(i / itemsPerRow) * (itemHeight + gap),
    });
  }

  if (centered) {
    const rows = Math.ceil(count / itemsPerRow);
    const cols = Math.min(count, itemsPerRow);
    const totalWidth = cols * itemWidth + (cols - 1) * gap;
    const totalHeight = rows * itemHeight + (rows - 1) * gap;

    return positions.map((pos) => ({
      x: pos.x - totalWidth / 2,
      y: pos.y - totalHeight / 2,
    }));
  }

  return positions;
};

/** "Height 95 cm, Width 57 cm" from the structured dimensions array. */
const formatVamDimensions = (full: VamObjectRecord | null): string | undefined => {
  if (!full) return undefined;

  const parts = (full.dimensions ?? [])
    .filter((d) => d.dimension && d.value)
    .map((d) => `${d.dimension} ${d.value}${d.unit ? ` ${d.unit}` : ''}`);

  if (parts.length > 0) return parts.join(', ');
  return full.dimensionsNote || undefined;
};

/**
 * Convert a V&A search-hit + full-record bundle to a PortfolioItem.
 * Brief fields carry the tile when the detail fetch failed (full: null).
 */
const convertVamToPortfolioItem = (
  bundle: VamObjectBundle,
  index: number,
  positions: Array<{ x: number; y: number }>
): PortfolioItem => {
  const { brief, full } = bundle;
  const imageUrl = getVamImageUrl(bundle);
  const thumbnailUrl = getVamThumbnailUrl(bundle);

  // Makers: named people first, then organisations (studios, printers).
  // The V&A files "Unknown" as a placeholder authority record — skip it
  // so the wall label and maker thread only carry real names.
  const rawMakers = [
    ...(full?.artistMakerPerson ?? []),
    ...(full?.artistMakerPeople ?? []),
    ...(full?.artistMakerOrganisations ?? []),
  ];
  const participants = rawMakers
    .map((m) => ({ name: m.name?.text || '', role: m.association?.text || 'maker' }))
    .filter((p) => p.name && p.name.toLowerCase() !== 'unknown');

  const briefMakerName = brief._primaryMaker?.name?.trim();
  const primaryMaker =
    participants[0]?.name ||
    (briefMakerName && briefMakerName.toLowerCase() !== 'unknown' ? briefMakerName : '') ||
    'Unknown maker';

  const title = full?.titles?.[0]?.title || brief._primaryTitle || brief.objectType || 'Untitled';
  const date = full?.productionDates?.[0]?.date?.text || brief._primaryDate || '';
  const place = full?.placesOfOrigin?.[0]?.place?.text || brief._primaryPlace;
  const styleTitles = (full?.styles ?? []).map((s) => s.text || '').filter(Boolean);

  return {
    id: index,
    x: positions[index].x,
    y: positions[index].y,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    color: vamColors[Math.floor(Math.random() * vamColors.length)],
    title,
    description: `${primaryMaker}${date ? ` (${date})` : ''}`,
    imageUrl: imageUrl || undefined,
    thumbnailUrl: thumbnailUrl || undefined,
    collectionSource: 'Victoria and Albert Museum, London',
    url: `https://collections.vam.ac.uk/item/${brief.systemNumber}`,

    // Rich catalogue metadata (from the hydrated full record)
    shortDescription: full?.summaryDescription || full?.briefDescription,
    labelText: full?.physicalDescription,
    medium: full?.materialsAndTechniques,
    dimensions: formatVamDimensions(full),
    creditLine: full?.creditLine,
    provenance: full?.objectHistory || undefined,

    // Threads: place of origin reads as culture-context, styles as
    // art-history threads (both feed the tag extractor).
    culture: place,
    styleTitles: styleTitles.length > 0 ? styleTitles : undefined,

    // Classification
    objectType: full?.objectType || brief.objectType,
    accessionNumber: brief.accessionNumber || full?.accessionNumber,

    participants: participants.length > 0 ? participants : undefined,

    // V&A images are free for non-commercial use, but records carry no
    // machine-readable per-object license — 'unknown' is the honest value.
    copyrightStatus: 'unknown' as const,
  };
};

/**
 * Generate V&A items for the wall.
 *
 * If the API returns fewer items than requested, that is the truth — we
 * return what came back and App.tsx compensates from the other sources.
 */
export const generateVamItems = async (count: number = 24): Promise<PortfolioItem[]> => {
  try {
    console.log(`🎨 Generating ${count} V&A items…`);

    const bundles = await fetchRandomVamObjects(count);

    if (bundles.length === 0) {
      console.warn('⚠️ No objects received from V&A API');
      return [];
    }

    const withImages = bundles.filter((b) => getVamImageUrl(b) !== null);
    const positions = generateGridPositions(withImages.length);
    const items = withImages.map((b, i) => convertVamToPortfolioItem(b, i, positions));

    console.log(`✅ Generated ${items.length} V&A items`);
    return items;
  } catch (error) {
    console.error('❌ Failed to generate V&A items:', error);
    return [];
  }
};

/**
 * Search the V&A by tag — hits the API's general `q=` search.
 * Returns a centered grid of matching items.
 */
export const searchVamItemsByTag = async (
  tag: string,
  count: number = 24
): Promise<PortfolioItem[]> => {
  try {
    console.log(`🔍 Searching V&A for tag: "${tag}"`);

    const bundles = await searchVamObjectsByTag(tag, count);

    if (bundles.length === 0) {
      console.log(`No V&A results for "${tag}"`);
      return [];
    }

    const withImages = bundles.filter((b) => getVamImageUrl(b) !== null);
    const positions = generateGridPositions(withImages.length, true);
    const items = withImages.map((b, i) => convertVamToPortfolioItem(b, i, positions));

    console.log(`✅ Found ${items.length} V&A items for "${tag}"`);
    return items;
  } catch (error) {
    console.error('❌ V&A tag search failed:', error);
    return [];
  }
};
