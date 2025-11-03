/**
 * Met Museum API Service
 * Free, no API key required
 * Documentation: https://metmuseum.github.io/
 */

const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

export interface MetArtwork {
  objectID: number;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  medium: string;
  department: string;
  primaryImage: string;
  primaryImageSmall: string;
}

/**
 * Get a list of curated object IDs from the Met collection
 * These are pre-selected artworks that have public domain images
 */
export const CURATED_MET_OBJECTS = [
  436532, // Starry Night replica
  438817, // Wheat Field with Cypresses
  436535, // Cypresses
  437112, // Self-Portrait with a Straw Hat
  436121, // Irises
  436528, // Roses
  45734,  // Washington Crossing the Delaware
  11197,  // Ugolino and His Sons (sculpture)
  544252, // The Unicorn in Captivity (tapestry)
  36625,  // The Death of Socrates
  437853, // Madame X
  11267,  // Diana (sculpture)
  438821, // Bridge Over a Pond of Water Lilies
  437312, // Poppies
  438820, // Water Lilies
  436121, // Irises
  11739,  // Perseus with the Head of Medusa
  436524, // Bouquet of Flowers
  547802, // Bodhisattva
  45446,  // The Triumph of Marius
  39799,  // Portrait of a Woman
  436963, // Garden at Sainte-Adresse
  437311, // Springtime
  436526, // Vase of Flowers
  459055, // Autumn Rhythm
  488315, // Lavender Mist
  490048, // Convergence
  247943, // Dancers in Blue
  337491, // Little Dancer Aged Fourteen
  436947, // Woman with a Parrot
  438754, // Bouquet of Sunflowers
  438013, // Banks of the Seine
  337044, // The Card Players
  435809, // Still Life with Apples
  436105, // Japanese Footbridge
  436112, // Woman in the Garden
  436839, // Camille Monet
  438007, // Port of Le Havre
  435882, // Mont Sainte-Victoire
  436524, // Pink and White Roses
  210191, // Reclining Figure (sculpture)
  338475, // The Gulf Stream
  11130,  // Young Mother Sewing
  438817, // Cypresses and Two Women
  436947, // Woman Reading
  10497,  // Terracotta column-krater
  547802, // Buddha Head
  45734,  // Washington Crossing
];

/**
 * Fetch artwork details from Met Museum API
 */
export const fetchMetArtwork = async (objectId: number): Promise<MetArtwork | null> => {
  try {
    const response = await fetch(`${MET_API_BASE}/objects/${objectId}`);
    if (!response.ok) return null;

    const data = await response.json();

    // Only return if it has a valid image
    if (!data.primaryImageSmall && !data.primaryImage) return null;

    return {
      objectID: data.objectID,
      title: data.title || 'Untitled',
      artistDisplayName: data.artistDisplayName || 'Unknown Artist',
      objectDate: data.objectDate || '',
      medium: data.medium || '',
      department: data.department || '',
      primaryImage: data.primaryImage || '',
      primaryImageSmall: data.primaryImageSmall || data.primaryImage || '',
    };
  } catch (error) {
    console.error(`Failed to fetch artwork ${objectId}:`, error);
    return null;
  }
};

/**
 * Fetch multiple artworks in parallel with retry logic
 */
export const fetchMultipleArtworks = async (objectIds: number[]): Promise<MetArtwork[]> => {
  const promises = objectIds.map(async (id) => {
    // Add small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    return fetchMetArtwork(id);
  });

  const results = await Promise.all(promises);
  const validArtworks = results.filter((artwork): artwork is MetArtwork => artwork !== null);

  console.log(`Fetched ${validArtworks.length} of ${objectIds.length} artworks`);
  return validArtworks;
};

/**
 * Get a random selection of artworks
 */
export const getRandomArtworks = async (count: number = 50): Promise<MetArtwork[]> => {
  // Shuffle and take random selection
  const shuffled = [...CURATED_MET_OBJECTS].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, CURATED_MET_OBJECTS.length));

  return fetchMultipleArtworks(selected);
};
