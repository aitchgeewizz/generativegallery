/**
 * Metropolitan Museum of Art API - Modern Design & Graphic Design Collection
 * Focuses on Department 6 (Modern and Contemporary Art) and design objects
 * https://metmuseum.github.io/
 */

export interface MetDesignData {
  objectID: number;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  primaryImage: string;
  primaryImageSmall: string;
  department: string;
  objectName: string;
  medium: string;
  dimensions: string;
  creditLine: string;
  classification: string;
  isPublicDomain: boolean;
}

const BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Met Museum Department IDs
// 6 = Modern and Contemporary Art (includes graphic design, posters)
// 9 = Drawings and Prints (includes design drawings, posters)
const DESIGN_DEPARTMENTS = [6, 9];

/**
 * Curated list of Met Museum design object IDs
 * Pre-selected for modern design, graphic design, and posters
 */
const CURATED_DESIGN_IDS = [
  488315, // Poster: Munich Olympics
  488329, // Bauhaus poster
  488342, // Swiss design poster
  488355, // Modernist poster
  482828, // Constructivist poster
  482835, // Art Deco poster
  482845, // Typography poster
  483102, // Modern furniture design
  483115, // Product design
  483128, // Industrial design
  // Will expand this list with more IDs
];

/**
 * Fetch a single design object from Met Museum
 */
const fetchDesignObject = async (objectID: number): Promise<MetDesignData | null> => {
  try {
    const response = await fetch(`${BASE_URL}/objects/${objectID}`);
    if (!response.ok) return null;

    const data = await response.json();

    // Filter for public domain items with images
    if (!data.isPublicDomain || !data.primaryImage) return null;

    // Filter for design-related objects
    const isDesign =
      data.department?.toLowerCase().includes('modern') ||
      data.department?.toLowerCase().includes('contemporary') ||
      data.objectName?.toLowerCase().includes('poster') ||
      data.objectName?.toLowerCase().includes('design') ||
      data.classification?.toLowerCase().includes('graphic') ||
      data.classification?.toLowerCase().includes('poster');

    if (!isDesign) return null;

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Search for design objects in Met Museum
 * Focuses on posters, graphic design, and modern design
 */
export const searchMetDesignObjects = async (): Promise<number[]> => {
  try {
    // Search for design-related terms
    const searchTerms = ['poster', 'graphic design', 'modernist', 'bauhaus', 'swiss design'];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const response = await fetch(
      `${BASE_URL}/search?q=${randomTerm}&hasImages=true&departmentId=${DESIGN_DEPARTMENTS[0]}`
    );

    if (!response.ok) {
      // Fallback to curated list
      return CURATED_DESIGN_IDS;
    }

    const data = await response.json();
    return data.objectIDs || CURATED_DESIGN_IDS;
  } catch (error) {
    console.warn('Met design search failed, using curated list');
    return CURATED_DESIGN_IDS;
  }
};

/**
 * Fetch random design objects from Met Museum
 * Curated for modern design, graphic design, and posters
 */
export const fetchRandomMetDesign = async (count: number = 32): Promise<MetDesignData[]> => {
  try {
    console.log(`🎨 Fetching ${count} design objects from Met Museum...`);

    // Get object IDs
    const objectIDs = await searchMetDesignObjects();

    // Shuffle and select random IDs
    const shuffled = objectIDs.sort(() => Math.random() - 0.5);
    const selectedIDs = shuffled.slice(0, count * 2); // Fetch 2x to account for filtering

    // Fetch objects in parallel (batches of 10)
    const batchSize = 10;
    const results: MetDesignData[] = [];

    for (let i = 0; i < selectedIDs.length && results.length < count; i += batchSize) {
      const batch = selectedIDs.slice(i, i + batchSize);
      const promises = batch.map(id => fetchDesignObject(id));
      const batchResults = await Promise.all(promises);

      const validResults = batchResults.filter((item): item is MetDesignData => item !== null);
      results.push(...validResults);

      if (results.length >= count) break;
    }

    console.log(`✅ Successfully loaded ${results.length} design objects from Met Museum`);

    return results.slice(0, count);
  } catch (error) {
    console.error('❌ Met Design API failed:', error);
    return [];
  }
};
