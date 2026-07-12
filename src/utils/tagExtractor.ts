import { PortfolioItem } from '../types';

export interface Tag {
  label: string;
  category: 'maker' | 'style' | 'culture' | 'period';
}

/**
 * Tag extraction per SPEC.md.
 *
 * The thesis explicitly rules out generic subject/medium tags as
 * recommendation-engine furniture ("more like this"). Only the kinds of
 * threads a curious person would follow in a real catalogue are kept:
 *
 *   - by maker     (the named creator)
 *   - by style     (Impressionism, Bauhaus, Modernism — art-history threads)
 *   - by culture   (Japanese, Indigenous — context, not similarity)
 *   - by period    (19th century, c. 1850s — situating in time)
 *
 * Generic categories that are deliberately NOT exposed as tags:
 *
 *   - medium       (Oil Painting, Bronze) — too generic, "more of this kind of thing"
 *   - subjectTitles (still life, fish, tablecloth) — pure recommendation-engine vibe
 *   - themeTitles   (water, nature) — same problem
 *   - generic attributes (Hand-drawn, Original) — meaningless
 *
 * All tags share a single neutral colour treatment. No rainbow categories.
 */
const MAX_TAGS = 4;

/** Strip parenthetical / nationality noise from an artist name. */
const cleanMakerName = (raw: string): string =>
  raw
    .replace(/\([^)]*\)/g, '')
    .replace(/\s*,?\s*\b(?:19th|18th|17th|20th|21st|nineteenth|eighteenth|seventeenth|twentieth|twenty-first)\s+century\b/gi, '')
    .replace(/\s*,\s*(?:b\.|d\.|c\.)?\s*\d{4}.*$/i, '') // strip dates
    .replace(/\s*\d{4}\s*[-–]\s*\d{4}.*$/i, '')
    .replace(/^(?:by\s+|attributed to\s+|after\s+)/i, '')
    .trim();

/** Period strings like "19th century" / "nineteenth century" reduce to a canonical key. */
const periodKey = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/nineteenth/g, '19th')
    .replace(/eighteenth/g, '18th')
    .replace(/seventeenth/g, '17th')
    .replace(/twentieth/g, '20th')
    .replace(/twenty-first/g, '21st')
    .replace(/\s+/g, ' ')
    .trim();

export const extractTags = (item: PortfolioItem): Tag[] => {
  const tags: Tag[] = [];
  const seenKeys = new Set<string>();

  const add = (label: string, category: Tag['category']) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = `${category}:${trimmed.toLowerCase()}`;
    if (seenKeys.has(key)) return;
    // Also dedupe periods that say the same thing differently.
    if (category === 'period') {
      const pk = `period:${periodKey(trimmed)}`;
      if (seenKeys.has(pk)) return;
      seenKeys.add(pk);
    }
    seenKeys.add(key);
    tags.push({ label: trimmed, category });
  };

  // 1. MAKER — the most useful "follow a thread" affordance.
  const maker = extractArtistName(item);
  if (maker) add(maker, 'maker');

  // 2. STYLE — Impressionism, Bauhaus, Modernism (art-history threads).
  if (item.styleTitles) {
    for (const s of item.styleTitles.slice(0, 2)) add(s, 'style');
  }

  // 3. CULTURE — Japanese, European, etc. when it adds context.
  if (item.culture) add(item.culture, 'culture');

  // 4. PERIOD — 19th century, decade, etc., normalised.
  // Many items don't carry an explicit period but have it embedded in
  // styleTitles (e.g. "19th century") — those already land in step 2.
  // Harvard adapters sometimes stash period in classificationTitles.

  return tags.slice(0, MAX_TAGS);
};

/**
 * Extract the primary maker/creator name from a portfolio item.
 * Checks participants first (creative roles), falls back to description.
 */
export const extractArtistName = (item: PortfolioItem): string | null => {
  // Words that signal "no real maker named" — checked as substrings so
  // e.g. "Unidentified Artist", "Anonymous Designer", "Maker unknown"
  // all get filtered out as un-clickable tags.
  const genericTokens = [
    'unknown', 'unidentified', 'anonymous', 'unattributed',
    'various', 'not known', 'unsigned', 'unattributed',
  ];

  const isGeneric = (name: string) => {
    const lower = name.toLowerCase().trim();
    return genericTokens.some(t => lower.includes(t));
  };

  // Participants with a creative role
  if (item.participants && item.participants.length > 0) {
    const donorRoles = ['donated', 'donor', 'previously owned', 'owned by'];
    const creator = item.participants.find(p => {
      const role = p.role?.toLowerCase() || '';
      return !donorRoles.some(d => role.includes(d));
    });
    if (creator) {
      const cleaned = cleanMakerName(creator.name);
      if (cleaned && !isGeneric(cleaned)) return cleaned;
    }
  }

  // Description: "Name\nNationality, dates" or "Name (Nationality, dates)"
  if (item.description) {
    const firstLine = item.description.split('\n')[0].trim();
    const cleaned = cleanMakerName(firstLine);
    const match = cleaned.match(/^([^,]+)/);
    if (match && match[1].trim().length > 0 && match[1].trim().length < 60) {
      const name = match[1].trim();
      if (!isGeneric(name)) return name;
    }
  }

  return null;
};

/**
 * Search items by tag (in-memory). Kept for any caller that still uses it;
 * the canonical "follow a thread" path is the API search in App.tsx.
 */
export const searchByTag = (items: PortfolioItem[], tagLabel: string): PortfolioItem[] => {
  return items.filter(item => {
    const tags = extractTags(item);
    return tags.some(tag => tag.label.toLowerCase() === tagLabel.toLowerCase());
  });
};

/** Unique tags across a list, with counts. */
export const getAllTags = (items: PortfolioItem[]): Map<string, number> => {
  const tagCounts = new Map<string, number>();
  items.forEach(item => {
    const tags = extractTags(item);
    tags.forEach(tag => {
      tagCounts.set(tag.label, (tagCounts.get(tag.label) || 0) + 1);
    });
  });
  return tagCounts;
};
