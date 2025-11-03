export type ShapeType = 'box' | 'sphere' | 'torus' | 'cone' | 'cylinder' | 'octahedron';

export type CollectionType = 'art-institute' | 'met-design' | 'harvard';

export type ViewMode = 'collection' | 'tag-filter';

export interface ActiveFilter {
  mode: ViewMode;
  tagLabel?: string;
  previousCollection?: CollectionType;
  scope?: 'current' | 'all'; // Filter scope: current collection only or all collections
  resultCount?: number; // Number of items found
  canExpandScope?: boolean; // Whether user can expand to all collections
}

export interface Collection {
  id: CollectionType;
  name: string;
  description: string;
  icon: string; // emoji
}

export interface PortfolioItem {
  id: number | string; // Can be number or composite string for looped items
  x: number;
  y: number;
  shape: ShapeType;
  color: string;
  title: string;
  description?: string;
  imageUrl?: string; // Optional image or GIF URL
  fallbackUrl?: string; // Fallback image if primary fails
  pixelated?: boolean; // Use pixelated rendering for retro look
  collectionSource?: string; // Name of the collection (e.g., "Art Institute of Chicago", "Cooper Hewitt")
  url?: string; // Link to original object page

  // Rich artwork metadata (Art Institute)
  shortDescription?: string;
  styleTitles?: string[];
  classificationTitles?: string[];
  subjectTitles?: string[];
  themeTitles?: string[];

  // Common metadata (both collections)
  medium?: string;
  dimensions?: string;
  creditLine?: string;

  // Design-specific metadata (Cooper Hewitt)
  provenance?: string;
  markings?: string;
  signed?: string;
  inscribed?: string;
  galleryText?: string;
  labelText?: string;
  justification?: string;
  objectType?: string;
  accessionNumber?: string;
  yearAcquired?: string;
  onDisplay?: string;
  participants?: Array<{
    name: string;
    role: string;
    date?: string;
    url?: string;
  }>;
}

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CanvasOffset {
  x: number;
  y: number;
}
