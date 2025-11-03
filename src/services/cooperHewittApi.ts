/**
 * Cooper Hewitt Smithsonian Design Museum API
 * Modern design, graphic design, posters, product design
 * https://collection.cooperhewitt.org/api/
 */

export interface DesignObjectData {
  id: string;
  title: string;
  title_raw?: string;
  accession_number?: string;
  url?: string;

  // Dates and periods
  date?: string;
  year_start?: number;
  year_end?: number;
  year_acquired?: string;
  decade?: string;
  period_id?: string;

  // Physical details
  medium?: string;
  dimensions?: string;
  dimensions_raw?: any;

  // Descriptions and context
  description?: string;
  justification?: string;
  gallery_text?: string;
  label_text?: string;

  // Provenance and attribution
  provenance?: string;
  creditline?: string;
  markings?: string;
  signed?: string;
  inscribed?: string;

  // Classification
  type?: string;
  type_id?: string;
  department_id?: string;
  media_id?: string;

  // Display
  on_display?: string;

  // People involved (designers, printers, etc.)
  participants?: Array<{
    person_id?: string;
    person_name?: string;
    person_date?: string;
    person_url?: string;
    role_id?: string;
    role_name?: string;
    role_display_name?: string;
    role_url?: string;
  }>;

  // Images
  images?: Array<{
    b?: { url: string; width: number; height: number; is_primary: string; image_id: string };
    z?: { url: string; width: number; height: number; is_primary: string; image_id: string };
    n?: { url: string; width: number; height: number; is_primary: string; image_id: string };
    d?: { url: string; width: number; height: number; is_primary: string; image_id: string };
    sq?: { url: string; width: number; height: number; is_primary: string; image_id: string };
  }>;

  // Copyright
  has_no_known_copyright?: string | null;
  is_loan_object?: number;
}

interface CooperHewittResponse {
  stat: string;
  object?: DesignObjectData;
  objects?: DesignObjectData[];
  total?: number;
  page?: number;
  per_page?: number;
  pages?: number;
}

const BASE_URL = 'https://api.collection.cooperhewitt.org/rest/';
const API_KEY = import.meta.env.VITE_COOPER_HEWITT_API_KEY || '';

// Design-focused department IDs at Cooper Hewitt
// These focus on graphic design, posters, and modern design
const DESIGN_DEPARTMENT_IDS = [
  '35347493', // Product Design and Decorative Arts
  '35347497', // Drawings, Prints, and Graphic Design
];

// Search terms focused on graphic design and posters
const DESIGN_SEARCH_TERMS = [
  'poster',
  'graphic design',
  'typography',
  'bauhaus',
  'swiss design',
  'modernist',
  'constructivist',
  'art deco',
  'mid century',
  'exhibition poster',
];

/**
 * Get image URL from Cooper Hewitt object
 */
export const getDesignImageUrl = (imageData: DesignObjectData): string | null => {
  if (!imageData.images || imageData.images.length === 0) return null;

  const image = imageData.images[0];
  // Use largest available size: b (large), z (medium), n (small)
  return image.b?.url || image.z?.url || image.n?.url || null;
};

/**
 * Fetch a single random object from Cooper Hewitt
 */
const fetchRandomObject = async (): Promise<DesignObjectData | null> => {
  if (!API_KEY) {
    console.warn('⚠️ Cooper Hewitt API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${BASE_URL}?method=cooperhewitt.objects.getRandom&access_token=${API_KEY}&has_images=1`
    );

    if (!response.ok) return null;

    const data: CooperHewittResponse = await response.json();

    if (data.stat === 'ok' && data.object) {
      return data.object;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch random object:', error);
    return null;
  }
};

/**
 * Search Cooper Hewitt collection for design objects
 */
const searchDesignObjects = async (
  searchTerm: string,
  page: number = 1,
  perPage: number = 100
): Promise<DesignObjectData[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Cooper Hewitt API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `${BASE_URL}?method=cooperhewitt.search.objects&access_token=${API_KEY}&query=${encodeURIComponent(
        searchTerm
      )}&has_images=1&page=${page}&per_page=${perPage}`
    );

    if (!response.ok) return [];

    const data: CooperHewittResponse = await response.json();

    if (data.stat === 'ok' && data.objects && data.objects.length > 0) {
      return data.objects.filter((obj) => obj.images && obj.images.length > 0);
    }

    return [];
  } catch (error) {
    console.error('Failed to search design objects:', error);
    return [];
  }
};

/**
 * Fetch random design objects from Cooper Hewitt
 * Focuses on graphic design, posters, and modern design
 * Uses random pagination to get different results each time
 */
export const fetchRandomDesignObjects = async (count: number = 32): Promise<DesignObjectData[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Cooper Hewitt API key not found');
    console.log('📝 Add your API key to .env file:');
    console.log('   VITE_COOPER_HEWITT_API_KEY=your_key_here');
    console.log('🔑 Get a free API key at: https://collection.cooperhewitt.org/api/');
    return [];
  }

  try {
    console.log(`🎨 Fetching ${count} design objects from Cooper Hewitt...`);

    const results: DesignObjectData[] = [];
    const searchTermsToUse = [...DESIGN_SEARCH_TERMS].sort(() => Math.random() - 0.5);

    // Try multiple search terms to get diverse results
    for (const term of searchTermsToUse) {
      if (results.length >= count) break;

      // Use random page numbers (1-20) to get different results each time
      // This ensures we get 32 NEW items on each refresh
      const randomPage = Math.floor(Math.random() * 20) + 1;
      const objects = await searchDesignObjects(term, randomPage, 50);

      // Filter for high-quality design objects
      const qualityObjects = objects.filter((obj) => {
        // Prefer objects with designers/creators
        const hasCreator = obj.participants && obj.participants.length > 0;
        // Prefer objects with dates
        const hasDate = obj.date && obj.date.length > 0;
        // Must have images
        const hasImages = obj.images && obj.images.length > 0;

        return hasImages && (hasCreator || hasDate);
      });

      results.push(...qualityObjects);

      // Add a small delay to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Shuffle and limit to requested count
    const shuffled = results.sort(() => Math.random() - 0.5);
    const finalResults = shuffled.slice(0, count);

    console.log(`✅ Successfully loaded ${finalResults.length} design objects from Cooper Hewitt`);

    return finalResults;
  } catch (error) {
    console.error('❌ Cooper Hewitt API failed:', error);
    return [];
  }
};

/**
 * Search Cooper Hewitt collection by tag/keyword
 * Returns up to 'count' objects matching the search term
 * Used for tag-based filtering
 * Tries exact match first, then broader related terms if needed
 */
export const searchDesignObjectsByTag = async (
  tag: string,
  count: number = 32
): Promise<DesignObjectData[]> => {
  if (!API_KEY) {
    console.warn('⚠️ Cooper Hewitt API key not configured');
    return [];
  }

  try {
    console.log(`🔍 Searching Cooper Hewitt for tag: "${tag}" (need ${count} results)`);

    let results: DesignObjectData[] = [];

    // Try exact tag first
    const maxPages = 5;
    for (let page = 1; page <= maxPages && results.length < count; page++) {
      const objects = await searchDesignObjects(tag, page, 100);

      // Filter for high-quality objects with images
      const qualityObjects = objects.filter((obj) => {
        const hasImages = obj.images && obj.images.length > 0;
        const hasCreator = obj.participants && obj.participants.length > 0;
        return hasImages && (hasCreator || obj.date);
      });

      results.push(...qualityObjects);

      // Small delay between pages
      if (page < maxPages && results.length < count) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // If we didn't get enough results, try a broader search with related terms
    if (results.length < count / 2) {
      console.log(`⚠️ Only found ${results.length} results, trying broader search...`);

      // Map common tag patterns to broader search terms
      const broaderTerms: Record<string, string[]> = {
        'lamp': ['lighting', 'light', 'illumination'],
        'telephone': ['communication', 'phone', 'device'],
        'chair': ['seating', 'furniture', 'seat'],
        'table': ['furniture', 'desk'],
        'poster': ['graphic design', 'print', 'typography'],
        'vase': ['vessel', 'ceramic', 'pottery'],
      };

      const relatedTerms = broaderTerms[tag.toLowerCase()] || [];

      for (const term of relatedTerms) {
        if (results.length >= count) break;

        const additionalObjects = await searchDesignObjects(term, 1, 50);
        const qualityObjects = additionalObjects.filter((obj) => {
          const hasImages = obj.images && obj.images.length > 0;
          return hasImages;
        });

        results.push(...qualityObjects);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const finalResults = results.slice(0, count);
    console.log(`✅ Found ${finalResults.length} design objects for tag "${tag}"`);

    return finalResults;
  } catch (error) {
    console.error('❌ Tag search failed:', error);
    return [];
  }
};

/**
 * Curated modern design and graphic design collection
 * High-quality fallback when API key is not available
 */
export const curatedDesignCollection = [
  {
    id: 'design-1',
    title: 'Bauhaus Exhibition Poster',
    description: 'Modernist poster design from the Bauhaus school',
    medium: 'Lithograph on paper',
    date: '1923',
    designer: 'László Moholy-Nagy',
    imageUrl: 'https://images.metmuseum.org/CRDImages/md/original/DT5337.jpg',
  },
  {
    id: 'design-2',
    title: 'Swiss Style Typography Poster',
    description: 'International Typographic Style poster',
    medium: 'Offset lithograph',
    date: '1958',
    designer: 'Josef Müller-Brockmann',
    imageUrl: 'https://images.metmuseum.org/CRDImages/md/original/DT5338.jpg',
  },
];
