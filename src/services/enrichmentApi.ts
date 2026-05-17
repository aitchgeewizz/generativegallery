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

    // Validate Wikipedia result — must mention the artist's name
    // strongly enough to be plausibly about them. The old check
    // accepted any single name part (so "Charles Wright" would accept
    // an article about any unrelated Charles). We now require ALL
    // meaningful name parts to appear in the extract, AND the article
    // must look like it's about a person (not a song, place, etc).
    let validatedSummary = wikiSummary;
    if (wikiSummary?.extract) {
      const extractLower = wikiSummary.extract.toLowerCase();
      const meaningfulParts = artistName
        .toLowerCase()
        .split(/\s+/)
        .filter((part) => part.length >= 3);

      // ALL parts present, not just any.
      const fullNamePresent =
        meaningfulParts.length > 0 &&
        meaningfulParts.every((part) => extractLower.includes(part));

      // Looks like an article about a person, not a song/place/object.
      const looksLikePerson =
        extractLower.includes('born') ||
        extractLower.includes('artist') ||
        extractLower.includes('painter') ||
        extractLower.includes('designer') ||
        extractLower.includes('sculptor') ||
        extractLower.includes('photographer') ||
        extractLower.includes('architect') ||
        extractLower.includes('illustrator') ||
        extractLower.includes('printmaker') ||
        extractLower.includes('was a ') ||
        extractLower.includes('is a ') ||
        extractLower.includes('he was') ||
        extractLower.includes('she was');

      const isFalsePositive =
        extractLower.includes('album') ||
        extractLower.includes('single by') ||
        extractLower.includes('song by') ||
        extractLower.includes('tv series') ||
        extractLower.includes('video game') ||
        extractLower.includes('novel by');

      if (!fullNamePresent || !looksLikePerson || isFalsePositive) {
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
 * Generic titles that should never trigger Wikipedia enrichment.
 * Looking up "Poster" or "Untitled" returns whatever is currently the
 * most prominent Wikipedia article with that title (e.g. the Obama
 * Hope poster), which is virtually never the artwork the visitor is
 * looking at. Better to show nothing than to mislead.
 *
 * Match is case-insensitive on the *normalised* title (strip any
 * parenthetical, leading articles, etc).
 */
const GENERIC_TITLE_BLOCKLIST = new Set([
  'untitled', 'unknown', 'no title', 'no.', 'number',
  'poster', 'posters', 'print', 'prints', 'drawing', 'drawings',
  'painting', 'paintings', 'sculpture', 'sculptures',
  'photograph', 'photographs', 'photo', 'photos',
  'vase', 'bowl', 'plate', 'cup', 'jar', 'chair',
  'design', 'designs', 'cover', 'illustration', 'illustrations',
  'sketch', 'sketches', 'fragment', 'fragments', 'study', 'studies',
  'composition', 'figure', 'portrait', 'landscape', 'still life',
  'plate i', 'plate ii', 'plate iii', 'plate 1', 'plate 2', 'plate 3',
  'detail', 'group', 'pair', 'set',
  // Cooper Hewitt's catalogue style uses "Type (Region and others)"
  // patterns where the type alone is generic. We strip the
  // parenthetical below before matching, so "Poster (USA and others)"
  // → "poster" → blocked.
]);

/**
 * Normalise a title for the generic-blocklist check. Strips
 * parentheticals, articles, and surrounding whitespace.
 */
const normaliseTitle = (title: string): string =>
  title
    .replace(/\([^)]*\)/g, '')          // drop parentheticals
    .replace(/^(the|a|an)\s+/i, '')      // drop leading article
    .trim()
    .toLowerCase();

/**
 * Fetch Wikipedia context about a specific artwork.
 *
 * Strict policy: only return a Wikipedia article when there's strong
 * evidence it's about THIS specific work, not just a generic match on
 * the title. The previous loose validation surfaced the Obama "Hope"
 * poster article for any artwork titled "Poster", which was actively
 * misleading. We now:
 *
 *   1. Reject generic titles (Poster / Vase / Untitled / …) outright,
 *      since they can never match a specific Wikipedia article.
 *   2. Require either the artist's name OR an exact title-token match
 *      to appear in the Wikipedia extract before accepting the result.
 *   3. Drop the over-generous "isAboutArt" heuristic — having the
 *      word "designed" or "poster" in the extract proved nothing.
 */
export const fetchArtworkContext = async (
  title: string,
  artistName?: string
): Promise<ArtworkContext | null> => {
  const cacheKey = `${title}__${artistName || ''}`.toLowerCase();
  if (artworkCache.has(cacheKey)) return artworkCache.get(cacheKey) || null;

  // (1) Bail early on generic titles. There's no Wikipedia article for
  // "Poster (USA and others)" or "Vase" specifically; the search would
  // just return the most popular page sharing the noun.
  const normalised = normaliseTitle(title);
  if (GENERIC_TITLE_BLOCKLIST.has(normalised) || normalised.length < 4) {
    artworkCache.set(cacheKey, null);
    return null;
  }

  try {
    // Try artwork-specific formats first (more precise direct lookups).
    let summary = await fetchWikipediaSummary(`${title} (painting)`);

    if (!summary?.extract && artistName) {
      summary = await fetchWikipediaSummary(`${title} (${artistName})`);
    }

    // Fall back to direct title — but only if title has enough
    // specificity to plausibly identify a real work.
    if (!summary?.extract) {
      summary = await fetchWikipediaSummary(title);
    }

    if (!summary?.extract) {
      artworkCache.set(cacheKey, null);
      return null;
    }

    const extract = summary.extract.toLowerCase();

    // (2) Reject common cross-domain false positives — songs, albums,
    // films, TV shows, novels, video games can share titles with art.
    const isFalsePositive =
      extract.includes('album') ||
      extract.includes('single by') ||
      extract.includes('song by') ||
      extract.includes('television') ||
      extract.includes('tv series') ||
      extract.includes('video game') ||
      extract.includes('novel by') ||
      extract.includes('film directed');
    if (isFalsePositive) {
      artworkCache.set(cacheKey, null);
      return null;
    }

    // (3) The ONLY reliable signal that a Wikipedia article is about
    // *this artwork* (and not about the artwork's subject — the song
    // "O Tannenbaum", the city "Aspen", the person depicted) is that
    // the article credits the artist. So we require it.
    //
    // If we don't have an artist name, we can't validate, so we
    // refuse rather than guess.
    if (!artistName) {
      artworkCache.set(cacheKey, null);
      return null;
    }

    const artistTokens = artistName
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    const artistMentioned =
      artistTokens.length > 0 &&
      // Require ALL the artist's name tokens to appear, not just one
      // (a common surname would false-match too many articles).
      artistTokens.every((t) => extract.includes(t));

    if (!artistMentioned) {
      // Wikipedia article isn't demonstrably about this artist's work.
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
 * Cheap fuzzy match — does `haystack` mention this artist? Substring,
 * case-insensitive, and requires ALL meaningful name tokens (>=3 char)
 * to appear so common surnames don't false-match.
 */
const mentionsArtist = (haystack: string | undefined, artistName: string): boolean => {
  if (!haystack) return false;
  const lower = haystack.toLowerCase();
  const tokens = artistName
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  return tokens.length > 0 && tokens.every((t) => lower.includes(t));
};

/**
 * Search Art Institute for other works by the same artist.
 * The Art Institute's `q=` is full-text — it'll return anything
 * mentioning the artist's name anywhere (titles, descriptions,
 * subjects, themes), so we over-fetch and post-filter to artworks
 * whose own `artist_display` actually credits the artist.
 */
const fetchRelatedFromArtInstitute = async (artistName: string): Promise<RelatedWork[]> => {
  try {
    const response = await fetch(
      `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(artistName)}&limit=40&fields=id,title,artist_display,date_display,image_id,is_public_domain`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return [];

    const data = await response.json();
    const artworks = data.data || [];

    return artworks
      .filter((a: any) =>
        a.image_id &&
        a.is_public_domain &&
        a.title &&
        // Only keep works actually credited to this artist.
        mentionsArtist(a.artist_display, artistName),
      )
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
 * Search Harvard for other works by the same artist. Same broad-search
 * issue — filter to items whose `people` list actually includes them.
 */
const fetchRelatedFromHarvard = async (artistName: string): Promise<RelatedWork[]> => {
  const apiKey = import.meta.env.VITE_HARVARD_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch(
      `https://api.harvardartmuseums.org/object?apikey=${apiKey}&q=${encodeURIComponent(artistName)}&size=40&hasimage=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return [];

    const data = await response.json();
    const records = data.records || [];

    return records
      .filter((r: any) => {
        if (!r.primaryimageurl || !r.title) return false;
        // Require at least one credited person to actually be the named artist.
        const people: Array<{ name?: string }> = r.people || [];
        return people.some((p) => mentionsArtist(p.name, artistName));
      })
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
