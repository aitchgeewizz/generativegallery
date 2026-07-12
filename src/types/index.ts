export type ShapeType = 'box' | 'sphere' | 'torus' | 'cone' | 'cylinder' | 'octahedron';

export type ViewMode = 'collection' | 'tag-filter';

export interface ActiveFilter {
  mode: ViewMode;
  tagLabel?: string;
  previousCollection?: string;
  scope?: 'current' | 'all';
  resultCount?: number;
  canExpandScope?: boolean;
}

export interface PortfolioItem {
  id: number | string;
  x: number;
  y: number;
  shape: ShapeType;
  color: string;
  title: string;
  description?: string;
  imageUrl?: string;
  /** Smaller variant for the 200px wall tile; imageUrl serves the detail stage. */
  thumbnailUrl?: string;
  fallbackUrl?: string;
  pixelated?: boolean;
  collectionSource?: string;
  url?: string;

  // Rich artwork metadata (Art Institute)
  shortDescription?: string;
  styleTitles?: string[];
  classificationTitles?: string[];
  subjectTitles?: string[];
  themeTitles?: string[];

  // Common metadata
  medium?: string;
  dimensions?: string;
  creditLine?: string;

  // Culture/department (Harvard, Cleveland)
  culture?: string;
  department?: string;

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

  // Copyright / license
  copyrightStatus?: 'public_domain' | 'no_known_copyright' | 'unknown';
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
