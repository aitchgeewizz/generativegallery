/**
 * Enrichment API — fetches deep context about artists and artworks
 * Sources: Wikipedia REST API, Wikidata, museum collection APIs
 * All free, no API keys needed (except museum APIs already configured)
 */

import { getImageUrl } from './artInstituteApi';

// ── Types ──────────────────────────────────────────────────

export interface ArtistInfo {
  summary: string;
  born?: string;
  died?: string;
  nationality?: string;
  movements?: string[];
  notableWorks?: string[];
  influences?: string[];
  influencedBy?: string[];
  wikiUrl?: string;
  thumbnailUrl?: string;
}

export interface ArtworkContext {
  summary?: string;
  wikiUrl?: string;
}

export interface RelatedWork {
  title: string;
  artist: string;
  imageUrl: string;
  date?: string;
  url?: string;
}

// ── Cache ──────────────────────────────────────────────────

const artistCache = new Map<string, ArtistInfo | null>();
const artworkCache = new Map<string, ArtworkContext | null>();
const relatedWorksCache = new Map<string, RelatedWork[]>();

// ── Wikipedia REST API ─────────────────────────────────────

/**
 * Fetch a Wikipedia page summary via the REST API
 * Returns extract text, thumbnail, and page URL
 */
const fetchWikipediaSummary = async (query: string): Promise<{
  extract?: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl?: string;
} | null> => {
  try {
    // Use the REST API summary endpoint — cleaner than the action API
    const encoded = encodeURIComponent(query.replace(/ /g, '_'));
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      // Try a search fallback if direct lookup fails
      return await searchWikipedia(query);
    }

    const data = await response.json();

    // Skip disambiguation pages
    if (data.type === 'disambiguation') {
      return await searchWikipedia(query);
    }

    return {
      extract: data.extract,
      description: data.description,
      thumbnailUrl: data.thumbnail?.source,
      pageUrl: data.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  }
};

/**
 * Search Wikipedia when direct title lookup fails
 */
const searchWikipedia = async (query: string): Promise<{
  extract?: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl?: string;
} | null> => {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const firstResult = data.query?.search?.[0];
    if (!firstResult) return null;

    // Fetch the summary of the found page
    return await fetchWikipediaSummary(firstResult.title);
  } catch {
    return null;
  }
};

// ── Wikidata API ───────────────────────────────────────────

/**
 * Fetch structured data about a person from Wikidata
 * Returns birth/death, nationality, movements, influences, notable works
 */
const fetchWikidataInfo = async (name: string): Promise<{
  born?: string;
  died?: string;
  nationality?: string;
  movements?: string[];
  notableWorks?: string[];
  influences?: string[];
  influencedBy?: string[];
} | null> => {
  try {
    // Step 1: Search for the entity
    const searchResponse = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&origin=*&type=item&limit=3`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json();
    const results = searchData.search || [];

    // Find the best match — prefer artists/designers/painters
    const entity = results[0];
    if (!entity) return null;

    // Step 2: Fetch the entity data
    const entityResponse = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entity.id}&languages=en&format=json&origin=*&props=claims|labels`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!entityResponse.ok) return null;

    const entityData = await entityResponse.json();
    const claims = entityData.entities?.[entity.id]?.claims;
    if (!claims) return null;

    // Extract structured data from claims
    const result: {
      born?: string;
      died?: string;
      nationality?: string;
      movements?: string[];
      notableWorks?: string[];
      influences?: string[];
      influencedBy?: string[];
    } = {};

    // Birth date (P569)
    const birthClaim = claims.P569?.[0]?.mainsnak?.datavalue?.value;
    if (birthClaim?.time) {
      result.born = formatWikidataDate(birthClaim.time);
    }

    // Death date (P570)
    const deathClaim = claims.P570?.[0]?.mainsnak?.datavalue?.value;
    if (deathClaim?.time) {
      result.died = formatWikidataDate(deathClaim.time);
    }

    // Nationality (P27 - country of citizenship)
    const nationalityIds = claims.P27?.map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) || [];
    if (nationalityIds.length > 0) {
      const labels = await fetchWikidataLabels(nationalityIds.slice(0, 2));
      if (labels.length > 0) result.nationality = labels.join(', ');
    }

    // Art movements (P135)
    const movementIds = claims.P135?.map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) || [];
    if (movementIds.length > 0) {
      result.movements = await fetchWikidataLabels(movementIds.slice(0, 5));
    }

    // Notable works (P800)
    const workIds = claims.P800?.map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) || [];
    if (workIds.length > 0) {
      result.notableWorks = await fetchWikidataLabels(workIds.slice(0, 6));
    }

    // Influenced by (P737)
    const influencedByIds = claims.P737?.map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) || [];
    if (influencedByIds.length > 0) {
      result.influencedBy = await fetchWikidataLabels(influencedByIds.slice(0, 5));
    }

    // Influenced (reverse — not directly available, skip for now)

    return result;
  } catch {
    return null;
  }
};

/**
 * Format a Wikidata date string like "+1840-11-14T00:00:00Z" to "1840"
 */
const formatWikidataDate = (timeStr: string): string => {
  const match = timeStr.match(/([+-]?\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const day = parseInt(match[3]);

  if (month === 0 && day === 0) return `${year}`;
  if (day === 0) return `${year}`;
  return `${year}`;
};

/**
 * Fetch English labels for a list of Wikidata entity IDs
 */
const fetchWikidataLabels = async (ids: string[]): Promise<string[]> => {
  if (ids.length === 0) return [];
  try {
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&languages=en&format=json&origin=*&props=labels`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return [];

    const data = await response.json();
    return ids
      .map(id => data.entities?.[id]?.labels?.en?.value)
      .filter(Boolean);
  } catch {
    return [];
  }
};

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch rich artist information from Wikipedia + Wikidata
 * Results are cached by artist name
 */
export const fetchArtistInfo = async (artistName: string): Promise<ArtistInfo | null> => {
  const cacheKey = artistName.toLowerCase().trim();
  if (artistCache.has(cacheKey)) return artistCache.get(cacheKey) || null;

  try {
    // Fetch Wikipedia and Wikidata in parallel
    const [wikiSummary, wikidataInfo] = await Promise.all([
      fetchWikipediaSummary(artistName),
      fetchWikidataInfo(artistName),
    ]);

    if (!wikiSummary?.extract && !wikidataInfo) {
      artistCache.set(cacheKey, null);
      return null;
    }

    // Validate Wikipedia result — check if the extract mentions the artist's name
    // to avoid false positives (e.g. "Teisai Hokuba" returning Emperor Ninmyō)
    let validatedSummary = wikiSummary;
    if (wikiSummary?.extract) {
      const extractLower = wikiSummary.extract.toLowerCase();
      const nameParts = artistName.toLowerCase().split(/\s+/);
      const nameFound = nameParts.some(part => part.length > 2 && extractLower.includes(part));
      if (!nameFound) {
        validatedSummary = null; // Discard unrelated Wikipedia result
      }
    }

    const info: ArtistInfo = {
      summary: validatedSummary?.extract || '',
      thumbnailUrl: validatedSummary?.thumbnailUrl,
      wikiUrl: validatedSummary?.pageUrl,
      born: wikidataInfo?.born,
      died: wikidataInfo?.died,
      nationality: wikidataInfo?.nationality,
      movements: wikidataInfo?.movements,
      notableWorks: wikidataInfo?.notableWorks,
      influences: wikidataInfo?.influences,
      influencedBy: wikidataInfo?.influencedBy,
    };

    artistCache.set(cacheKey, info);
    return info;
  } catch {
    artistCache.set(cacheKey, null);
    return null;
  }
};

/**
 * Fetch Wikipedia context about a specific artwork
 * Many famous artworks have their own Wikipedia articles
 */
export const fetchArtworkContext = async (
  title: string,
  artistName?: string
): Promise<ArtworkContext | null> => {
  const cacheKey = `${title}__${artistName || ''}`.toLowerCase();
  if (artworkCache.has(cacheKey)) return artworkCache.get(cacheKey) || null;

  try {
    // Try artwork-specific formats first (more precise)
    let summary = await fetchWikipediaSummary(`${title} (painting)`);

    if (!summary?.extract && artistName) {
      summary = await fetchWikipediaSummary(`${title} (${artistName})`);
    }

    // Fall back to direct title
    if (!summary?.extract) {
      summary = await fetchWikipediaSummary(title);
    }

    if (!summary?.extract) {
      artworkCache.set(cacheKey, null);
      return null;
    }

    // Verify this is actually about visual art, not music/film/etc.
    const extract = summary.extract.toLowerCase();

    // Reject common false positives
    const isFalsePositive = extract.includes('album') || extract.includes('single by') ||
                            extract.includes('song by') || extract.includes('television') ||
                            extract.includes('tv series') || extract.includes('video game') ||
                            extract.includes('novel by') || extract.includes('film directed');
    if (isFalsePositive) {
      artworkCache.set(cacheKey, null);
      return null;
    }

    // Must contain visual art indicators
    const isAboutArt = extract.includes('painting') || extract.includes('artwork') ||
                       extract.includes('sculpture') || extract.includes('museum') ||
                       extract.includes('gallery') || extract.includes('canvas') ||
                       extract.includes('oil on') || extract.includes('pastel') ||
                       extract.includes('designed') || extract.includes('poster') ||
                       extract.includes('engraving') || extract.includes('fresco') ||
                       extract.includes('watercolor') || extract.includes('lithograph') ||
                       (artistName && extract.includes(artistName.toLowerCase().split(' ')[0]));

    if (!isAboutArt) {
      artworkCache.set(cacheKey, null);
      return null;
    }

    const context: ArtworkContext = {
      summary: summary.extract,
      wikiUrl: summary.pageUrl,
    };

    artworkCache.set(cacheKey, context);
    return context;
  } catch {
    artworkCache.set(cacheKey, null);
    return null;
  }
};

/**
 * Fetch related works by the same artist from museum APIs
 * Uses the appropriate API based on the collection source
 */
export const fetchRelatedWorks = async (
  artistName: string,
  collectionSource: string | undefined,
  currentItemId: string | number
): Promise<RelatedWork[]> => {
  const cacheKey = `${artistName}__${collectionSource || 'any'}`.toLowerCase();
  if (relatedWorksCache.has(cacheKey)) {
    return relatedWorksCache.get(cacheKey)!.filter(w => !w.url?.includes(String(currentItemId)));
  }

  try {
    let works: RelatedWork[] = [];

    // Try Art Institute first (no API key needed, most reliable)
    works = await fetchRelatedFromArtInstitute(artistName);

    // If no results and we have Harvard key, try Harvard
    if (works.length === 0 && import.meta.env.VITE_HARVARD_KEY) {
      works = await fetchRelatedFromHarvard(artistName);
    }

    relatedWorksCache.set(cacheKey, works);
    return works.filter(w => !w.url?.includes(String(currentItemId)));
  } catch {
    relatedWorksCache.set(cacheKey, []);
    return [];
  }
};

/**
 * Search Art Institute for other works by the same artist
 */
const fetchRelatedFromArtInstitute = async (artistName: string): Promise<RelatedWork[]> => {
  try {
    const response = await fetch(
      `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(artistName)}&limit=12&fields=id,title,artist_display,date_display,image_id,is_public_domain`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return [];

    const data = await response.json();
    const artworks = data.data || [];

    return artworks
      .filter((a: any) => a.image_id && a.is_public_domain && a.title)
      .slice(0, 8)
      .map((a: any) => ({
        title: a.title,
        artist: a.artist_display || artistName,
        imageUrl: getImageUrl(a.image_id, 400),
        date: a.date_display,
        url: `https://www.artic.edu/artworks/${a.id}`,
      }));
  } catch {
    return [];
  }
};

/**
 * Search Harvard for other works by the same artist
 */
const fetchRelatedFromHarvard = async (artistName: string): Promise<RelatedWork[]> => {
  const apiKey = import.meta.env.VITE_HARVARD_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch(
      `https://api.harvardartmuseums.org/object?apikey=${apiKey}&q=${encodeURIComponent(artistName)}&size=12&hasimage=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return [];

    const data = await response.json();
    const records = data.records || [];

    return records
      .filter((r: any) => r.primaryimageurl && r.title)
      .slice(0, 8)
      .map((r: any) => ({
        title: r.title,
        artist: r.people?.[0]?.name || artistName,
        imageUrl: r.primaryimageurl,
        date: r.dated,
        url: r.url,
      }));
  } catch {
    return [];
  }
};
