import { CollectionDefinition } from './types';
import { artInstituteCollection } from './artInstitute';
import { cooperHewittCollection } from './cooperHewitt';
import { harvardCollection } from './harvard';
import { harvardDesignCollection } from './harvardDesign';
import { vamCollection } from './vam';

/**
 * Registry of active source archives.
 *
 * Per SPEC.md, Slower. Stranger. blends works from all sources into one
 * unified feed — there is no collection-picker as primary nav. These
 * entries describe the underlying museum APIs, used by the App's mixed
 * fetch and by the tag-pivot search.
 *
 * Album Covers was cut for v1 — its source wasn't producing the curated
 * rarity the thesis demands (removed July 2026; see git history if it is
 * ever worth revisiting).
 *
 * To add a new archive, create a file in src/collections/ that exports a
 * CollectionDefinition, then import and add it here.
 */
export const collections: CollectionDefinition[] = [
  artInstituteCollection,
  cooperHewittCollection,
  harvardCollection,
  harvardDesignCollection,
  vamCollection,
];

export const getCollection = (id: string): CollectionDefinition | undefined =>
  collections.find(c => c.id === id);

// Kept for compatibility with code paths (e.g. filter scope) that still
// need a per-collection identifier. The default user experience is mixed.
export const defaultCollectionId = collections[0].id;
