import { PortfolioItem } from '../types';

export interface Tag {
  label: string;
  category: 'medium' | 'type' | 'style' | 'subject' | 'culture' | 'attribute';
  color: string; // Tailwind color classes
}

/**
 * Smart tag extraction from portfolio items
 * Normalizes and categorizes tags across all collections
 * Returns max 6 most relevant tags per item
 */
export const extractTags = (item: PortfolioItem): Tag[] => {
  const tags: Tag[] = [];

  // 1. MEDIUM/TECHNIQUE (highest priority - always show if available)
  if (item.medium) {
    const mediumTags = normalizeMedium(item.medium);
    tags.push(...mediumTags.map(label => ({
      label,
      category: 'medium' as const,
      color: 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30',
    })));
  }

  // 2. OBJECT TYPE (Design collection)
  if (item.objectType) {
    tags.push({
      label: item.objectType,
      category: 'type',
      color: 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30',
    });
  }

  // 3. STYLE (Art collections)
  if (item.styleTitles && item.styleTitles.length > 0) {
    // Take first 2 styles
    tags.push(...item.styleTitles.slice(0, 2).map(style => ({
      label: style,
      category: 'style' as const,
      color: 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30',
    })));
  }

  // 4. SUBJECTS/THEMES
  if (item.subjectTitles && item.subjectTitles.length > 0) {
    // Take first 2 subjects
    tags.push(...item.subjectTitles.slice(0, 2).map(subject => ({
      label: subject,
      category: 'subject' as const,
      color: 'bg-green-500/20 text-green-300 hover:bg-green-500/30',
    })));
  }

  // 5. CULTURE/DEPARTMENT (Cleveland Museum)
  if (item.culture) {
    tags.push({
      label: item.culture,
      category: 'culture',
      color: 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30',
    });
  }
  if (item.department && !item.culture) {
    const cultureTags = normalizeDepartment(item.department);
    tags.push(...cultureTags.map(label => ({
      label,
      category: 'culture' as const,
      color: 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30',
    })));
  }

  // 6. SPECIAL ATTRIBUTES (hand-drawn, female artist, etc.)
  const attributes = extractAttributes(item);
  tags.push(...attributes.map(label => ({
    label,
    category: 'attribute' as const,
    color: 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30',
  })));

  // Return max 6 tags, prioritized by category order
  return tags.slice(0, 6);
};

/**
 * Normalize medium/technique into searchable tags
 * Examples: "Lithograph on paper" → ["Lithograph", "Print"]
 */
const normalizeMedium = (medium: string): string[] => {
  const normalized = medium.toLowerCase();
  const tags: string[] = [];

  // Printing techniques
  if (normalized.includes('lithograph')) tags.push('Lithograph');
  if (normalized.includes('screen print') || normalized.includes('silkscreen')) tags.push('Screen Print');
  if (normalized.includes('etching')) tags.push('Etching');
  if (normalized.includes('woodcut') || normalized.includes('wood cut')) tags.push('Woodcut');
  if (normalized.includes('engraving')) tags.push('Engraving');
  if (normalized.includes('offset')) tags.push('Offset Print');

  // Painting
  if (normalized.includes('oil')) tags.push('Oil Painting');
  if (normalized.includes('acrylic')) tags.push('Acrylic');
  if (normalized.includes('watercolor')) tags.push('Watercolor');
  if (normalized.includes('gouache')) tags.push('Gouache');

  // Drawing
  if (normalized.includes('pencil')) tags.push('Pencil');
  if (normalized.includes('charcoal')) tags.push('Charcoal');
  if (normalized.includes('ink')) tags.push('Ink');
  if (normalized.includes('pastel')) tags.push('Pastel');

  // Photography
  if (normalized.includes('photograph')) tags.push('Photography');
  if (normalized.includes('gelatin silver')) tags.push('Silver Gelatin Print');

  // Sculpture & 3D
  if (normalized.includes('bronze')) tags.push('Bronze Sculpture');
  if (normalized.includes('marble')) tags.push('Marble Sculpture');
  if (normalized.includes('ceramic')) tags.push('Ceramic');
  if (normalized.includes('porcelain')) tags.push('Porcelain');

  // Textile
  if (normalized.includes('textile') || normalized.includes('fabric')) tags.push('Textile');
  if (normalized.includes('tapestry')) tags.push('Tapestry');

  // If no specific match, try to extract first meaningful word
  if (tags.length === 0) {
    const firstWord = medium.split(/[,\(]/)[0].trim();
    if (firstWord.length > 3 && firstWord.length < 20) {
      tags.push(firstWord);
    }
  }

  return tags;
};

/**
 * Extract culture/region from department names
 */
const normalizeDepartment = (department: string): string[] => {
  const normalized = department.toLowerCase();
  const tags: string[] = [];

  if (normalized.includes('japanese')) tags.push('Japanese');
  if (normalized.includes('chinese')) tags.push('Chinese');
  if (normalized.includes('korean')) tags.push('Korean');
  if (normalized.includes('european')) tags.push('European');
  if (normalized.includes('american')) tags.push('American');
  if (normalized.includes('african')) tags.push('African');
  if (normalized.includes('islamic')) tags.push('Islamic');
  if (normalized.includes('indian')) tags.push('Indian');
  if (normalized.includes('contemporary')) tags.push('Contemporary');
  if (normalized.includes('modern')) tags.push('Modern');

  return tags;
};

/**
 * Extract special attributes
 */
const extractAttributes = (item: PortfolioItem): string[] => {
  const attributes: string[] = [];

  // Check medium for hand-drawn indicators
  if (item.medium) {
    const medium = item.medium.toLowerCase();
    if (medium.includes('hand') && (medium.includes('drawn') || medium.includes('painted'))) {
      attributes.push('Hand-drawn');
    }
    if (medium.includes('original')) {
      attributes.push('Original');
    }
  }

  // Check for female artists (basic detection from participant names)
  if (item.participants) {
    const hasCreator = item.participants.some(p => {
      const role = p.role?.toLowerCase() || '';
      return role.includes('design') || role.includes('artist') || role.includes('creator');
    });
    // Note: Gender detection would require external data source
    // For now, we'll skip this to avoid assumptions
  }

  // Check description for keywords
  if (item.description) {
    const desc = item.description.toLowerCase();
    if (desc.includes('limited edition')) attributes.push('Limited Edition');
    if (desc.includes('signed')) attributes.push('Signed');
  }

  return attributes;
};

/**
 * Search items by tag
 * Returns items that match the tag across all collections
 */
export const searchByTag = (items: PortfolioItem[], tagLabel: string): PortfolioItem[] => {
  return items.filter(item => {
    const tags = extractTags(item);
    return tags.some(tag => tag.label.toLowerCase() === tagLabel.toLowerCase());
  });
};

/**
 * Get all unique tags from a collection of items
 * Useful for showing popular tags or tag cloud
 */
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
